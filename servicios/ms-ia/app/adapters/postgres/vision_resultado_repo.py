from __future__ import annotations

import json
from uuid import UUID

from ...domain.vision_resultado import VisionResultado
from .conexion import obtener_pool_principal


class VisionResultadoRepositorioPg:
    async def buscar_por_huella(
        self, pieza_id: UUID, huella_imagen: str, modelo_id: UUID
    ) -> VisionResultado | None:
        pool = await obtener_pool_principal()
        fila = await pool.fetchrow(
            "SELECT * FROM vision_resultados WHERE pieza_id = $1 AND huella_imagen = $2 AND modelo_id = $3",
            pieza_id,
            huella_imagen,
            modelo_id,
        )
        if fila is None:
            return None
        datos = dict(fila)
        datos["objetos_detectados"] = json.loads(datos["objetos_detectados"]) if datos["objetos_detectados"] else []
        datos["salida_cruda"] = json.loads(datos["salida_cruda"]) if datos["salida_cruda"] else {}
        datos["confianza"] = float(datos["confianza"]) if datos["confianza"] is not None else None
        return VisionResultado(**datos)

    async def crear(self, resultado: VisionResultado) -> None:
        pool = await obtener_pool_principal()
        creado_en = await pool.fetchval(
            """
            INSERT INTO vision_resultados
              (id, pieza_id, campana_id, modelo_id, huella_imagen, origen, detecta_logo,
               detecta_texto, manual_marca_ok, confianza, objetos_detectados, salida_cruda, duracion_ms)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            RETURNING creado_en
            """,
            resultado.id,
            resultado.pieza_id,
            resultado.campana_id,
            resultado.modelo_id,
            resultado.huella_imagen,
            resultado.origen,
            resultado.detecta_logo,
            resultado.detecta_texto,
            resultado.manual_marca_ok,
            resultado.confianza,
            json.dumps(resultado.objetos_detectados, default=str),
            json.dumps(resultado.salida_cruda, default=str),
            resultado.duracion_ms,
        )
        resultado.creado_en = creado_en

    async def listar_recientes(self, limite: int = 20) -> list[VisionResultado]:
        pool = await obtener_pool_principal()
        filas = await pool.fetch(
            "SELECT * FROM vision_resultados ORDER BY creado_en DESC LIMIT $1",
            limite,
        )
        salida: list[VisionResultado] = []
        for fila in filas:
            datos = dict(fila)
            datos["objetos_detectados"] = (
                json.loads(datos["objetos_detectados"]) if datos["objetos_detectados"] else []
            )
            datos["salida_cruda"] = (
                json.loads(datos["salida_cruda"]) if datos["salida_cruda"] else {}
            )
            datos["confianza"] = float(datos["confianza"]) if datos["confianza"] is not None else None
            salida.append(VisionResultado(**datos))
        return salida
