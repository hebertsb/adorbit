"""Error de dominio con un codigo estable — mismo patron que ExcepcionDominio en
ms-creatividades: la capa HTTP/MCP decide el status/respuesta a partir del codigo,
nunca del tipo de excepcion."""

from __future__ import annotations

from typing import Any


class ExcepcionDominio(Exception):
    def __init__(self, codigo: str, mensaje: str, detalle: Any | None = None) -> None:
        super().__init__(mensaje)
        self.codigo = codigo
        self.mensaje = mensaje
        self.detalle = detalle
