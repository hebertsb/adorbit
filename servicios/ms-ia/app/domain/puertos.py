"""Puertos (Protocol) — el dominio y los casos de uso no conocen asyncpg ni FastAPI,
solo estas formas. Los adaptadores en app/adapters/ los implementan."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from typing import Any, Protocol
from uuid import UUID

from .reporte import ReporteCampana, ReporteCliente, ReporteFacturacion
from .reporte_generado import ReporteGenerado


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


class ReporteGeneradoRepositorio(Protocol):
    async def crear(self, reporte: ReporteGenerado, conexion: Any) -> None: ...
    async def buscar(self, id_reporte: UUID) -> ReporteGenerado | None: ...


class ClienteLlmPuerto(Protocol):
    """LLM con tool-calling (ver app/adapters/llm/groq_cliente.py). Devuelve el mensaje
    crudo del modelo: o bien `tool_calls` (el LLM quiere llamar una herramienta MCP) o
    `contenido` (la respuesta final en lenguaje natural)."""

    def mensaje_sistema(self) -> dict[str, Any]: ...

    async def completar_con_herramientas(
        self, mensajes: list[dict[str, Any]]
    ) -> "RespuestaLlm": ...


@dataclass
class LlamadaHerramientaLlm:
    id: str
    nombre: str
    argumentos_crudos: str


@dataclass
class RespuestaLlm:
    contenido: str | None
    llamadas_herramienta: list[LlamadaHerramientaLlm]
