from __future__ import annotations

from typing import Any
from uuid import UUID

import asyncpg


class EventosProcesadosRepositorioPg:
    async def marcar_si_nuevo(self, id_evento: UUID, tipo_evento: str, conexion: Any) -> bool:
        try:
            await conexion.execute(
                "INSERT INTO eventos_procesados (id_evento, tipo_evento) VALUES ($1, $2)",
                id_evento,
                tipo_evento,
            )
            return True
        except asyncpg.UniqueViolationError:
            return False
