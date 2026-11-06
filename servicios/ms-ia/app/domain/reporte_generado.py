"""Entidad del reporte en lenguaje natural (tarea 4) — no confundir con las entidades
de read-model en reporte.py (ReporteCampana/Cliente/Facturacion), que son otra cosa."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import Any
from uuid import UUID


@dataclass(slots=True)
class ReporteGenerado:
    id: UUID
    usuario_id: UUID | None
    pregunta: str
    respuesta_nl: str | None
    herramientas_usadas: list[dict[str, Any]] = field(default_factory=list)
    columnas: list[str] = field(default_factory=list)
    filas: list[dict[str, Any]] = field(default_factory=list)
    estado: str = "listo"
    error: str | None = None
    creado_en: datetime | None = None
