"""Lado de escritura del outbox transaccional -- ver OutboxEventosPuerto. `publicar`
inserta en bandeja_salida_eventos con la MISMA `conexion` (y por lo tanto la misma
transaccion) que el caso de uso que la llama, nunca abre una propia: si la transaccion
hace rollback, el evento tampoco se publica."""

from __future__ import annotations

import json
from typing import Any
from uuid import UUID, uuid4

from .conexion import obtener_pool_principal


class OutboxEventosRepositorioPg:
    async def publicar(
        self,
        *,
        conexion: Any,
        tipo_agregado: str,
        agregado_id: UUID,
        tipo_evento: str,
        carga: dict[str, Any],
    ) -> None:
        await conexion.execute(
            """
            INSERT INTO bandeja_salida_eventos (id, tipo_agregado, agregado_id, tipo_evento, carga)
            VALUES ($1, $2, $3, $4, $5)
            """,
            uuid4(),
            tipo_agregado,
            agregado_id,
            tipo_evento,
            json.dumps(carga, default=str),
        )

    async def listar_alertas(self, limite: int = 50) -> list[dict[str, Any]]:
        pool = await obtener_pool_principal()
        filas = await pool.fetch(
            """
            SELECT id, tipo_evento, agregado_id, carga, creado_en
            FROM bandeja_salida_eventos
            WHERE tipo_evento = 'AlertaCampana'
            ORDER BY creado_en DESC
            LIMIT $1
            """,
            limite,
        )
        alertas = []
        for fila in filas:
            carga = json.loads(fila["carga"]) if isinstance(fila["carga"], str) else dict(fila["carga"])
            alertas.append({
                "id": str(fila["id"]),
                "tipo_evento": fila["tipo_evento"],
                "campana_id": str(fila["agregado_id"]),
                "creado_en": fila["creado_en"].isoformat() if fila["creado_en"] else None,
                **carga,
            })
        return alertas
