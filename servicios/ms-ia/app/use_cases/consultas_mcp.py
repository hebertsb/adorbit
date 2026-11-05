"""Las 4 herramientas del contrato MCP (ver documentacion/03-contratos.md). Los
parametros llegan como strings sueltos (no tipos ya validados) a proposito: la
validacion pasa ADENTRO de `trabajo()`, para que un parametro malicioso o mal formado
quede auditado como bloqueado en vez de nunca llegar a ejecutarse (ver
mcp_herramientas.py).
"""

from __future__ import annotations

from datetime import date
from typing import Any
from uuid import UUID

from ..domain.errores import ExcepcionDominio
from ..domain.puertos import VistaMcpPuerto
from .mcp_herramientas import EjecutorHerramientaMcp

_ESTADOS_CAMPANA_VALIDOS = {
    "borrador",
    "pendiente_aprobacion",
    "pendiente",
    "activa",
    "pausada",
    "finalizada",
    "cancelada",
    "rechazada",
}


def _validar_uuid(valor: str | None, campo: str) -> UUID | None:
    if valor is None:
        return None
    try:
        return UUID(valor)
    except (ValueError, AttributeError, TypeError) as error:
        raise ExcepcionDominio("parametro_invalido", f"{campo} no es un UUID valido") from error


def _validar_fecha(valor: str | None, campo: str) -> date | None:
    if valor is None:
        return None
    try:
        return date.fromisoformat(valor)
    except (ValueError, TypeError) as error:
        raise ExcepcionDominio(
            "parametro_invalido", f"{campo} no es una fecha ISO valida (YYYY-MM-DD)"
        ) from error


def _validar_estado_campana(valor: str | None) -> str | None:
    if valor is None:
        return None
    if valor not in _ESTADOS_CAMPANA_VALIDOS:
        raise ExcepcionDominio("parametro_invalido", f"estado invalido: {valor!r}")
    return valor


def _validar_dias(valor: int) -> int:
    if not isinstance(valor, int) or isinstance(valor, bool) or valor < 0 or valor > 365:
        raise ExcepcionDominio("parametro_invalido", "dias debe ser un entero entre 0 y 365")
    return valor


class ConsultasMcp:
    def __init__(self, vista: VistaMcpPuerto, ejecutor: EjecutorHerramientaMcp) -> None:
        self._vista = vista
        self._ejecutor = ejecutor

    async def consultar_campanas(
        self,
        *,
        estado: str | None,
        cliente_id: str | None,
        desde: str | None,
        hasta: str | None,
        usuario_id: UUID | None,
        agente_id: UUID | None,
    ) -> list[dict[str, Any]]:
        async def trabajo() -> list[dict[str, Any]]:
            return await self._vista.consultar_campanas(
                _validar_estado_campana(estado),
                _validar_uuid(cliente_id, "cliente_id"),
                _validar_fecha(desde, "desde"),
                _validar_fecha(hasta, "hasta"),
            )

        return await self._ejecutor.ejecutar(
            herramienta="consultar_campanas",
            parametros={"estado": estado, "cliente_id": cliente_id, "desde": desde, "hasta": hasta},
            usuario_id=usuario_id,
            agente_id=agente_id,
            trabajo=trabajo,
        )

    async def facturas_por_vencer(
        self, *, dias: int, usuario_id: UUID | None, agente_id: UUID | None
    ) -> list[dict[str, Any]]:
        async def trabajo() -> list[dict[str, Any]]:
            return await self._vista.facturas_por_vencer(_validar_dias(dias))

        return await self._ejecutor.ejecutar(
            herramienta="facturas_por_vencer",
            parametros={"dias": dias},
            usuario_id=usuario_id,
            agente_id=agente_id,
            trabajo=trabajo,
        )

    async def clientes_morosos(
        self, *, usuario_id: UUID | None, agente_id: UUID | None
    ) -> list[dict[str, Any]]:
        async def trabajo() -> list[dict[str, Any]]:
            return await self._vista.clientes_morosos()

        return await self._ejecutor.ejecutar(
            herramienta="clientes_morosos",
            parametros={},
            usuario_id=usuario_id,
            agente_id=agente_id,
            trabajo=trabajo,
        )

    async def resumen_gasto_campana(
        self, *, campana_id: str, usuario_id: UUID | None, agente_id: UUID | None
    ) -> dict[str, Any] | None:
        async def trabajo() -> dict[str, Any] | None:
            campana_id_v = _validar_uuid(campana_id, "campana_id")
            if campana_id_v is None:
                raise ExcepcionDominio("parametro_invalido", "campana_id es obligatorio")
            return await self._vista.resumen_gasto_campana(campana_id_v)

        return await self._ejecutor.ejecutar(
            herramienta="resumen_gasto_campana",
            parametros={"campana_id": campana_id},
            usuario_id=usuario_id,
            agente_id=agente_id,
            trabajo=trabajo,
        )
