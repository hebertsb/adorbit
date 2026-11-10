"""Tarea 6 (DL): POST /vision/analizar -- recibe una imagen de pieza y corre deteccion
de objetos real con YOLOv8n (pre-entrenado, ver adapters/vision/detector_yolo.py).
Idempotente por contenido (huella SHA-256), no por Idempotency-Key -- ver
use_cases/analizar_vision.py."""

from __future__ import annotations

import os
from typing import Annotated, Any
from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, UploadFile

from ..adapters.notificaciones.webhook_notificador import notificar_evento_multicanal
from ..adapters.postgres.modelo_ml_repo import ModeloAprendizajeRepositorioPg
from ..adapters.postgres.vision_resultado_repo import VisionResultadoRepositorioPg
from ..adapters.seguridad.verificar_jwt import IdentidadAutenticada, exigir_rol, verificar_jwt
from ..adapters.vision.detector_yolo import DetectorYolo
from ..domain.errores import ExcepcionDominio
from ..domain.vision_resultado import VisionResultado
from ..use_cases.analizar_vision import AnalizarVision

router = APIRouter(prefix="/api/v1")

_ROLES_VISION = {"ejecutivo", "gerente", "creativo"}
_ORIGENES_VALIDOS = {"web_local", "movil_local", "servidor"}
_MIME_PERMITIDOS = {"image/jpeg", "image/png"}
_TAMANO_MAXIMO_BYTES = 10 * 1024 * 1024

_analizar_vision = AnalizarVision(ModeloAprendizajeRepositorioPg(), VisionResultadoRepositorioPg(), DetectorYolo())


def _a_dict(resultado: VisionResultado) -> dict[str, Any]:
    return {
        "id": str(resultado.id),
        "pieza_id": str(resultado.pieza_id),
        "campana_id": str(resultado.campana_id) if resultado.campana_id else None,
        "modelo_id": str(resultado.modelo_id),
        "huella_imagen": resultado.huella_imagen,
        "origen": resultado.origen,
        "detecta_logo": resultado.detecta_logo,
        "detecta_texto": resultado.detecta_texto,
        "manual_marca_ok": resultado.manual_marca_ok,
        "confianza": resultado.confianza,
        "objetos_detectados": resultado.objetos_detectados,
        "duracion_ms": resultado.duracion_ms,
        "creado_en": resultado.creado_en.isoformat() if resultado.creado_en else None,
    }


@router.post("/vision/analizar", status_code=201)
async def analizar(
    identidad: Annotated[IdentidadAutenticada, Depends(verificar_jwt)],
    pieza_id: Annotated[UUID, Form()],
    archivo: Annotated[UploadFile, File()],
    background_tasks: BackgroundTasks,
    campana_id: Annotated[UUID | None, Form()] = None,
    origen: Annotated[str, Form()] = "servidor",
) -> dict[str, Any]:
    exigir_rol(identidad, _ROLES_VISION)
    if origen not in _ORIGENES_VALIDOS:
        raise ExcepcionDominio("parametro_invalido", f"origen debe ser uno de {sorted(_ORIGENES_VALIDOS)}")
    if archivo.content_type not in _MIME_PERMITIDOS:
        raise ExcepcionDominio("parametro_invalido", f"mime no soportado: {archivo.content_type}")

    bytes_imagen = await archivo.read()
    if len(bytes_imagen) > _TAMANO_MAXIMO_BYTES:
        raise ExcepcionDominio("parametro_invalido", "la imagen supera el tamano maximo (10 MB)")

    resultado = await _analizar_vision.ejecutar(
        pieza_id=pieza_id, bytes_imagen=bytes_imagen, campana_id=campana_id, origen=origen
    )

    confianza_pct = f"{round((resultado.confianza or 0) * 100, 1)}%"
    estado_logo = "Logo AdOrbit Detectado" if resultado.detecta_logo else "Sin logo detectado"
    background_tasks.add_task(
        notificar_evento_multicanal,
        tipo="analisis_ia",
        titulo=f"Auditoría Visual de Creatividad: {estado_logo} ({confianza_pct})",
        datos={
            "pieza_id": str(resultado.pieza_id),
            "campaña_id": str(resultado.campana_id) if resultado.campana_id else "N/A",
            "detecta_logo": "SÍ" if resultado.detecta_logo else "NO",
            "confianza": confianza_pct,
            "manual_marca": "CONFORME" if resultado.manual_marca_ok else "REVISIÓN",
            "objetos": ", ".join(resultado.objetos_detectados[:4]) if resultado.objetos_detectados else "Ninguno",
            "duración": f"{resultado.duracion_ms} ms",
        },
        enlace_accion=f"{os.getenv('ADORBIT_PUBLIC_URL', 'http://4.151.177.116').rstrip('/')}/creatividades",
    )

    return _a_dict(resultado)
