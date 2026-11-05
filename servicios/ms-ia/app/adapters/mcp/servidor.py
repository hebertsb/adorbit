"""Servidor MCP real (SDK oficial `mcp`), montado dentro de la app FastAPI via
Streamable HTTP (ver app/main.py). Las 4 herramientas del contrato — ver
documentacion/03-contratos.md 'MCP (ms-ia)'. Cada llamada pasa por ConsultasMcp, que
valida los parametros y audita en auditoria_mcp (exitosa, fallida o bloqueada) antes
de tocar vista_mcp_* — ver app/use_cases/consultas_mcp.py.
"""

from __future__ import annotations

from typing import Any
from uuid import UUID

from mcp.server.fastmcp import Context, FastMCP
from starlette.responses import JSONResponse
from starlette.types import ASGIApp, Receive, Scope, Send

from ...use_cases.consultas_mcp import ConsultasMcp
from ...use_cases.mcp_herramientas import EjecutorHerramientaMcp
from ..postgres.auditoria_mcp_repo import AuditoriaMcpRepositorioPg
from ..postgres.vista_mcp_repo import VistaMcpRepositorioPg
from ..seguridad.verificar_jwt import (
    ErrorAutenticacion,
    exigir_rol,
    verificar_desde_encabezado,
)

servidor_mcp: FastMCP = FastMCP(name="ms-ia-mcp")

_consultas = ConsultasMcp(VistaMcpRepositorioPg(), EjecutorHerramientaMcp(AuditoriaMcpRepositorioPg()))

# Roles que pueden llamar herramientas MCP — lectura de reportes, mismo criterio que
# /mcp/auditoria (ejecutivo|gerente) mas creativo (agentes futuros los necesitan, tarea 5).
_ROLES_PERMITIDOS_MCP = {"ejecutivo", "gerente", "creativo"}


def _identidad_desde_contexto(ctx: Context) -> tuple[UUID | None, UUID | None]:
    """usuario_id / agente_id para auditoria_mcp. El middleware ya valido el JWT antes
    de llegar aqui (ver MiddlewareJwtMcp); esto solo intenta leer el 'sub' del request
    crudo que trae el contexto, sin volver a verificar la firma. El 'sub' de Keycloak
    es un UUID; si no lo fuera (u otro paso falla), se audita igual con usuario_id=None
    (la columna es nullable) en vez de tumbar la llamada a la herramienta.
    TODO Hebert: agente_id solo aplica cuando la llamada viene de un agente interno
    (tarea 5) — por ahora siempre None.
    """
    try:
        request = ctx.request_context.request
        encabezado = request.headers.get("authorization", "") if request else ""
        identidad = verificar_desde_encabezado(encabezado)
        return UUID(identidad.usuario_id), None
    except Exception:  # noqa: BLE001 - mejor esfuerzo, nunca debe tumbar la llamada a la herramienta
        return None, None


@servidor_mcp.tool()
async def consultar_campanas(
    ctx: Context,
    estado: str | None = None,
    cliente_id: str | None = None,
    desde: str | None = None,
    hasta: str | None = None,
) -> list[dict[str, Any]]:
    """Lista campanas de vista_mcp_campanas, filtradas por estado/cliente/rango de fechas."""
    usuario_id, agente_id = _identidad_desde_contexto(ctx)
    return await _consultas.consultar_campanas(
        estado=estado,
        cliente_id=cliente_id,
        desde=desde,
        hasta=hasta,
        usuario_id=usuario_id,
        agente_id=agente_id,
    )


@servidor_mcp.tool()
async def facturas_por_vencer(ctx: Context, dias: int) -> list[dict[str, Any]]:
    """Facturas no pagadas que vencen dentro de los proximos N dias."""
    usuario_id, agente_id = _identidad_desde_contexto(ctx)
    return await _consultas.facturas_por_vencer(dias=dias, usuario_id=usuario_id, agente_id=agente_id)


@servidor_mcp.tool()
async def clientes_morosos(ctx: Context) -> list[dict[str, Any]]:
    """Clientes cuya linea de credito usada supera el limite."""
    usuario_id, agente_id = _identidad_desde_contexto(ctx)
    return await _consultas.clientes_morosos(usuario_id=usuario_id, agente_id=agente_id)


@servidor_mcp.tool()
async def resumen_gasto_campana(ctx: Context, campana_id: str) -> dict[str, Any] | None:
    """Presupuesto total y gasto actual de una campana."""
    usuario_id, agente_id = _identidad_desde_contexto(ctx)
    return await _consultas.resumen_gasto_campana(
        campana_id=campana_id, usuario_id=usuario_id, agente_id=agente_id
    )


class MiddlewareJwtMcp:
    """Protege el transporte Streamable HTTP del servidor MCP: sin JWT valido, ni
    siquiera se llega a listar/llamar herramientas. Es ASGI puro (no un Depends de
    FastAPI) porque streamable_http_app() es una sub-app montada, fuera del sistema
    de dependencias de FastAPI."""

    def __init__(self, app: ASGIApp) -> None:
        self._app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self._app(scope, receive, send)
            return

        encabezados = dict(scope.get("headers") or [])
        autorizacion = encabezados.get(b"authorization", b"").decode("latin-1")
        try:
            identidad = verificar_desde_encabezado(autorizacion)
            exigir_rol(identidad, _ROLES_PERMITIDOS_MCP)
        except ErrorAutenticacion as error:
            codigo = "no_autenticado" if error.status == 401 else "sin_permiso"
            respuesta = JSONResponse({"codigo": codigo, "mensaje": error.mensaje}, status_code=error.status)
            await respuesta(scope, receive, send)
            return

        await self._app(scope, receive, send)


def crear_app_mcp() -> ASGIApp:
    return MiddlewareJwtMcp(servidor_mcp.streamable_http_app())
