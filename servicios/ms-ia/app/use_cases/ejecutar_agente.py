"""Agentes internos (tarea 5): monitor_campanas y cobranza, primeros dos del README.
Reusan `ConsultasMcp` TAL CUAL (mismo objeto que generar_reporte.py/servidor.py) -- cada
consulta queda auditada en auditoria_mcp, ahora con agente_id real (ya no None, ver el
TODO que dejaba servidor.py). `monitor_campanas` detecta presupuesto casi agotado y
publica `AlertaCampana` por el outbox transaccional; `cobranza` detecta facturas por
vencer/vencidas y clientes morosos y devuelve el resumen en la propia ejecucion -- no
publica evento porque vista_mcp_facturacion no expone campana_id (la vista MCP es
deliberadamente minima, ver D10/D12), asi que no hay con que armar un AlertaCampana
valido para una factura; el llamador (n8n) actua directo sobre la salida de
POST /agentes/{id}/ejecutar.
"""

from __future__ import annotations

from typing import Any
from uuid import UUID, uuid4

from ..domain.agente import Agente, EjecucionAgente
from ..domain.errores import ExcepcionDominio
from ..domain.puertos import AgenteRepositorio, EjecucionAgenteRepositorio, OutboxEventosPuerto
from .compartido.idempotencia import con_idempotencia
from .consultas_mcp import ConsultasMcp

_UMBRAL_PRESUPUESTO = 0.9
_DIAS_FACTURAS_COBRANZA = 7


class EjecutarAgente:
    def __init__(
        self,
        agentes: AgenteRepositorio,
        ejecuciones: EjecucionAgenteRepositorio,
        consultas: ConsultasMcp,
        outbox: OutboxEventosPuerto,
    ) -> None:
        self._agentes = agentes
        self._ejecuciones = ejecuciones
        self._consultas = consultas
        self._outbox = outbox

    async def ejecutar(
        self,
        *,
        id_agente: UUID,
        disparador: str,
        usuario_id: UUID | None,
        clave_idempotencia: str,
        conexion: Any,
    ) -> EjecucionAgente:
        agente = await self._agentes.buscar(id_agente)
        if agente is None or not agente.activo:
            raise ExcepcionDominio("agente_no_encontrado", "No existe un agente activo con ese id")

        async def reconstruir_replay(datos_guardados: dict[str, Any]) -> EjecucionAgente:
            ejecucion = await self._ejecuciones.buscar(UUID(datos_guardados["id"]))
            if ejecucion is None:
                raise ExcepcionDominio("error_interno", "No se pudo recuperar una ejecucion repetida")
            return ejecucion

        async def ejecutar_real() -> tuple[EjecucionAgente, dict[str, Any]]:
            ejecucion = EjecucionAgente(
                id=uuid4(), agente_id=agente.id, disparador=disparador, entrada={"usuario_id": str(usuario_id) if usuario_id else None}
            )
            await self._ejecuciones.crear(ejecucion, conexion)

            try:
                salida = await self._correr(agente, ejecucion.id, usuario_id, conexion)
            except ExcepcionDominio as error:
                await self._ejecuciones.finalizar(
                    ejecucion.id, estado="fallida", salida=None, error=error.mensaje, conexion=conexion
                )
                raise
            except Exception as error:
                await self._ejecuciones.finalizar(
                    ejecucion.id, estado="fallida", salida=None, error=str(error), conexion=conexion
                )
                raise

            await self._ejecuciones.finalizar(
                ejecucion.id, estado="exitosa", salida=salida, error=None, conexion=conexion
            )
            ejecucion.estado, ejecucion.salida = "exitosa", salida
            return ejecucion, {"id": str(ejecucion.id)}

        return await con_idempotencia(
            conexion=conexion,
            clave=clave_idempotencia,
            datos_huella={"id_agente": str(id_agente), "disparador": disparador},
            reconstruir_replay=reconstruir_replay,
            ejecutar=ejecutar_real,
        )

    async def _correr(
        self, agente: Agente, id_ejecucion: UUID, usuario_id: UUID | None, conexion: Any
    ) -> dict[str, Any]:
        if agente.nombre == "monitor_campanas":
            return await self._correr_monitor(agente.id, usuario_id, conexion)
        if agente.nombre == "cobranza":
            return await self._correr_cobranza(agente.id, usuario_id)
        raise ExcepcionDominio("agente_no_soportado", f"El agente '{agente.nombre}' aun no tiene logica implementada")

    async def _correr_monitor(self, agente_id: UUID, usuario_id: UUID | None, conexion: Any) -> dict[str, Any]:
        campanas = await self._consultas.consultar_campanas(
            estado="activa", cliente_id=None, desde=None, hasta=None, usuario_id=usuario_id, agente_id=agente_id
        )

        alertas: list[dict[str, Any]] = []
        for campana in campanas:
            presupuesto = float(campana["presupuesto_total"] or 0)
            gasto = float(campana["gasto_actual"] or 0)
            if presupuesto <= 0:
                continue
            proporcion = gasto / presupuesto
            if proporcion >= _UMBRAL_PRESUPUESTO:
                campana_id = UUID(str(campana["campana_id"]))
                carga = {
                    "campana_id": str(campana_id),
                    "tipo": "presupuesto_90_porciento",
                    "detalle": f"Gasto {gasto:.2f} de {presupuesto:.2f} ({proporcion:.0%})",
                }
                await self._outbox.publicar(
                    conexion=conexion,
                    tipo_agregado="campana",
                    agregado_id=campana_id,
                    tipo_evento="AlertaCampana",
                    carga=carga,
                )
                alertas.append(carga)

        return {"campanas_revisadas": len(campanas), "alertas_generadas": alertas}

    async def _correr_cobranza(self, agente_id: UUID, usuario_id: UUID | None) -> dict[str, Any]:
        facturas = await self._consultas.facturas_por_vencer(
            dias=_DIAS_FACTURAS_COBRANZA, usuario_id=usuario_id, agente_id=agente_id
        )
        morosos = await self._consultas.clientes_morosos(usuario_id=usuario_id, agente_id=agente_id)

        facturas_vencidas = [f for f in facturas if (f.get("dias_vencida") or 0) > 0]
        facturas_por_vencer = [f for f in facturas if (f.get("dias_vencida") or 0) == 0]

        return {
            "facturas_vencidas": facturas_vencidas,
            "facturas_por_vencer": facturas_por_vencer,
            "clientes_morosos": morosos,
        }
