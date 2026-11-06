from __future__ import annotations

import json

from ...domain.modelo_ml import ModeloAprendizaje
from .conexion import obtener_pool_principal


class ModeloAprendizajeRepositorioPg:
    async def buscar_activo_por_nombre(self, nombre: str) -> ModeloAprendizaje | None:
        pool = await obtener_pool_principal()
        fila = await pool.fetchrow(
            """
            SELECT id, nombre, tipo, version, metricas, artefacto_ruta, activo, creado_en
            FROM modelos_aprendizaje
            WHERE nombre = $1 AND activo
            ORDER BY creado_en DESC
            LIMIT 1
            """,
            nombre,
        )
        if fila is None:
            return None
        datos = dict(fila)
        datos["metricas"] = json.loads(datos["metricas"]) if datos["metricas"] else {}
        return ModeloAprendizaje(**datos)
