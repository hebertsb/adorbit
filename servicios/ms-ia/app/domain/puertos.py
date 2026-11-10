"""Puertos (Protocol) — el dominio y los casos de uso no conocen asyncpg ni FastAPI,
solo estas formas. Los adaptadores en app/adapters/ los implementan."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from typing import Any, Protocol
from uuid import UUID

from .agente import Agente, EjecucionAgente
from .modelo_ml import ModeloAprendizaje
from .reporte import ReporteCampana, ReporteCliente, ReporteFacturacion
from .reporte_generado import ReporteGenerado
from .vision_resultado import VisionResultado


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

    async def buscar_cliente(self, cliente_id: UUID) -> dict[str, Any] | None: ...


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


class AgenteRepositorio(Protocol):
    async def buscar(self, id_agente: UUID) -> Agente | None: ...
    async def listar(self) -> list[Agente]: ...


class EjecucionAgenteRepositorio(Protocol):
    async def crear(self, ejecucion: EjecucionAgente, conexion: Any) -> None: ...

    async def finalizar(
        self, id_ejecucion: UUID, *, estado: str, salida: dict[str, Any] | None, error: str | None, conexion: Any
    ) -> None: ...

    async def buscar(self, id_ejecucion: UUID) -> EjecucionAgente | None: ...


class OutboxEventosPuerto(Protocol):
    """Escribe en bandeja_salida_eventos dentro de la MISMA transaccion del caso de uso
    que publica -- patron de outbox transaccional (CLAUDE.md), igual que
    relevoBandejaSalida.ts/outboxRepositorioMongo.ts en ms-creatividades. Un relevo
    aparte (app/adapters/rabbitmq/relevo_bandeja_salida.py) la vacia hacia RabbitMQ."""

    async def publicar(
        self,
        *,
        conexion: Any,
        tipo_agregado: str,
        agregado_id: UUID,
        tipo_evento: str,
        carga: dict[str, Any],
    ) -> None: ...


class ModeloAprendizajeRepositorio(Protocol):
    """modelos_aprendizaje (tarea 6) -- se llena una sola vez por
    herramientas/entrenar_modelos_ml.py; las inferencias solo leen el activo."""

    async def buscar_activo_por_nombre(self, nombre: str) -> ModeloAprendizaje | None: ...


class VisionResultadoRepositorio(Protocol):
    async def buscar_por_huella(
        self, pieza_id: UUID, huella_imagen: str, modelo_id: UUID
    ) -> VisionResultado | None: ...

    async def crear(self, resultado: VisionResultado) -> None: ...

    async def listar_recientes(self, limite: int = 20) -> list[VisionResultado]: ...
