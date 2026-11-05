"""Validacion de JWT contra Keycloak (JWKS remoto) — mismo patron que
verificarJwt.ts de ms-creatividades, portado a Python/PyJWT."""

from __future__ import annotations

import os
from dataclasses import dataclass, field
from functools import lru_cache

import jwt
from fastapi import Request
from jwt import PyJWKClient

ROLES_VALIDOS = {"ejecutivo", "creativo", "cliente", "gerente"}


class ErrorAutenticacion(Exception):
    def __init__(self, mensaje: str, status: int = 401) -> None:
        super().__init__(mensaje)
        self.mensaje = mensaje
        self.status = status


@dataclass(slots=True)
class IdentidadAutenticada:
    usuario_id: str
    roles: set[str] = field(default_factory=set)
    cliente_id: str | None = None


@lru_cache(maxsize=1)
def _obtener_cliente_jwks() -> PyJWKClient:
    jwks_uri = os.environ.get("ADORBIT_IA_JWKS_URI")
    if not jwks_uri:
        raise RuntimeError("Falta la variable de entorno ADORBIT_IA_JWKS_URI")
    return PyJWKClient(jwks_uri)


def verificar_jwt(request: Request) -> IdentidadAutenticada:
    return verificar_desde_encabezado(request.headers.get("authorization", ""))


def verificar_desde_encabezado(encabezado: str) -> IdentidadAutenticada:
    """Nucleo reutilizable: lo usa tanto la dependencia FastAPI (verificar_jwt) como
    el middleware ASGI que protege el servidor MCP montado (ver adapters/mcp/servidor.py),
    que no tiene un Request de FastAPI, solo el encabezado crudo."""
    partes = encabezado.split(" ", 1)
    if len(partes) != 2 or partes[0].lower() != "bearer" or not partes[1]:
        raise ErrorAutenticacion("Falta el encabezado Authorization: Bearer <token>")

    token = partes[1]
    try:
        clave_firmante = _obtener_cliente_jwks().get_signing_key_from_jwt(token)
        payload = jwt.decode(
            token,
            clave_firmante.key,
            algorithms=["RS256"],
            audience=os.environ.get("ADORBIT_IA_AUDIENCIA", "ms-ia"),
            issuer=os.environ.get("ADORBIT_IA_EMISOR"),
        )
    except Exception as error:
        raise ErrorAutenticacion("Token invalido o expirado") from error

    sub = payload.get("sub")
    if not sub:
        raise ErrorAutenticacion("El token no tiene subject")

    roles_token = set(payload.get("realm_access", {}).get("roles", []))
    roles = roles_token & ROLES_VALIDOS
    cliente_id = payload.get("cliente_id")

    return IdentidadAutenticada(usuario_id=sub, roles=roles, cliente_id=cliente_id)


def exigir_rol(identidad: IdentidadAutenticada, roles_permitidos: set[str]) -> None:
    if not (identidad.roles & roles_permitidos):
        raise ErrorAutenticacion("No tienes permiso para esta accion", status=403)
