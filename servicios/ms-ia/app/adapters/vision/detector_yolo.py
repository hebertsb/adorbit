"""Deteccion de objetos (tarea 6, DL) con dos modelos YOLOv8n reales:
1) yolov8n.pt -- pre-entrenado de Ultralytics sobre COCO-80, sin afinar. Detecta
   objetos genericos reales, pero COCO no tiene clase "logo" ni "texto".
2) yolo_logo_adorbit.pt -- el MISMO yolov8n afinado por
   herramientas/entrenar_yolo_logo.py sobre un dataset sintetico (el logo real de
   AdOrbit compuesto sobre fondos variados, ver generar_dataset_logo.py). Este SI
   aporta un detecta_logo real, no inventado -- aunque entrenado con composiciones
   sinteticas, no fotos de piezas reales (ver D21 en
   documentacion/05-decisiones-y-pendientes.md: la precision en piezas reales
   fotografiadas sera mas baja que la metrica de validacion sintetica).
detecta_texto sigue en None: ningun modelo de aca detecta texto (haria falta OCR, p.
ej. EAST/Tesseract, fuera de alcance de esta pasada).
"""

from __future__ import annotations

import io
from functools import lru_cache
from pathlib import Path
from typing import Any

import numpy as np
from PIL import Image

_RUTA_PESOS_COCO = Path(__file__).parent / "yolov8n.pt"
_RUTA_PESOS_LOGO = Path(__file__).parent / "yolo_logo_adorbit.pt"
_UMBRAL_CONFIANZA = 0.25
_UMBRAL_CONFIANZA_LOGO = 0.5


@lru_cache(maxsize=1)
def _modelo_coco():
    from ultralytics import YOLO

    return YOLO(str(_RUTA_PESOS_COCO))


@lru_cache(maxsize=1)
def _modelo_logo():
    from ultralytics import YOLO

    if not _RUTA_PESOS_LOGO.exists():
        return None
    return YOLO(str(_RUTA_PESOS_LOGO))


def _detecciones(modelo, imagen_np: np.ndarray, umbral: float) -> list[dict[str, Any]]:
    resultados = modelo(imagen_np, conf=umbral, verbose=False)
    r = resultados[0]
    objetos = []
    for caja, conf, cls in zip(r.boxes.xyxy.tolist(), r.boxes.conf.tolist(), r.boxes.cls.tolist()):
        objetos.append(
            {
                "clase": r.names[int(cls)],
                "confianza": round(float(conf), 4),
                "caja_xyxy": [round(v, 1) for v in caja],
            }
        )
    return objetos


class DetectorYolo:
    def detectar(self, bytes_imagen: bytes) -> dict[str, Any]:
        imagen_np = np.array(Image.open(io.BytesIO(bytes_imagen)).convert("RGB"))

        objetos = _detecciones(_modelo_coco(), imagen_np, _UMBRAL_CONFIANZA)

        detecta_logo: bool | None = None
        modelo_logo = _modelo_logo()
        if modelo_logo is not None:
            detecciones_logo = _detecciones(modelo_logo, imagen_np, _UMBRAL_CONFIANZA_LOGO)
            objetos.extend(detecciones_logo)
            detecta_logo = len(detecciones_logo) > 0

        confianza_maxima = max((o["confianza"] for o in objetos), default=0.0)
        return {
            "objetos_detectados": objetos,
            "confianza": confianza_maxima,
            "detecta_logo": detecta_logo,
            # Ningun modelo de aca hace OCR -- se necesitaria uno aparte (fuera de alcance).
            "detecta_texto": None,
        }
