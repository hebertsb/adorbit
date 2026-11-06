"""Traduce ExcepcionDominio/ErrorAutenticacion a la respuesta HTTP uniforme del
proyecto `{codigo, mensaje, detalle}` — mismo patron que manejadorErrores.ts en
ms-creatividades, via los exception handlers de FastAPI en vez de try/except por ruta."""

from __future__ import annotations

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from ..adapters.seguridad.verificar_jwt import ErrorAutenticacion
from ..domain.errores import ExcepcionDominio

_STATUS_POR_CODIGO: dict[str, int] = {
    "brief_no_encontrado": 404,
    "pieza_no_encontrada": 404,
    "parametro_invalido": 400,
    "reporte_no_encontrado": 404,
    "idempotencia_conflicto": 409,
    "agente_no_encontrado": 404,
    "cliente_no_encontrado": 404,
    "modelo_no_disponible": 503,
}


def registrar_manejadores_error(app: FastAPI) -> None:
    @app.exception_handler(ErrorAutenticacion)
    async def _manejar_autenticacion(request: Request, error: ErrorAutenticacion) -> JSONResponse:
        codigo = "no_autenticado" if error.status == 401 else "sin_permiso"
        return JSONResponse(
            {"codigo": codigo, "mensaje": error.mensaje, "detalle": None}, status_code=error.status
        )

    @app.exception_handler(ExcepcionDominio)
    async def _manejar_dominio(request: Request, error: ExcepcionDominio) -> JSONResponse:
        status = _STATUS_POR_CODIGO.get(error.codigo, 400)
        return JSONResponse(
            {"codigo": error.codigo, "mensaje": error.mensaje, "detalle": error.detalle}, status_code=status
        )
