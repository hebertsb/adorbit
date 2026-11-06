"""Tarea 6 (ML/DL) -- entrena los 3 modelos tabulares y los registra en
modelos_aprendizaje contra el Supabase real.

NO hay datos reales de produccion todavia (el sistema recien se esta probando, ver
documentacion/05-decisiones-y-pendientes.md) -- los datasets de entrenamiento son
SINTETICOS pero con la misma forma/rango que las columnas reales de reporte_clientes/
reporte_facturacion/reporte_campanas, con ruido y casos limite genuinos (no un
problema trivial de 100% de exactitud). Cuando haya datos reales acumulados, este
mismo script se reentrena con una consulta real en vez de los generadores sinteticos
de abajo -- el pipeline (features -> modelo -> metricas -> registro) no cambia.

Uso: python herramientas/entrenar_modelos_ml.py
Requiere las mismas variables de entorno que el servicio (ADORBIT_IA_URL_BD) para
registrar los modelos en la tabla real.
"""

from __future__ import annotations

import json
import os
import re
import sys
from pathlib import Path
from uuid import uuid4

import joblib
import numpy as np
from sklearn.cluster import KMeans
from sklearn.ensemble import IsolationForest
from sklearn.metrics import accuracy_score, roc_auc_score, silhouette_score
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from xgboost import XGBClassifier

RAIZ = Path(__file__).resolve().parent.parent
ARTEFACTOS = RAIZ / "app" / "adapters" / "ml" / "artefactos"
ARTEFACTOS.mkdir(parents=True, exist_ok=True)

RNG = np.random.default_rng(42)
VERSION = "v1-sintetico"


def _cargar_env() -> None:
    env_path = RAIZ / ".env"
    if not env_path.exists():
        return
    with open(env_path, encoding="utf-8") as f:
        for linea in f:
            m = re.match(r"^([A-Z0-9_]+)=(.*)$", linea.strip())
            if m:
                os.environ.setdefault(m.group(1), m.group(2))


def _generar_dataset_clientes(n: int = 600) -> tuple[np.ndarray, np.ndarray]:
    """Columnas: [proporcion_uso, linea_credito_limite, monto_vencido_total,
    dias_vencida_max, facturas_vencidas_count]. Etiqueta: impago (1/0)."""
    limite = RNG.uniform(5_000, 100_000, n)
    proporcion_uso = np.clip(RNG.beta(2, 3, n) * 1.15, 0, 1.4)
    facturas_vencidas = RNG.poisson(1.0, n)
    dias_vencida_max = np.where(facturas_vencidas > 0, RNG.integers(1, 120, n), 0)
    monto_vencido = facturas_vencidas * RNG.uniform(500, 5_000, n)

    riesgo = (proporcion_uso > 0.95).astype(int) + (dias_vencida_max > 60).astype(int)
    impago = (riesgo >= 1).astype(int)
    ruido = RNG.random(n) < 0.06
    impago = np.where(ruido, 1 - impago, impago)

    X = np.column_stack([proporcion_uso, limite, monto_vencido, dias_vencida_max, facturas_vencidas])
    return X, impago


def _generar_dataset_campanas(n: int = 400) -> tuple[np.ndarray, np.ndarray]:
    """Columnas: [presupuesto_total, gasto_actual, proporcion_gasto]. Devuelve
    tambien una mascara de cuales son anomalias inyectadas (para medir recall)."""
    presupuesto = RNG.uniform(1_000, 50_000, n)
    proporcion = np.clip(RNG.normal(0.5, 0.18, n), 0.02, 1.0)
    gasto = presupuesto * proporcion

    n_anom = max(1, int(n * 0.05))
    idx_anom = RNG.choice(n, n_anom, replace=False)
    gasto[idx_anom] = presupuesto[idx_anom] * RNG.uniform(1.4, 2.8, n_anom)
    proporcion[idx_anom] = gasto[idx_anom] / presupuesto[idx_anom]

    es_anomalia = np.zeros(n, dtype=int)
    es_anomalia[idx_anom] = 1

    X = np.column_stack([presupuesto, gasto, proporcion])
    return X, es_anomalia


def entrenar_roi_xgboost() -> dict:
    X, y = _generar_dataset_clientes()
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.25, random_state=42, stratify=y)

    modelo = XGBClassifier(
        n_estimators=120,
        max_depth=4,
        learning_rate=0.1,
        eval_metric="logloss",
        random_state=42,
    )
    modelo.fit(X_train, y_train)

    pred = modelo.predict(X_test)
    prob = modelo.predict_proba(X_test)[:, 1]
    metricas = {
        "exactitud": round(float(accuracy_score(y_test, pred)), 4),
        "auc_roc": round(float(roc_auc_score(y_test, prob)), 4),
        "n_entrenamiento": len(X_train),
        "n_prueba": len(X_test),
        "features": ["proporcion_uso", "linea_credito_limite", "monto_vencido_total", "dias_vencida_max", "facturas_vencidas_count"],
    }

    ruta = ARTEFACTOS / "roi_xgboost.joblib"
    joblib.dump(modelo, ruta)
    print("roi_xgboost ->", metricas)
    return {"nombre": "roi_xgboost", "tipo": "supervisado", "ruta": ruta, "metricas": metricas}


