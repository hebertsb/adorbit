"""Reportes en lenguaje natural (tarea 4): el LLM decide que herramienta(s) MCP llamar
para responder la pregunta del usuario. Reusa `ConsultasMcp` TAL CUAL la usa el
servidor MCP real (app/adapters/mcp/servidor.py) -- valida parametros y audita en
auditoria_mcp (incluidas las bloqueadas) antes de tocar vista_mcp_*. No se abre una
sesion MCP cliente-servidor por HTTP dentro del mismo proceso: ConsultasMcp YA ES la
frontera auditada, llamarla directo cumple la regla "todo acceso de IA a datos pasa
por MCP" sin duplicar transporte.
"""

from __future__ import annotations

import json
from typing import Any
from uuid import UUID, uuid4

from ..domain.errores import ExcepcionDominio
from ..domain.puertos import ClienteLlmPuerto, ReporteGeneradoRepositorio
from ..domain.reporte_generado import ReporteGenerado
from .compartido.idempotencia import con_idempotencia
from .consultas_mcp import ConsultasMcp

# consulta + presentacion + respuesta final (+1 de margen)
_MAX_RONDAS_HERRAMIENTAS = 4
_HERRAMIENTA_PRESENTACION = "definir_presentacion"


def _leer_columnas(argumentos_crudos: str) -> list[str]:
    try:
        datos = json.loads(argumentos_crudos) if argumentos_crudos else {}
    except (ValueError, TypeError):
        return []
    columnas = datos.get("columnas") if isinstance(datos, dict) else None
    if not isinstance(columnas, list):
        return []
    return [c for c in columnas if isinstance(c, str)][:30]


