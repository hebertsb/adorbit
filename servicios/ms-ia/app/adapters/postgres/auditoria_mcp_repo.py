from __future__ import annotations

import json
from typing import Any
from uuid import UUID

from .conexion import obtener_pool_principal


class AuditoriaMcpRepositorioPg:
    async def registrar(
        self,
        *,
        agente_id: UUID | None,
        usuario_id: UUID | None,
        herramienta: str,
        parametros: dict[str, Any],
        resultado_resumen: dict[str, Any] | None,
        exito: bool,
        bloqueado: bool,
        motivo_bloqueo: str | None,
        error: str | None,
        duracion_ms: int,
    ) -> None:
        pool = await obtener_pool_principal()
        await pool.execute(
            """
            INSERT INTO auditoria_mcp
              (agente_id, usuario_id, herramienta, parametros, resultado_resumen,
               exito, bloqueado, motivo_bloqueo, error, duracion_ms)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            """,
            agente_id,
            usuario_id,
            herramienta,
            json.dumps(parametros, default=str),
            json.dumps(resultado_resumen, default=str) if resultado_resumen is not None else None,
            exito,
            bloqueado,
            motivo_bloqueo,
            error,
            duracion_ms,
        )

    async def listar(self, pagina: int, tamano: int) -> list[dict[str, Any]]:
        pool = await obtener_pool_principal()
        salto = (pagina - 1) * tamano
        filas = await pool.fetch(
            "SELECT * FROM auditoria_mcp ORDER BY creado_en DESC LIMIT $1 OFFSET $2",
            tamano,
            salto,
        )
        return [dict(fila) for fila in filas]
