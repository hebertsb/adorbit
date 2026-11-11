"""Reportes en lenguaje natural (tarea 4). POST es la primera escritura de ms-ia:
requiere Idempotency-Key como el resto del proyecto (ver documentacion/03-contratos.md
"REST -- convenciones"). Mismos roles que las herramientas MCP (ejecutivo|gerente|
creativo), porque generar un reporte solo llama esas mismas herramientas en nombre del
usuario.
"""

from __future__ import annotations

import json
from typing import Annotated, Any
from uuid import UUID

from fastapi import APIRouter, Depends, Header, Query
from fastapi.responses import Response

from ..adapters.llm.groq_cliente import ClienteGroq
from ..adapters.postgres.auditoria_mcp_repo import AuditoriaMcpRepositorioPg
from ..adapters.postgres.conexion import obtener_pool_principal
from ..adapters.postgres.reporte_generado_repo import ReporteGeneradoRepositorioPg
from ..adapters.postgres.vista_mcp_repo import VistaMcpRepositorioPg
from ..adapters.seguridad.verificar_jwt import IdentidadAutenticada, exigir_rol, verificar_jwt
from ..domain.errores import ExcepcionDominio
from ..domain.reporte_generado import ReporteGenerado
from ..use_cases.compartido.forma_tabla import columna_dto, grafico_dto, titulo_desde_herramienta
from ..use_cases.consultas_mcp import ConsultasMcp
from ..use_cases.exportar_reporte import ExportarReporte
from ..use_cases.generar_reporte import GenerarReporte
from ..use_cases.mcp_herramientas import EjecutorHerramientaMcp

router = APIRouter(prefix="/api/v1")

_ROLES_REPORTES = {"ejecutivo", "gerente", "creativo"}
_repositorio = ReporteGeneradoRepositorioPg()
_consultas = ConsultasMcp(VistaMcpRepositorioPg(), EjecutorHerramientaMcp(AuditoriaMcpRepositorioPg()))
_generar_reporte = GenerarReporte(ClienteGroq(), _consultas, _repositorio)
_exportar_reporte = ExportarReporte(_repositorio)


def _a_dict(reporte: ReporteGenerado) -> dict[str, Any]:
    """Forma del `Reporte` que ya consume aplicaciones/panel-inteligencia (React, ver
    src/api/tipos.ts) -- ver documentacion/05-decisiones-y-pendientes.md D15. `titulo`/
    `interpretacion`/`columnas` (como objetos)/`grafico` se derivan aqui, en la capa de
    API, a partir de los datos crudos del dominio; no se persisten calculados."""
    ultima_herramienta = reporte.herramientas_usadas[-1] if reporte.herramientas_usadas else None
    disponibles = list(reporte.filas[0].keys()) if reporte.filas else list(reporte.columnas)
    parametros: dict[str, Any] = {}
    if ultima_herramienta is not None:
        try:
            parametros = json.loads(ultima_herramienta.get("argumentos") or "{}")
        except (ValueError, TypeError):
            parametros = {}

    return {
        "id": str(reporte.id),
        "pregunta": reporte.pregunta,
        "titulo": titulo_desde_herramienta(
            ultima_herramienta["herramienta"] if ultima_herramienta else None, reporte.pregunta
        ),
        "generado_en": reporte.creado_en.isoformat() if reporte.creado_en else None,
        "interpretacion": {
            "herramienta": ultima_herramienta["herramienta"] if ultima_herramienta else "ninguna",
            "parametros": parametros,
        },
        "columnas": [columna_dto(c) for c in reporte.columnas],
        # Todas las columnas que trajo la herramienta; `columnas` es la seleccion visible
        # (la IA puede recortarla con definir_presentacion y el usuario ajustarla en la UI).
        "columnas_disponibles": [columna_dto(c) for c in disponibles],
        "presentacion_ia": reporte.columnas != disponibles,
        "filas": reporte.filas,
        "grafico": grafico_dto(reporte.columnas, reporte.filas),
        "respuesta_nl": reporte.respuesta_nl,
        "estado": reporte.estado,
    }


@router.post("/reportes", status_code=201)
async def crear_reporte(
    cuerpo: dict[str, Any],
    identidad: Annotated[IdentidadAutenticada, Depends(verificar_jwt)],
    idempotency_key: Annotated[str | None, Header()] = None,
) -> dict[str, Any]:
    exigir_rol(identidad, _ROLES_REPORTES)
    if not idempotency_key:
        raise ExcepcionDominio("idempotency_key_requerida", "Falta el encabezado Idempotency-Key")
    pregunta = cuerpo.get("pregunta")
    if not pregunta or not isinstance(pregunta, str):
        raise ExcepcionDominio("parametro_invalido", "pregunta es obligatoria")

    pool = await obtener_pool_principal()
    async with pool.acquire() as conexion, conexion.transaction():
        reporte = await _generar_reporte.ejecutar(
            pregunta=pregunta,
            usuario_id=identidad.usuario_id_uuid,
            clave_idempotencia=idempotency_key,
            conexion=conexion,
        )
    return _a_dict(reporte)


@router.get("/reportes/{id_reporte}")
async def obtener_reporte(
    id_reporte: UUID, identidad: Annotated[IdentidadAutenticada, Depends(verificar_jwt)]
) -> dict[str, Any]:
    exigir_rol(identidad, _ROLES_REPORTES)
    reporte = await _repositorio.buscar(id_reporte)
    if reporte is None:
        raise ExcepcionDominio("reporte_no_encontrado", "No existe un reporte con ese id")
    return _a_dict(reporte)


@router.get("/reportes/{id_reporte}/exportar")
async def exportar_reporte(
    id_reporte: UUID,
    identidad: Annotated[IdentidadAutenticada, Depends(verificar_jwt)],
    formato: Annotated[str, Query()] = "pdf",
    columnas: Annotated[str | None, Query(max_length=500)] = None,
) -> Response:
    exigir_rol(identidad, _ROLES_REPORTES)
    seleccion = [c.strip() for c in columnas.split(",") if c.strip()] if columnas else None
    contenido, tipo_contenido, nombre_archivo = await _exportar_reporte.ejecutar(
        id_reporte, formato, seleccion
    )
    return Response(
        content=contenido,
        media_type=tipo_contenido,
        headers={"Content-Disposition": f'attachment; filename="{nombre_archivo}"'},
    )
