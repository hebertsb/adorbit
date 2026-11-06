"""Afina YOLOv8n (pesos pre-entrenados COCO) sobre el dataset sintetico de
herramientas/generar_dataset_logo.py para que reconozca el logo REAL de AdOrbit --
ver documentacion/05-decisiones-y-pendientes.md D21.

Uso: python herramientas/generar_dataset_logo.py  (una vez, si no existe el dataset)
     python herramientas/entrenar_yolo_logo.py
"""

from __future__ import annotations

import json
import os
import re
import shutil
import sys
from pathlib import Path
from uuid import uuid4

from ultralytics import YOLO

RAIZ = Path(__file__).resolve().parent.parent
DATASET_YAML = RAIZ / "herramientas" / "_dataset_logo" / "dataset.yaml"
PESOS_BASE = RAIZ / "app" / "adapters" / "vision" / "yolov8n.pt"
PESOS_SALIDA = RAIZ / "app" / "adapters" / "vision" / "yolo_logo_adorbit.pt"
RUTA_METRICAS = RAIZ / "app" / "adapters" / "vision" / "yolo_logo_adorbit.metricas.json"
DIR_ENTRENAMIENTO = RAIZ / "herramientas" / "_runs_entrenamiento"
VERSION = "v1-sintetico"  # modelos_aprendizaje.version es VARCHAR(20)


def _cargar_env() -> None:
    env_path = RAIZ / ".env"
    if not env_path.exists():
        return
    with open(env_path, encoding="utf-8") as f:
        for linea in f:
            m = re.match(r"^([A-Z0-9_]+)=(.*)$", linea.strip())
            if m:
                os.environ.setdefault(m.group(1), m.group(2))


def entrenar() -> dict:
    if not DATASET_YAML.exists():
        print(f"Falta {DATASET_YAML} -- correr primero: python herramientas/generar_dataset_logo.py")
        sys.exit(1)

    modelo = YOLO(str(PESOS_BASE))
    resultado = modelo.train(
        data=str(DATASET_YAML),
        epochs=30,
        imgsz=320,
        batch=16,
        device="cpu",
        project=str(DIR_ENTRENAMIENTO),
        name="logo_adorbit",
        exist_ok=True,
        verbose=False,
        patience=10,
    )

    mejores_pesos = DIR_ENTRENAMIENTO / "logo_adorbit" / "weights" / "best.pt"
    shutil.copy(mejores_pesos, PESOS_SALIDA)

    metricas_dict = resultado.results_dict if hasattr(resultado, "results_dict") else {}
    metricas = {
        "fuente": "yolov8n.pt afinado con dataset sintetico (logo real compuesto sobre fondos procedurales)",
        "mAP50": round(float(metricas_dict.get("metrics/mAP50(B)", 0)), 4),
        "mAP50-95": round(float(metricas_dict.get("metrics/mAP50-95(B)", 0)), 4),
        "precision": round(float(metricas_dict.get("metrics/precision(B)", 0)), 4),
        "recall": round(float(metricas_dict.get("metrics/recall(B)", 0)), 4),
        "limitacion": "entrenado con el logo compuesto sobre fondos sinteticos, no fotos reales de piezas -- reentrenar con piezas reales en cuanto existan",
    }
    RUTA_METRICAS.write_text(json.dumps(metricas, indent=2), encoding="utf-8")
    print("Metricas de validacion:", json.dumps(metricas, indent=2))
    return metricas


async def registrar_en_supabase(metricas: dict) -> None:
    import asyncpg

    url = os.environ["ADORBIT_IA_URL_BD"]
    conexion = await asyncpg.connect(url)
    try:
        await conexion.execute(
            """
            INSERT INTO modelos_aprendizaje (id, nombre, tipo, version, metricas, artefacto_ruta, activo)
            VALUES ($1, 'yolo_logo_adorbit', 'deep_learning', $2, $3, $4, true)
            ON CONFLICT (nombre, version) DO UPDATE SET
              metricas = EXCLUDED.metricas, artefacto_ruta = EXCLUDED.artefacto_ruta, activo = true
            """,
            uuid4(),
            VERSION,
            json.dumps(metricas, default=str),
            f"local:{PESOS_SALIDA.relative_to(RAIZ).as_posix()}",
        )
        print("yolo_logo_adorbit registrado en modelos_aprendizaje")
    finally:
        await conexion.close()


def main() -> None:
    _cargar_env()

    if PESOS_SALIDA.exists() and RUTA_METRICAS.exists() and "--forzar" not in sys.argv:
        metricas = json.loads(RUTA_METRICAS.read_text(encoding="utf-8"))
        print(f"{PESOS_SALIDA.name} ya existe -- se usan sus metricas guardadas (pasa --forzar para reentrenar)")
    else:
        metricas = entrenar()

    if "--sin-db" in sys.argv:
        return
    import asyncio

    asyncio.run(registrar_en_supabase(metricas))


if __name__ == "__main__":
    main()
