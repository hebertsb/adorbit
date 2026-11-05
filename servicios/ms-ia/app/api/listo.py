from fastapi import APIRouter
from fastapi.responses import JSONResponse

from ..adapters.postgres.conexion import ping

router = APIRouter()


@router.get("/listo")
async def listo() -> JSONResponse:
    """Readiness: el proceso puede atender trafico (incluye ping real a Postgres). Publico, sin JWT."""
    if await ping():
        return JSONResponse({"estado": "ok"})
    return JSONResponse({"estado": "no_listo"}, status_code=503)
