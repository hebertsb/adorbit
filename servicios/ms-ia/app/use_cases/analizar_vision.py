"""Tarea 6 (DL): analiza una pieza con el modelo de vision activo. Idempotencia por
CONTENIDO (UNIQUE(pieza_id, huella_imagen, modelo_id) del esquema), no por
Idempotency-Key: re-analizar la misma imagen con el mismo modelo devuelve el resultado
guardado en vez de correr la inferencia de nuevo -- mas robusto que un header elegido
por el cliente para este caso particular (ver domain/vision_resultado.py)."""

from __future__ import annotations

import hashlib
import time
from typing import Any
from uuid import UUID, uuid4

from ..adapters.vision.detector_yolo import DetectorYolo
from ..domain.errores import ExcepcionDominio
from ..domain.puertos import ModeloAprendizajeRepositorio, VisionResultadoRepositorio
from ..domain.vision_resultado import VisionResultado

_NOMBRE_MODELO = "yolo_coco_pretrained"


class AnalizarVision:
    def __init__(
        self,
        modelos: ModeloAprendizajeRepositorio,
        resultados: VisionResultadoRepositorio,
        detector: DetectorYolo,
    ) -> None:
        self._modelos = modelos
        self._resultados = resultados
        self._detector = detector

    async def ejecutar(
        self,
        *,
        pieza_id: UUID,
        bytes_imagen: bytes,
        campana_id: UUID | None,
        origen: str,
    ) -> VisionResultado:
        modelo = await self._modelos.buscar_activo_por_nombre(_NOMBRE_MODELO)
        if modelo is None:
            raise ExcepcionDominio(
                "modelo_no_disponible",
                f"No hay un modelo activo '{_NOMBRE_MODELO}' -- correr herramientas/entrenar_modelos_ml.py",
            )

        huella = hashlib.sha256(bytes_imagen).hexdigest()

        existente = await self._resultados.buscar_por_huella(pieza_id, huella, modelo.id)
        if existente is not None:
            return existente

        inicio = time.monotonic()
        deteccion = self._detector.detectar(bytes_imagen)
        duracion_ms = int((time.monotonic() - inicio) * 1000)

        resultado = VisionResultado(
            id=uuid4(),
            pieza_id=pieza_id,
            campana_id=campana_id,
            modelo_id=modelo.id,
            huella_imagen=huella,
            origen=origen,
            detecta_logo=deteccion["detecta_logo"],
            detecta_texto=deteccion["detecta_texto"],
            manual_marca_ok=None,
            confianza=deteccion["confianza"],
            objetos_detectados=deteccion["objetos_detectados"],
            salida_cruda=deteccion,
            duracion_ms=duracion_ms,
        )
        await self._resultados.crear(resultado)
        return resultado
