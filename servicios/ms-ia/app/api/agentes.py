"""Agentes internos (tarea 5): GET /agentes lista los agentes configurados en la tabla
`agentes`; POST /agentes/{id}/ejecutar es el disparador que usara n8n (cron -> HTTP
Request node -> este endpoint). Mismos roles que /mcp/auditoria (ejecutivo|gerente):
disparar un agente es un asunto interno, no de creativos ni clientes. Primera
escritura ademas de /reportes, mismo patron de Idempotency-Key + transaccion unica."""

from __future__ import annotations

import os
from typing import Annotated, Any
from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends, Header

from ..adapters.notificaciones.webhook_notificador import notificar_evento_multicanal
from ..adapters.postgres.agente_repo import AgenteRepositorioPg, EjecucionAgenteRepositorioPg
from ..adapters.postgres.auditoria_mcp_repo import AuditoriaMcpRepositorioPg
from ..adapters.postgres.conexion import obtener_pool_principal
from ..adapters.postgres.outbox_repo import OutboxEventosRepositorioPg
from ..adapters.postgres.vision_resultado_repo import VisionResultadoRepositorioPg
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
_vision_repo = VisionResultadoRepositorioPg()
_consultas = ConsultasMcp(VistaMcpRepositorioPg(), EjecutorHerramientaMcp(AuditoriaMcpRepositorioPg()))
_ejecutar_agente = EjecutarAgente(_agentes_repo, _ejecuciones_repo, _consultas, _outbox_repo, _vision_repo)

_NOMBRES_AGENTES = {
    "monitor_campanas": "Monitor de Campañas",
    "cobranza": "Agente de Cobranza",
    "agente_vision": "Agente de Visión (DL)",
    "consultor_ejecutivo_nl": "Consultor Ejecutivo IA (MCP)",
}


def _construir_datos_notificacion(agente_nombre: str, ejecucion: EjecucionAgente) -> tuple[str, str, dict[str, Any]]:
    salida = ejecucion.salida or {}
    nombre_amigable = _NOMBRES_AGENTES.get(agente_nombre, agente_nombre.replace("_", " ").title())
    resumen = str(salida.get("resumen_texto") or "Ejecución completada correctamente.")

    if agente_nombre == "monitor_campanas":
        tipo_alerta = "alerta_campana"
        metricas = (
            f"{salida.get('campanas_revisadas', 0)} campañas auditadas · "
            f"{len(salida.get('alertas_generadas') or [])} alertas generadas"
        )
    elif agente_nombre == "cobranza":
        tipo_alerta = "cobranza"
        metricas = (
            f"{salida.get('total_vencidas', 0)} vencidas · "
            f"{salida.get('total_por_vencer', 0)} por vencer · "
            f"{salida.get('total_morosos', 0)} en mora"
        )
    elif agente_nombre == "agente_vision":
        tipo_alerta = "auditoria_vision"
        metricas = (
            f"{salida.get('piezas_auditadas', 0)} piezas · "
            f"{salida.get('conformes_marca', 0)} conformes · "
            f"Confianza {salida.get('confianza_promedio_pct', 0)}%"
        )
    else:
        tipo_alerta = "analisis_ia"
        metricas = (
            f"{salida.get('campanas_totales', 0)} campañas · "
            f"Ejecución {salida.get('ejecucion_global_pct', 0)}% · "
            f"{salida.get('facturas_pendientes_30d', 0)} facturas pendientes"
        )

    datos = {
        "agente": nombre_amigable,
        "estado": "Completada" if ejecucion.estado == "exitosa" else ejecucion.estado,
        "resumen": resumen,
        "metricas_clave": metricas,
        "referencia": f"EJ-{str(ejecucion.id)[:8].upper()}",
    }
    return tipo_alerta, nombre_amigable, datos


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
    background_tasks: BackgroundTasks,
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

    agente = await _agentes_repo.buscar(id_agente)
    agente_nombre = agente.nombre if agente else "agente"
    tipo_alerta, nombre_amigable, datos_notif = _construir_datos_notificacion(agente_nombre, ejecucion)
    url_publica = os.getenv("ADORBIT_PUBLIC_URL", "http://4.151.177.116").rstrip("/")
    background_tasks.add_task(
        notificar_evento_multicanal,
        tipo=tipo_alerta,
        titulo=f"{nombre_amigable}: reporte completado",
        datos=datos_notif,
        enlace_accion=f"{url_publica}/dashboard",
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
