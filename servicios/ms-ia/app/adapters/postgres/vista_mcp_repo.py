"""Unica puerta de datos para el servidor MCP: SIEMPRE vista_mcp_*, SIEMPRE SQL
parametrizado, SIEMPRE por la conexion lector_mcp (ver conexion.py), SIEMPRE con un
LIMIT duro y un statement_timeout corto por si el rol real aun no esta provisionado en
Supabase. Nunca se arma una consulta con f-strings/concatenacion — eso es exactamente
lo que "prohibido SQL libre" (CLAUDE.md) prohibe.
"""

from __future__ import annotations

from datetime import date
from typing import Any
from uuid import UUID

from .conexion import obtener_pool_lector_mcp

LIMITE_FILAS = 200
TIMEOUT_CONSULTA = "5s"


async def _consulta(sql: str, *parametros: Any) -> list[dict[str, Any]]:
    pool = await obtener_pool_lector_mcp()
    async with pool.acquire() as conexion, conexion.transaction():
        await conexion.execute(f"SET LOCAL statement_timeout = '{TIMEOUT_CONSULTA}'")
        filas = await conexion.fetch(sql, *parametros)
    return [dict(fila) for fila in filas]


class VistaMcpRepositorioPg:
    async def consultar_campanas(
        self, estado: str | None, cliente_id: UUID | None, desde: date | None, hasta: date | None
    ) -> list[dict[str, Any]]:
        return await _consulta(
            """
            SELECT campana_id, cliente_id, nombre, estado, presupuesto_total, gasto_actual,
                   fecha_inicio, fecha_fin
            FROM vista_mcp_campanas
            WHERE ($1::text IS NULL OR estado = $1)
              AND ($2::uuid IS NULL OR cliente_id = $2)
              AND ($3::date IS NULL OR fecha_inicio >= $3)
              AND ($4::date IS NULL OR fecha_fin <= $4)
            ORDER BY fecha_inicio DESC NULLS LAST
            LIMIT $5
            """,
            estado,
            cliente_id,
            desde,
            hasta,
            LIMITE_FILAS,
        )

    async def facturas_por_vencer(self, dias: int) -> list[dict[str, Any]]:
        return await _consulta(
            """
            SELECT factura_id, cliente_id, estado, total, moneda, fecha_emision,
                   fecha_vencimiento, dias_vencida
            FROM vista_mcp_facturacion
            WHERE estado <> 'PAGADA'
              AND fecha_vencimiento IS NOT NULL
              AND fecha_vencimiento <= CURRENT_DATE + ($1 * INTERVAL '1 day')
            ORDER BY fecha_vencimiento ASC
            LIMIT $2
            """,
            dias,
            LIMITE_FILAS,
        )

    async def clientes_morosos(self) -> list[dict[str, Any]]:
        return await _consulta(
            """
            SELECT cliente_id, nombre, estado, linea_credito_limite, linea_credito_usado
            FROM vista_mcp_clientes
            WHERE linea_credito_usado > linea_credito_limite
            ORDER BY (linea_credito_usado - linea_credito_limite) DESC
            LIMIT $1
            """,
            LIMITE_FILAS,
        )

    async def resumen_gasto_campana(self, campana_id: UUID) -> dict[str, Any] | None:
        filas = await _consulta(
            """
            SELECT campana_id, cliente_id, nombre, estado, presupuesto_total, gasto_actual
            FROM vista_mcp_campanas
            WHERE campana_id = $1
            LIMIT 1
            """,
            campana_id,
        )
        return filas[0] if filas else None
