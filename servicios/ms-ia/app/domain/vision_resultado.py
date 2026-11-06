"""Entidad de vision_resultados (tarea 6, DL) -- un analisis de una pieza con el
modelo de vision activo. La idempotencia es por contenido, no por Idempotency-Key:
UNIQUE(pieza_id, huella_imagen, modelo_id) en el esquema evita re-analizar la MISMA
imagen dos veces con el mismo modelo (ver 05-decisiones-y-pendientes.md)."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import Any
from uuid import UUID


@dataclass(slots=True)
class VisionResultado:
    id: UUID
    pieza_id: UUID
    modelo_id: UUID
    huella_imagen: str
    campana_id: UUID | None = None
    origen: str = "servidor"  # web_local | movil_local | servidor
    detecta_logo: bool | None = None
    detecta_texto: bool | None = None
    manual_marca_ok: bool | None = None
    confianza: float | None = None
    objetos_detectados: list[dict[str, Any]] = field(default_factory=list)
    salida_cruda: dict[str, Any] = field(default_factory=dict)
    duracion_ms: int = 0
    creado_en: datetime | None = None
