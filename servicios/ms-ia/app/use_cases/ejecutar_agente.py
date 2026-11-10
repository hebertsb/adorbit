"""Agentes internos (tarea 5): monitor_campanas, cobranza, agente_vision y consultor_ejecutivo_nl.
Reusan `ConsultasMcp` TAL CUAL (mismo objeto que generar_reporte.py/servidor.py) -- cada
consulta queda auditada en auditoria_mcp con agente_id real.
"""

from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from typing import Any
from uuid import UUID, uuid4

from ..domain.agente import Agente, EjecucionAgente
from ..domain.errores import ExcepcionDominio
from ..domain.puertos import (
    AgenteRepositorio,
    EjecucionAgenteRepositorio,
    OutboxEventosPuerto,
    VisionResultadoRepositorio,
)
from .compartido.idempotencia import con_idempotencia
from .consultas_mcp import ConsultasMcp

_UMBRAL_PRESUPUESTO = 0.9
_DIAS_FACTURAS_COBRANZA = 7


def _serializar_valor(valor: Any) -> Any:
    if isinstance(valor, UUID):
        return str(valor)
    if isinstance(valor, Decimal):
        return float(valor)
    if isinstance(valor, (datetime, date)):
        return valor.isoformat()
    if isinstance(valor, list):
        return [_serializar_valor(v) for v in valor]
    if isinstance(valor, dict):
        return {str(k): _serializar_valor(v) for k, v in valor.items()}
    return valor


