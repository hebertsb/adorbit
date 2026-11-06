"""Lado de escritura del outbox transaccional -- ver OutboxEventosPuerto. `publicar`
inserta en bandeja_salida_eventos con la MISMA `conexion` (y por lo tanto la misma
transaccion) que el caso de uso que la llama, nunca abre una propia: si la transaccion
hace rollback, el evento tampoco se publica."""

from __future__ import annotations

import json
from typing import Any
from uuid import UUID, uuid4


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