class GenerarReporte:
    def __init__(
        self,
        llm: ClienteLlmPuerto,
        consultas: ConsultasMcp,
        repositorio: ReporteGeneradoRepositorio,
    ) -> None:
        self._llm = llm
        self._consultas = consultas
        self._repositorio = repositorio

    async def ejecutar(
        self, *, pregunta: str, usuario_id: UUID | None, clave_idempotencia: str, conexion: Any
    ) -> ReporteGenerado:
        async def reconstruir_replay(datos_guardados: dict[str, Any]) -> ReporteGenerado:
            reporte = await self._repositorio.buscar(UUID(datos_guardados["id"]))
            if reporte is None:
                raise ExcepcionDominio("error_interno", "No se pudo recuperar un reporte repetido")
            return reporte

        async def ejecutar_generacion() -> tuple[ReporteGenerado, dict[str, Any]]:
            reporte = await self._generar(pregunta, usuario_id)
            await self._repositorio.crear(reporte, conexion)
            return reporte, {"id": str(reporte.id)}

        return await con_idempotencia(
            conexion=conexion,
            clave=clave_idempotencia,
            datos_huella={"pregunta": pregunta, "usuario_id": str(usuario_id) if usuario_id else None},
            reconstruir_replay=reconstruir_replay,
            ejecutar=ejecutar_generacion,
        )

    async def _generar(self, pregunta: str, usuario_id: UUID | None) -> ReporteGenerado:
        mensajes: list[dict[str, Any]] = [
            self._llm.mensaje_sistema(),
            {"role": "user", "content": pregunta},
        ]

        herramientas_usadas: list[dict[str, Any]] = []
        ultimo_resultado_tabular: Any = None
        columnas_elegidas: list[str] = []

        for _ in range(_MAX_RONDAS_HERRAMIENTAS):
            respuesta = await self._llm.completar_con_herramientas(mensajes)

            if not respuesta.llamadas_herramienta:
                return self._construir_reporte(
                    usuario_id,
                    pregunta,
                    respuesta.contenido,
                    herramientas_usadas,
                    ultimo_resultado_tabular,
                    columnas_elegidas,
                )

            mensajes.append(
                {
                    "role": "assistant",
                    "content": respuesta.contenido,
                    "tool_calls": [
                        {
                            "id": llamada.id,
                            "type": "function",
                            "function": {"name": llamada.nombre, "arguments": llamada.argumentos_crudos},
                        }
                        for llamada in respuesta.llamadas_herramienta
                    ],
                }
            )

            for llamada in respuesta.llamadas_herramienta:
                if llamada.nombre == _HERRAMIENTA_PRESENTACION:
                    # Solo presentacion: no toca datos ni MCP; se valida contra el resultado real.
                    columnas_elegidas = _leer_columnas(llamada.argumentos_crudos)
                    disponibles, _ = _tabla_desde_resultado(ultimo_resultado_tabular)
                    validas = [c for c in columnas_elegidas if c in disponibles]
                    mensajes.append(
                        {
                            "role": "tool",
                            "tool_call_id": llamada.id,
                            "content": json.dumps(
                                {"ok": bool(validas), "columnas_aplicadas": validas, "disponibles": disponibles}
                            ),
                        }
                    )
                    continue
                resultado = await self._ejecutar_herramienta(llamada.nombre, llamada.argumentos_crudos, usuario_id)
                herramientas_usadas.append({"herramienta": llamada.nombre, "argumentos": llamada.argumentos_crudos})
                if resultado is not None:
                    ultimo_resultado_tabular = resultado
                mensajes.append(
                    {
                        "role": "tool",
                        "tool_call_id": llamada.id,
                        "content": json.dumps(resultado, default=str),
                    }
                )

        raise ExcepcionDominio("limite_herramientas", "El reporte excedio el limite de llamadas a herramientas")

    async def _ejecutar_herramienta(self, nombre: str, argumentos_crudos: str, usuario_id: UUID | None) -> Any:
        try:
            argumentos = json.loads(argumentos_crudos) if argumentos_crudos else {}
        except (ValueError, TypeError):
            return {"error": "argumentos_invalidos"}

        try:
            if nombre == "consultar_campanas":
                return await self._consultas.consultar_campanas(
                    estado=argumentos.get("estado"),
                    cliente_id=argumentos.get("cliente_id"),
                    desde=argumentos.get("desde"),
                    hasta=argumentos.get("hasta"),
                    usuario_id=usuario_id,
                    agente_id=None,
                )
            if nombre == "facturas_por_vencer":
                return await self._consultas.facturas_por_vencer(
                    dias=argumentos.get("dias", 30), usuario_id=usuario_id, agente_id=None
                )
            if nombre == "clientes_morosos":
                return await self._consultas.clientes_morosos(usuario_id=usuario_id, agente_id=None)
            if nombre == "resumen_gasto_campana":
                return await self._consultas.resumen_gasto_campana(
                    campana_id=argumentos.get("campana_id", ""), usuario_id=usuario_id, agente_id=None
                )
        except ExcepcionDominio as error:
            return {"error": error.codigo, "mensaje": error.mensaje}

        return {"error": "herramienta_desconocida"}

    def _construir_reporte(
        self,
        usuario_id: UUID | None,
        pregunta: str,
        respuesta_nl: str | None,
        herramientas_usadas: list[dict[str, Any]],
        resultado_tabular: Any,
        columnas_elegidas: list[str] | None = None,
    ) -> ReporteGenerado:
        columnas, filas = _tabla_desde_resultado(resultado_tabular)
        # La seleccion de la IA solo puede recortar/reordenar columnas que existen.
        validas = list(dict.fromkeys(c for c in (columnas_elegidas or []) if c in columnas))
        if validas:
            columnas = validas
        return ReporteGenerado(
            id=uuid4(),
            usuario_id=usuario_id,
            pregunta=pregunta,
            respuesta_nl=respuesta_nl,
            herramientas_usadas=herramientas_usadas,
            columnas=columnas,
            filas=filas,
            estado="listo",
        )


def _tabla_desde_resultado(resultado: Any) -> tuple[list[str], list[dict[str, Any]]]:
    if isinstance(resultado, list) and resultado and isinstance(resultado[0], dict):
        return list(resultado[0].keys()), resultado
    if isinstance(resultado, dict) and "error" not in resultado:
        return list(resultado.keys()), [resultado]
    return [], []
