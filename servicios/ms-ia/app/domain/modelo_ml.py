"""Entidad de modelos_aprendizaje (tarea 6) -- un modelo entrenado offline
(herramientas/entrenar_modelos_ml.py) y registrado aqui; los casos de uso de
inferencia buscan el activo por nombre antes de predecir."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Any
from uuid import UUID


@dataclass(slots=True)
class ModeloAprendizaje:
    id: UUID
    nombre: str
    tipo: str  # supervisado | no_supervisado | deep_learning
    version: str
    metricas: dict[str, Any]
    artefacto_ruta: str | None
    activo: bool
    creado_en: datetime | None = None
