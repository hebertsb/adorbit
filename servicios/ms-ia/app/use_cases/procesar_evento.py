"""Un solo punto de entrada para cualquier evento de dominio consumido por RabbitMQ —
dedupe por id_evento + actualizacion del read model, en una sola transaccion de
Postgres (la abre y la pasa el consumidor via `conexion`, ver
app/adapters/rabbitmq/consumidor.py)."""

from __future__ import annotations

from datetime import date
from decimal import Decimal
from typing import Any
from uuid import UUID

from ..domain.puertos import (
    EventosProcesadosPuerto,
    ReporteCampanaRepositorio,
    ReporteClienteRepositorio,
    ReporteFacturacionRepositorio,
)
from ..domain.reporte import ReporteCampana, ReporteCliente, ReporteFacturacion

_EVENTOS_CAMPANA = {"CampanaCreada", "CampanaActualizada", "CampanaContratada", "CampanaRechazada"}
_EVENTOS_CLIENTE = {"ClienteCreado", "ClienteActualizado"}
_EVENTOS_FACTURACION = {"FacturaEmitida", "FacturaPagada", "FacturacionFallida"}
# Disparan agentes de la tarea 5/6 (fuera de alcance de esta pasada) — por ahora solo se dedupen.
_EVENTOS_SIN_READ_MODEL = {"BriefRecibido", "PiezaSubida", "PiezaAprobada"}


class ProcesarEvento:
    def __init__(
        self,
        eventos_procesados: EventosProcesadosPuerto,
        reportes_campana: ReporteCampanaRepositorio,
        reportes_cliente: ReporteClienteRepositorio,
        reportes_facturacion: ReporteFacturacionRepositorio,
    ) -> None:
        self._eventos_procesados = eventos_procesados
        self._reportes_campana = reportes_campana
        self._reportes_cliente = reportes_cliente
        self._reportes_facturacion = reportes_facturacion

    async def ejecutar(self, id_evento: UUID, tipo_evento: str, carga: dict[str, Any], conexion: Any) -> bool:
        """Devuelve True si se proceso de verdad (False si era un duplicado — ack sin re-aplicar)."""
        es_nuevo = await self._eventos_procesados.marcar_si_nuevo(id_evento, tipo_evento, conexion)
        if not es_nuevo:
            return False

        if tipo_evento in _EVENTOS_CAMPANA:
            await self._procesar_campana(carga, conexion)
        elif tipo_evento in _EVENTOS_CLIENTE:
            await self._procesar_cliente(carga, conexion)
        elif tipo_evento in _EVENTOS_FACTURACION:
            await self._procesar_facturacion(tipo_evento, carga, conexion)
        elif tipo_evento in _EVENTOS_SIN_READ_MODEL:
            pass  # TODO Hebert: disparar agente creativo/marca (tarea 5/6)
        # tipo desconocido: se dedupe igual y no se actua — el README pide consumir
        # todos los eventos de dominio, no solo los que ya tienen handler.

        return True

    async def _procesar_campana(self, carga: dict[str, Any], conexion: Any) -> None:
        reporte = ReporteCampana(
            campana_id=UUID(carga["campana_id"]),
            cliente_id=UUID(carga["cliente_id"]),
            nombre=carga.get("nombre", ""),
            estado=carga.get("estado", ""),
            presupuesto_total=_decimal(carga.get("presupuesto_total")),
            gasto_actual=_decimal(carga.get("gasto_actual")),
            fecha_inicio=_fecha(carga.get("fecha_inicio")),
            fecha_fin=_fecha(carga.get("fecha_fin")),
            ultima_version=int(carga.get("version", 0)),
        )
        await self._reportes_campana.guardar(reporte, conexion)

    async def _procesar_cliente(self, carga: dict[str, Any], conexion: Any) -> None:
        reporte = ReporteCliente(
            cliente_id=UUID(carga["cliente_id"]),
            nombre=carga.get("razon_social") or carga.get("nombre", ""),
            nit=carga.get("nit"),
            estado=carga.get("estado"),
            linea_credito_limite=_decimal_o_none(carga.get("linea_credito_limite")),
            linea_credito_usado=_decimal_o_none(carga.get("linea_credito_usado")),
        )
        await self._reportes_cliente.guardar(reporte, conexion)

    async def _procesar_facturacion(self, tipo_evento: str, carga: dict[str, Any], conexion: Any) -> None:
        reporte = ReporteFacturacion(
            factura_id=UUID(carga["factura_id"]),
            cliente_id=UUID(carga["cliente_id"]),
            campana_id=UUID(carga["campana_id"]) if carga.get("campana_id") else None,
            estado=_estado_facturacion(tipo_evento, carga),
            total=_decimal(carga.get("total")),
            moneda=carga.get("moneda", "BOB"),
            fecha_emision=_fecha(carga.get("fecha_emision")),
            fecha_vencimiento=_fecha(carga.get("fecha_vencimiento")),
        )
        await self._reportes_facturacion.guardar(reporte, conexion)


def _decimal(valor: Any) -> Decimal:
    return Decimal(str(valor)) if valor is not None else Decimal(0)


def _decimal_o_none(valor: Any) -> Decimal | None:
    return Decimal(str(valor)) if valor is not None else None


def _fecha(valor: Any) -> date | None:
    if valor is None:
        return None
    if isinstance(valor, date):
        return valor
    return date.fromisoformat(str(valor)[:10])


def _estado_facturacion(tipo_evento: str, carga: dict[str, Any]) -> str:
    if tipo_evento == "FacturaPagada":
        return "PAGADA"
    if tipo_evento == "FacturacionFallida":
        return "FALLIDA"
    return carga.get("estado", "EMITIDA")
