from typing import Annotated, Any

from fastapi import APIRouter, Depends, Query

from ..adapters.postgres.auditoria_mcp_repo import AuditoriaMcpRepositorioPg
from ..adapters.seguridad.verificar_jwt import (
    IdentidadAutenticada,
    exigir_rol,
    verificar_jwt,
)

router = APIRouter(prefix="/api/v1")
_repo = AuditoriaMcpRepositorioPg()


@router.get("/mcp/auditoria")
async def listar_auditoria(
    identidad: Annotated[IdentidadAutenticada, Depends(verificar_jwt)],
    page: Annotated[int, Query(ge=1)] = 1,
    size: Annotated[int, Query(ge=1, le=100)] = 20,
) -> dict[str, Any]:
    """Lectura: ejecutivo|gerente — los logs de auditoria son un asunto interno, no de creativos ni clientes."""
    exigir_rol(identidad, {"ejecutivo", "gerente"})
    filas = await _repo.listar(page, size)
    return {"items": filas, "page": page, "size": size}
