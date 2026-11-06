"""Tarea 6 (ML): inferencias de solo lectura sobre los 3 modelos tabulares
(roi_xgboost, kmeans_campanas, isolation_forest_campanas) -- entrenados por
herramientas/entrenar_modelos_ml.py con datos sinteticos (ver
documentacion/05-decisiones-y-pendientes.md sobre por que). Mismos roles que
/mcp/auditoria: es un asunto interno de analisis, no de creativos ni clientes."""

from __future__ import annotations

from typing import Annotated, Any
from uuid import UUID

from fastapi import APIRouter, Depends, Query

from ..adapters.ml.detector_anomalias import DetectorAnomaliasCampanas
from ..adapters.ml.predictor_riesgo import PredictorRiesgoCliente
from ..adapters.ml.segmentador_campanas import SegmentadorCampanas
from ..adapters.postgres.auditoria_mcp_repo import AuditoriaMcpRepositorioPg
from ..adapters.postgres.vista_mcp_repo import VistaMcpRepositorioPg
from ..adapters.seguridad.verificar_jwt import IdentidadAutenticada, exigir_rol, verificar_jwt
from ..use_cases.consultas_mcp import ConsultasMcp
from ..use_cases.mcp_herramientas import EjecutorHerramientaMcp
from ..use_cases.predecir_riesgo_cliente import PredecirRiesgoCliente
from ..use_cases.segmentar_campanas import SegmentarCampanas

router = APIRouter(prefix="/api/v1/ml")

_ROLES_ML = {"ejecutivo", "gerente"}
_consultas = ConsultasMcp(VistaMcpRepositorioPg(), EjecutorHerramientaMcp(AuditoriaMcpRepositorioPg()))
_predecir_riesgo = PredecirRiesgoCliente(_consultas, PredictorRiesgoCliente())
_segmentar_campanas = SegmentarCampanas(_consultas, SegmentadorCampanas(), DetectorAnomaliasCampanas())


@router.get("/riesgo-cliente/{cliente_id}")
async def riesgo_cliente(
    cliente_id: UUID,
    identidad: Annotated[IdentidadAutenticada, Depends(verificar_jwt)],
) -> dict[str, Any]:
    exigir_rol(identidad, _ROLES_ML)
    return await _predecir_riesgo.ejecutar(cliente_id=str(cliente_id), usuario_id=identidad.usuario_id_uuid)


@router.get("/segmentacion-campanas")
async def segmentacion_campanas(
    identidad: Annotated[IdentidadAutenticada, Depends(verificar_jwt)],
    solo_anomalias: Annotated[bool, Query()] = False,
) -> dict[str, Any]:
    exigir_rol(identidad, _ROLES_ML)
    items = await _segmentar_campanas.ejecutar(
        usuario_id=identidad.usuario_id_uuid,
        solo_anomalias=solo_anomalias,
    )
    return {"items": items}
