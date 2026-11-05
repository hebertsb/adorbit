"""Envoltorio comun para toda herramienta MCP: mide duracion y SIEMPRE deja un
registro en auditoria_mcp — exitoso, fallido o bloqueado (README tarea 3: "auditoria
incluye bloqueadas"). Una llamada bloqueada (parametro invalido / intento de
inyeccion) nunca llega a tocar vista_mcp_*: se detecta en la validacion propia (ver
consultas_mcp.py) antes de correr cualquier SQL, y se audita igual.
"""

from __future__ import annotations

import time
from collections.abc import Awaitable, Callable
from typing import Any
from uuid import UUID

from ..domain.errores import ExcepcionDominio
from ..domain.puertos import AuditoriaMcpRepositorio


class EjecutorHerramientaMcp:
    def __init__(self, auditoria: AuditoriaMcpRepositorio) -> None:
        self._auditoria = auditoria

    async def ejecutar(
        self,
        *,
        herramienta: str,
        parametros: dict[str, Any],
        usuario_id: UUID | None,
        agente_id: UUID | None,
        trabajo: Callable[[], Awaitable[Any]],
    ) -> Any:
        inicio = time.monotonic()
        try:
            resultado = await trabajo()
        except ExcepcionDominio as error:
            await self._auditoria.registrar(
                agente_id=agente_id,
                usuario_id=usuario_id,
                herramienta=herramienta,
                parametros=parametros,
                resultado_resumen=None,
                exito=False,
                bloqueado=True,
                motivo_bloqueo=error.codigo,
                error=error.mensaje,
                duracion_ms=_duracion_ms(inicio),
            )
            raise
        except Exception as error:
            await self._auditoria.registrar(
                agente_id=agente_id,
                usuario_id=usuario_id,
                herramienta=herramienta,
                parametros=parametros,
                resultado_resumen=None,
                exito=False,
                bloqueado=False,
                motivo_bloqueo=None,
                error=str(error),
                duracion_ms=_duracion_ms(inicio),
            )
            raise

        await self._auditoria.registrar(
            agente_id=agente_id,
            usuario_id=usuario_id,
            herramienta=herramienta,
            parametros=parametros,
            resultado_resumen=_resumen(resultado),
            exito=True,
            bloqueado=False,
            motivo_bloqueo=None,
            error=None,
            duracion_ms=_duracion_ms(inicio),
        )
        return resultado


def _duracion_ms(inicio: float) -> int:
    return int((time.monotonic() - inicio) * 1000)


def _resumen(resultado: Any) -> dict[str, Any]:
    """Solo conteos/metadatos, nunca filas completas — auditoria_mcp.resultado_resumen es para eso."""
    if isinstance(resultado, list):
        return {"cantidad": len(resultado)}
    if isinstance(resultado, dict):
        return {"encontrado": True}
    if resultado is None:
        return {"encontrado": False}
    return {}
