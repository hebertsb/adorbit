"""Puertos (Protocol) — el dominio y los casos de uso no conocen asyncpg ni FastAPI,
solo estas formas. Los adaptadores en app/adapters/ los implementan."""

from __future__ import annotations

from datetime import date
from typing import Any, Protocol
from uuid import UUID

from .reporte import ReporteCampana, ReporteCliente, ReporteFacturacion


class EventosProcesadosPuerto(Protocol):
    """Dedupe por id_evento. Devuelve True si el evento es nuevo (y lo deja marcado
    como procesado, dentro de la misma transaccion que `conexion` trae abierta)."""

    async def marcar_si_nuevo(self, id_evento: UUID, tipo_evento: str, conexion: Any) -> bool: ...


class ReporteCampanaRepositorio(Protocol):
    async def guardar(self, reporte: ReporteCampana, conexion: Any) -> None: ...
    async def buscar(self, campana_id: UUID) -> ReporteCampana | None: ...


class ReporteClienteRepositorio(Protocol):
    async def guardar(self, reporte: ReporteCliente, conexion: Any) -> None: ...


class ReporteFacturacionRepositorio(Protocol):
    async def guardar(self, reporte: ReporteFacturacion, conexion: Any) -> None: ...


class AuditoriaMcpRepositorio(Protocol):
    async def registrar(
        self,
        *,
        agente_id: UUID | None,
        usuario_id: UUID | None,
        herramienta: str,
        parametros: dict[str, Any],
        resultado_resumen: dict[str, Any] | None,
        exito: bool,
        bloqueado: bool,
        motivo_bloqueo: str | None,
        error: str | None,
        duracion_ms: int,
    ) -> None: ...

    async def listar(self, pagina: int, tamano: int) -> list[dict[str, Any]]: ...


class VistaMcpPuerto(Protocol):
    """Consultas de solo lectura contra vista_mcp_* via el rol lector_mcp — nunca
    contra las tablas base, siempre con SQL parametrizado."""

    async def consultar_campanas(
        self, estado: str | None, cliente_id: UUID | None, desde: date | None, hasta: date | None
    ) -> list[dict[str, Any]]: ...

    async def facturas_por_vencer(self, dias: int) -> list[dict[str, Any]]: ...

    async def clientes_morosos(self) -> list[dict[str, Any]]: ...

    async def resumen_gasto_campana(self, campana_id: UUID) -> dict[str, Any] | None: ...
