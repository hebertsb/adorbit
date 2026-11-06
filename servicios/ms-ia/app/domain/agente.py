"""Entidades de agentes internos (tarea 5) -- un agente es una mision fija (monitor,
cobranza, ...) y cada corrida suya queda en una EjecucionAgente, igual de auditable que
una llamada MCP directa."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import Any
from uuid import UUID


@dataclass(slots=True)
class Agente:
    id: UUID
    nombre: str
    mision: str
    habilidades: list[str] = field(default_factory=list)
    disparador: str | None = None
    activo: bool = True
    creado_en: datetime | None = None


@dataclass(slots=True)
class EjecucionAgente:
    id: UUID
    agente_id: UUID
    disparador: str | None
    estado: str = "en_curso"
    entrada: dict[str, Any] | None = None
    salida: dict[str, Any] | None = None
    error: str | None = None
    started_at: datetime | None = None
    finished_at: datetime | None = None
