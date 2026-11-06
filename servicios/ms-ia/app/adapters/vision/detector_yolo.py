"""Deteccion de objetos (tarea 6, DL) con YOLOv8n PRE-ENTRENADO (pesos oficiales de
Ultralytics sobre COCO-80, se descargan solos la primera vez si faltan). Es real
inferencia de una red neuronal de verdad, pero COCO no tiene clases "logo" ni "texto"
-- por eso detecta_logo/detecta_texto quedan en None aqui, nunca inventados. Para
detectar el logo/manual de marca real de AdOrbit hace falta entrenar (o afinar) con
piezas reales etiquetadas, que todavia no existen (ver
documentacion/05-decisiones-y-pendientes.md). objetos_detectados SI es real: las
clases/cajas/confianza que la red encontro de verdad en la imagen.
"""

from __future__ import annotations

import io
from functools import lru_cache
from pathlib import Path
from typing import Any

import numpy as np
from PIL import Image

_RUTA_PESOS = Path(__file__).parent / "yolov8n.pt"
_UMBRAL_CONFIANZA = 0.25


@lru_cache(maxsize=1)
def _modelo():
    from ultralytics import YOLO

    return YOLO(str(_RUTA_PESOS))


class DetectorYolo:
    def detectar(self, bytes_imagen: bytes) -> dict[str, Any]:
        imagen = Image.open(io.BytesIO(bytes_imagen)).convert("RGB")
        modelo = _modelo()
        resultados = modelo(np.array(imagen), conf=_UMBRAL_CONFIANZA, verbose=False)
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

        confianza_maxima = max((o["confianza"] for o in objetos), default=0.0)
        return {
            "objetos_detectados": objetos,
            "confianza": confianza_maxima,
            # COCO-80 no tiene clases "logo"/"texto" -- no inventar un valor aqui.
            "detecta_logo": None,
            "detecta_texto": None,
        }
