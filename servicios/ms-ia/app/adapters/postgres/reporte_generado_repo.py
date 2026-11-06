from __future__ import annotations

import json
from typing import Any
from uuid import UUID

from ...domain.reporte_generado import ReporteGenerado
from .conexion import obtener_pool_principal


class ReporteGeneradoRepositorioPg:
    async def crear(self, reporte: ReporteGenerado, conexion: Any) -> None:
        await conexion.execute(
            """
            INSERT INTO reportes_generados
              (id, usuario_id, pregunta, respuesta_nl, herramientas_usadas, columnas,
               filas, estado, error)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            """,
            reporte.id,
            reporte.usuario_id,
            reporte.pregunta,
            reporte.respuesta_nl,
            json.dumps(reporte.herramientas_usadas, default=str),
            json.dumps(reporte.columnas, default=str),
            json.dumps(reporte.filas, default=str),
            reporte.estado,
            reporte.error,
        )

    async def buscar(self, id_reporte: UUID) -> ReporteGenerado | None:
        pool = await obtener_pool_principal()
        fila = await pool.fetchrow("SELECT * FROM reportes_generados WHERE id = $1", id_reporte)
        if fila is None:
            return None
        datos = dict(fila)
        datos["herramientas_usadas"] = json.loads(datos["herramientas_usadas"])
        datos["columnas"] = json.loads(datos["columnas"])
        datos["filas"] = json.loads(datos["filas"])
        return ReporteGenerado(**datos)
