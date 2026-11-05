"""Pools de Postgres: uno principal (lectura/escritura del read model, usuario normal
de la app) y otro aparte atado al rol lector_mcp — nunca se comparten, es la frontera
real de seguridad del servidor MCP (ver app/adapters/mcp/).
"""

from __future__ import annotations

import os

import asyncpg

_pool_principal: asyncpg.Pool | None = None
_pool_lector_mcp: asyncpg.Pool | None = None


async def obtener_pool_principal() -> asyncpg.Pool:
    global _pool_principal
    if _pool_principal is None:
        url = os.environ.get("ADORBIT_IA_URL_BD")
        if not url:
            raise RuntimeError("Falta la variable de entorno ADORBIT_IA_URL_BD")
        _pool_principal = await asyncpg.create_pool(url, min_size=1, max_size=5)
    return _pool_principal


async def obtener_pool_lector_mcp() -> asyncpg.Pool:
    """Usuario LOGIN con GRANT lector_mcp, provisionado aparte en Supabase (ver
    README/.env.ejemplo: ADORBIT_IA_URL_BD_LECTOR_MCP). Si todavia no existe, cae de
    vuelta al pool principal — igual se consulta solo vista_mcp_* y se fija
    `SET LOCAL statement_timeout` por conexion como segunda capa de defensa mientras
    el rol real no este provisionado.
    """
    global _pool_lector_mcp
    if _pool_lector_mcp is None:
        url = os.environ.get("ADORBIT_IA_URL_BD_LECTOR_MCP") or os.environ.get("ADORBIT_IA_URL_BD")
        if not url:
            raise RuntimeError("Falta ADORBIT_IA_URL_BD_LECTOR_MCP / ADORBIT_IA_URL_BD")
        _pool_lector_mcp = await asyncpg.create_pool(url, min_size=1, max_size=3)
    return _pool_lector_mcp


async def cerrar_pools() -> None:
    global _pool_principal, _pool_lector_mcp
    if _pool_principal is not None:
        await _pool_principal.close()
        _pool_principal = None
    if _pool_lector_mcp is not None:
        await _pool_lector_mcp.close()
        _pool_lector_mcp = None


async def ping() -> bool:
    try:
        pool = await obtener_pool_principal()
        async with pool.acquire() as conexion:
            await conexion.execute("SELECT 1")
        return True
    except Exception:  # noqa: BLE001 - /listo debe responder no_listo ante CUALQUIER fallo, no solo los esperados
        return False
