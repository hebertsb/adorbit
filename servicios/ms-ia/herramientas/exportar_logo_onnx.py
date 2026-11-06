"""Exporta yolo_logo_adorbit.pt a ONNX para inferencia on-device en app-movil
(Flutter, paquete flutter_onnxruntime) -- ver D22 en
documentacion/05-decisiones-y-pendientes.md.

Uso: python herramientas/exportar_logo_onnx.py
"""

from __future__ import annotations

import shutil
from pathlib import Path

from ultralytics import YOLO

RAIZ = Path(__file__).resolve().parent.parent
PESOS_PT = RAIZ / "app" / "adapters" / "vision" / "yolo_logo_adorbit.pt"
DESTINO_APP_MOVIL = (
    RAIZ.parent.parent / "aplicaciones" / "app-movil" / "assets" / "modelos" / "yolo_logo_adorbit.onnx"
)
TAMANO_IMG = 320


def main() -> None:
    if not PESOS_PT.exists():
        raise SystemExit(f"Falta {PESOS_PT} -- correr primero herramientas/entrenar_yolo_logo.py")

    modelo = YOLO(str(PESOS_PT))
    ruta_onnx = modelo.export(format="onnx", imgsz=TAMANO_IMG, simplify=True, opset=12)

    DESTINO_APP_MOVIL.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy(ruta_onnx, DESTINO_APP_MOVIL)
    print(f"Copiado a {DESTINO_APP_MOVIL}")


if __name__ == "__main__":
    main()