class EjecutarAgente:
    def __init__(
        self,
        agentes: AgenteRepositorio,
        ejecuciones: EjecucionAgenteRepositorio,
        consultas: ConsultasMcp,
        outbox: OutboxEventosPuerto,
        vision_resultados: VisionResultadoRepositorio | None = None,
    ) -> None:
        self._agentes = agentes
        self._ejecuciones = ejecuciones
        self._consultas = consultas
        self._outbox = outbox
        self._vision_resultados = vision_resultados

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
        if agente.nombre == "agente_vision":
            return await self._correr_vision(agente.id, usuario_id)
        if agente.nombre == "consultor_ejecutivo_nl":
            return await self._correr_consultor_ejecutivo(agente.id, usuario_id)
        raise ExcepcionDominio("agente_no_soportado", f"El agente '{agente.nombre}' aun no tiene logica implementada")

    async def _correr_monitor(self, agente_id: UUID, usuario_id: UUID | None, conexion: Any) -> dict[str, Any]:
        campanas = await self._consultas.consultar_campanas(
            estado="activa", cliente_id=None, desde=None, hasta=None, usuario_id=usuario_id, agente_id=agente_id
        )

        alertas: list[dict[str, Any]] = []
        presupuesto_total = 0.0
        gasto_total = 0.0
        for campana in campanas:
            presupuesto = float(campana["presupuesto_total"] or 0)
            gasto = float(campana["gasto_actual"] or 0)
            presupuesto_total += presupuesto
            gasto_total += gasto
            if presupuesto <= 0:
                continue
            proporcion = gasto / presupuesto
            if proporcion >= _UMBRAL_PRESUPUESTO:
                campana_id = UUID(str(campana["campana_id"]))
                carga = {
                    "campana_id": str(campana_id),
                    "nombre": str(campana.get("nombre") or "Campaña"),
                    "tipo": "presupuesto_90_porciento",
                    "detalle": f"Gasto {gasto:,.2f} de {presupuesto:,.2f} ({proporcion:.0%})",
                }
                await self._outbox.publicar(
                    conexion=conexion,
                    tipo_agregado="campana",
                    agregado_id=campana_id,
                    tipo_evento="AlertaCampana",
                    carga=carga,
                )
                alertas.append(carga)

        resumen_texto = (
            f"Se auditaron {len(campanas)} campañas activas "
            f"({len(alertas)} alertas de presupuesto generadas)."
        )
        return {
            "resumen_texto": resumen_texto,
            "campanas_revisadas": len(campanas),
            "presupuesto_acumulado": round(presupuesto_total, 2),
            "gasto_acumulado": round(gasto_total, 2),
            "alertas_generadas": alertas,
        }

    async def _correr_cobranza(self, agente_id: UUID, usuario_id: UUID | None) -> dict[str, Any]:
        facturas = await self._consultas.facturas_por_vencer(
            dias=_DIAS_FACTURAS_COBRANZA, usuario_id=usuario_id, agente_id=agente_id
        )
        morosos = await self._consultas.clientes_morosos(usuario_id=usuario_id, agente_id=agente_id)

        facturas_limpias = [_serializar_valor(f) for f in facturas]
        morosos_limpios = [_serializar_valor(m) for m in morosos]
        facturas_vencidas = [f for f in facturas_limpias if (f.get("dias_vencida") or 0) > 0]
        facturas_por_vencer = [f for f in facturas_limpias if (f.get("dias_vencida") or 0) == 0]
        monto_vencido = sum(float(f.get("total") or 0) for f in facturas_vencidas)

        resumen_texto = (
            f"{len(facturas_vencidas)} facturas vencidas (total {monto_vencido:,.2f}), "
            f"{len(facturas_por_vencer)} por vencer y {len(morosos_limpios)} clientes en mora."
        )
        return {
            "resumen_texto": resumen_texto,
            "total_vencidas": len(facturas_vencidas),
            "total_por_vencer": len(facturas_por_vencer),
            "total_morosos": len(morosos_limpios),
            "monto_vencido_total": round(monto_vencido, 2),
            "facturas_vencidas": facturas_vencidas,
            "facturas_por_vencer": facturas_por_vencer,
            "clientes_morosos": morosos_limpios,
        }

    async def _correr_vision(self, agente_id: UUID, usuario_id: UUID | None) -> dict[str, Any]:
        # Audita contexto MCP de campañas activas vinculadas a piezas visuales
        campanas = await self._consultas.consultar_campanas(
            estado="activa", cliente_id=None, desde=None, hasta=None, usuario_id=usuario_id, agente_id=agente_id
        )
        resultados = (
            await self._vision_resultados.listar_recientes(limite=20)
            if self._vision_resultados is not None
            else []
        )
        total = len(resultados)
        conformes = sum(1 for r in resultados if r.manual_marca_ok is True)
        observadas = sum(1 for r in resultados if r.manual_marca_ok is False)
        confianzas = [float(r.confianza) for r in resultados if r.confianza is not None]
        confianza_promedio = round((sum(confianzas) / len(confianzas)) * 100, 1) if confianzas else 0.0

        hallazgos = [
            {
                "pieza_id": str(r.pieza_id)[:8].upper(),
                "manual_marca_ok": bool(r.manual_marca_ok),
                "confianza_pct": round(float(r.confianza or 0) * 100, 1),
                "objetos": r.objetos_detectados[:3] if isinstance(r.objetos_detectados, list) else [],
            }
            for r in resultados[:4]
        ]

        resumen_texto = (
            f"Se inspeccionaron {total} análisis visuales ({conformes} conformes al manual de marca, "
            f"{observadas} con observaciones, confianza media {confianza_promedio}%)."
        )
        return {
            "resumen_texto": resumen_texto,
            "piezas_auditadas": total,
            "conformes_marca": conformes,
            "con_observaciones": observadas,
            "confianza_promedio_pct": confianza_promedio,
            "campanas_activas_contexto": len(campanas),
            "ultimos_hallazgos": hallazgos,
        }

    async def _correr_consultor_ejecutivo(self, agente_id: UUID, usuario_id: UUID | None) -> dict[str, Any]:
        campanas = await self._consultas.consultar_campanas(
            estado=None, cliente_id=None, desde=None, hasta=None, usuario_id=usuario_id, agente_id=agente_id
        )
        facturas = await self._consultas.facturas_por_vencer(
            dias=30, usuario_id=usuario_id, agente_id=agente_id
        )
        morosos = await self._consultas.clientes_morosos(usuario_id=usuario_id, agente_id=agente_id)

        activas = [c for c in campanas if c.get("estado") == "activa"]
        presupuesto_total = sum(float(c.get("presupuesto_total") or 0) for c in campanas)
        gasto_total = sum(float(c.get("gasto_actual") or 0) for c in campanas)
        ejecucion_pct = round((gasto_total / presupuesto_total) * 100, 1) if presupuesto_total > 0 else 0.0
        monto_por_cobrar = sum(float(f.get("total") or 0) for f in facturas)

        resumen_texto = (
            f"Panorama ejecutivo MCP: {len(campanas)} campañas ({len(activas)} activas), "
            f"ejecución presupuestaria del {ejecucion_pct}% ({gasto_total:,.2f} / {presupuesto_total:,.2f}), "
            f"{len(facturas)} facturas pendientes y {len(morosos)} clientes en mora."
        )
        return {
            "resumen_texto": resumen_texto,
            "campanas_totales": len(campanas),
            "campanas_activas": len(activas),
            "presupuesto_total": round(presupuesto_total, 2),
            "gasto_acumulado": round(gasto_total, 2),
            "ejecucion_global_pct": ejecucion_pct,
            "facturas_pendientes_30d": len(facturas),
            "monto_pendiente_cobro": round(monto_por_cobrar, 2),
            "clientes_morosos": len(morosos),
        }
