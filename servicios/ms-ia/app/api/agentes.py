"""Agentes internos (tarea 5): GET /agentes lista los agentes configurados en la tabla
`agentes`; POST /agentes/{id}/ejecutar es el disparador que usara n8n (cron -> HTTP
Request node -> este endpoint). Mismos roles que /mcp/auditoria (ejecutivo|gerente):
disparar un agente es un asunto interno, no de creativos ni clientes. Primera
escritura ademas de /reportes, mismo patron de Idempotency-Key + transaccion unica."""

from __future__ import annotations

from typing import Annotated, Any
from uuid import UUID

from fastapi import APIRouter, Depends, Header

from ..adapters.postgres.agente_repo import AgenteRepositorioPg, EjecucionAgenteRepositorioPg
from ..adapters.postgres.auditoria_mcp_repo import AuditoriaMcpRepositorioPg
from ..adapters.postgres.conexion import obtener_pool_principal
from ..adapters.postgres.outbox_repo import OutboxEventosRepositorioPg
from ..adapters.postgres.vista_mcp_repo import VistaMcpRepositorioPg
from ..adapters.seguridad.verificar_jwt import IdentidadAutenticada, exigir_rol, verificar_jwt
from ..domain.agente import Agente, EjecucionAgente
from ..domain.errores import ExcepcionDominio
from ..use_cases.consultas_mcp import ConsultasMcp
from ..use_cases.ejecutar_agente import EjecutarAgente
from ..use_cases.mcp_herramientas import EjecutorHerramientaMcp

router = APIRouter(prefix="/api/v1")

_ROLES_AGENTES = {"ejecutivo", "gerente"}
_agentes_repo = AgenteRepositorioPg()
_ejecuciones_repo = EjecucionAgenteRepositorioPg()
_outbox_repo = OutboxEventosRepositorioPg()
_consultas = ConsultasMcp(VistaMcpRepositorioPg(), EjecutorHerramientaMcp(AuditoriaMcpRepositorioPg()))
_ejecutar_agente = EjecutarAgente(_agentes_repo, _ejecuciones_repo, _consultas, _outbox_repo)


def _agente_a_dict(agente: Agente) -> dict[str, Any]:
    return {
        "id": str(agente.id),
        "nombre": agente.nombre,
        "mision": agente.mision,
        "habilidades": agente.habilidades,
        "disparador": agente.disparador,
        "activo": agente.activo,
    }


def _ejecucion_a_dict(ejecucion: EjecucionAgente) -> dict[str, Any]:
    return {
        "id": str(ejecucion.id),
        "agente_id": str(ejecucion.agente_id),
        "disparador": ejecucion.disparador,
        "estado": ejecucion.estado,
        "salida": ejecucion.salida,
        "error": ejecucion.error,
        "started_at": ejecucion.started_at.isoformat() if ejecucion.started_at else None,
        "finished_at": ejecucion.finished_at.isoformat() if ejecucion.finished_at else None,
    }


@router.get("/agentes")
async def listar_agentes(
    identidad: Annotated[IdentidadAutenticada, Depends(verificar_jwt)],
) -> dict[str, Any]:
    exigir_rol(identidad, _ROLES_AGENTES)
    agentes = await _agentes_repo.listar()
    return {"items": [_agente_a_dict(a) for a in agentes]}


@router.post("/agentes/{id_agente}/ejecutar", status_code=201)
async def ejecutar_agente(
    id_agente: UUID,
    identidad: Annotated[IdentidadAutenticada, Depends(verificar_jwt)],
    idempotency_key: Annotated[str | None, Header()] = None,
    cuerpo: dict[str, Any] | None = None,
) -> dict[str, Any]:
    exigir_rol(identidad, _ROLES_AGENTES)
    if not idempotency_key:
        raise ExcepcionDominio("idempotency_key_requerida", "Falta el encabezado Idempotency-Key")
    disparador = (cuerpo or {}).get("disparador") or "manual"

    pool = await obtener_pool_principal()
    async with pool.acquire() as conexion, conexion.transaction():
        ejecucion = await _ejecutar_agente.ejecutar(
            id_agente=id_agente,
            disparador=disparador,
            usuario_id=identidad.usuario_id_uuid,
            clave_idempotencia=idempotency_key,
            conexion=conexion,
        )
    return _ejecucion_a_dict(ejecucion)


@router.get("/agentes/ejecuciones")
async def listar_ejecuciones(
    identidad: Annotated[IdentidadAutenticada, Depends(verificar_jwt)],
    limite: int = 20,
) -> dict[str, Any]:
    exigir_rol(identidad, _ROLES_AGENTES)
    ejecuciones = await _ejecuciones_repo.listar_recientes(limite=limite)
    return {"items": [_ejecucion_a_dict(e) for e in ejecuciones]}


@router.get("/agentes/{id_agente}/ejecuciones")
async def listar_ejecuciones_por_agente(
    id_agente: UUID,
    identidad: Annotated[IdentidadAutenticada, Depends(verificar_jwt)],
    limite: int = 20,
) -> dict[str, Any]:
    exigir_rol(identidad, _ROLES_AGENTES)
    ejecuciones = await _ejecuciones_repo.listar_recientes(limite=limite, id_agente=id_agente)
    return {"items": [_ejecucion_a_dict(e) for e in ejecuciones]}


@router.get("/alertas")
async def listar_alertas(
    identidad: Annotated[IdentidadAutenticada, Depends(verificar_jwt)],
    limite: int = 50,
) -> dict[str, Any]:
    exigir_rol(identidad, _ROLES_AGENTES)
    alertas = await _outbox_repo.listar_alertas(limite=limite)
    return {"items": alertas}