def entrenar_kmeans_campanas() -> dict:
    X, _ = _generar_dataset_campanas()
    escalador = StandardScaler().fit(X)
    X_esc = escalador.transform(X)

    modelo = KMeans(n_clusters=3, random_state=42, n_init=10)
    etiquetas = modelo.fit_predict(X_esc)

    # Nombrar cada cluster por su proporcion de gasto promedio (feature index 2).
    centros_originales = escalador.inverse_transform(modelo.cluster_centers_)
    orden = np.argsort(centros_originales[:, 2])
    nombres_cluster = {int(orden[0]): "bajo_consumo", int(orden[1]): "saludable", int(orden[2]): "cerca_del_limite"}

    metricas = {
        "silueta": round(float(silhouette_score(X_esc, etiquetas)), 4),
        "n_entrenamiento": len(X),
        "n_clusters": 3,
        "nombres_cluster": nombres_cluster,
        "features": ["presupuesto_total", "gasto_actual", "proporcion_gasto"],
    }

    ruta = ARTEFACTOS / "kmeans_campanas.joblib"
    joblib.dump({"escalador": escalador, "modelo": modelo, "nombres_cluster": nombres_cluster}, ruta)
    print("kmeans_campanas ->", metricas)
    return {"nombre": "kmeans_campanas", "tipo": "no_supervisado", "ruta": ruta, "metricas": metricas}


def entrenar_isolation_forest_campanas() -> dict:
    X, es_anomalia = _generar_dataset_campanas()
    escalador = StandardScaler().fit(X)
    X_esc = escalador.transform(X)

    modelo = IsolationForest(contamination=0.05, random_state=42, n_estimators=150)
    modelo.fit(X_esc)

    prediccion = modelo.predict(X_esc)  # -1 = anomalia, 1 = normal
    detectadas = prediccion == -1
    verdaderos_positivos = int(np.sum(detectadas & (es_anomalia == 1)))
    recall_anomalias_inyectadas = (
        round(verdaderos_positivos / int(es_anomalia.sum()), 4) if es_anomalia.sum() > 0 else None
    )

    metricas = {
        "n_entrenamiento": len(X),
        "contaminacion_configurada": 0.05,
        "anomalias_detectadas": int(detectadas.sum()),
        "recall_sobre_anomalias_inyectadas": recall_anomalias_inyectadas,
        "features": ["presupuesto_total", "gasto_actual", "proporcion_gasto"],
    }

    ruta = ARTEFACTOS / "isolation_forest_campanas.joblib"
    joblib.dump({"escalador": escalador, "modelo": modelo}, ruta)
    print("isolation_forest_campanas ->", metricas)
    return {"nombre": "isolation_forest_campanas", "tipo": "no_supervisado", "ruta": ruta, "metricas": metricas}


def registrar_yolo_pretrenado() -> dict:
    """No se entrena nada aqui -- YOLOv8n viene PRE-ENTRENADO sobre COCO-80 (pesos
    oficiales de Ultralytics). Se registra igual en modelos_aprendizaje para que
    vision_resultados.modelo_id tenga a que apuntar, dejando claro en las metricas que
    es generico (no reconoce el logo real de AdOrbit) hasta que haya piezas reales
    etiquetadas para afinarlo -- ver app/adapters/vision/detector_yolo.py."""
    ruta_pesos = RAIZ / "app" / "adapters" / "vision" / "yolov8n.pt"
    metricas = {
        "fuente": "pesos oficiales de Ultralytics (COCO-80), sin afinar",
        "map50_95_coco_oficial": 0.373,
        "limitacion": "COCO no tiene clases logo/texto -- detecta_logo y detecta_texto quedan en null; objetos_detectados si es deteccion real",
    }
    return {"nombre": "yolo_coco_pretrained", "tipo": "deep_learning", "ruta": ruta_pesos, "metricas": metricas}


async def registrar_en_supabase(resultados: list[dict]) -> None:
    import asyncpg

    url = os.environ["ADORBIT_IA_URL_BD"]
    conexion = await asyncpg.connect(url)
    try:
        for r in resultados:
            await conexion.execute(
                """
                INSERT INTO modelos_aprendizaje (id, nombre, tipo, version, metricas, artefacto_ruta, activo)
                VALUES ($1, $2, $3, $4, $5, $6, true)
                ON CONFLICT (nombre, version) DO UPDATE SET
                  metricas = EXCLUDED.metricas,
                  artefacto_ruta = EXCLUDED.artefacto_ruta,
                  activo = true
                """,
                uuid4(),
                r["nombre"],
                r["tipo"],
                VERSION,
                json.dumps(r["metricas"], default=str),
                f"local:{r['ruta'].relative_to(RAIZ).as_posix()}",
            )
        print(f"{len(resultados)} modelos registrados en modelos_aprendizaje (version={VERSION})")
    finally:
        await conexion.close()


def main() -> None:
    _cargar_env()
    resultados = [
        entrenar_roi_xgboost(),
        entrenar_kmeans_campanas(),
        entrenar_isolation_forest_campanas(),
    ]

    yolo_info = registrar_yolo_pretrenado()
    if not yolo_info["ruta"].exists():
        print("Descargando pesos de yolov8n.pt (primera vez)...")
        from ultralytics import YOLO

        YOLO(str(yolo_info["ruta"]))
    resultados.append(yolo_info)

    if "--sin-db" in sys.argv:
        print("--sin-db: artefactos guardados localmente, NO registrados en Supabase")
        return

    import asyncio

    asyncio.run(registrar_en_supabase(resultados))


if __name__ == "__main__":
    main()
