"""Inferencia de roi_xgboost (tarea 6) -- el artefacto lo genera
herramientas/entrenar_modelos_ml.py; este adaptador solo lo carga (cacheado, una vez
por proceso) y predice. El orden de las features DEBE coincidir exactamente con
_generar_dataset_clientes() del script de entrenamiento."""

from __future__ import annotations

from functools import lru_cache
from pathlib import Path

import joblib

_RUTA_ARTEFACTO = Path(__file__).parent / "artefactos" / "roi_xgboost.joblib"


@lru_cache(maxsize=1)
def _modelo():
    if not _RUTA_ARTEFACTO.exists():
        raise RuntimeError(
            f"No existe {_RUTA_ARTEFACTO} -- correr 'python herramientas/entrenar_modelos_ml.py' primero"
        )
    return joblib.load(_RUTA_ARTEFACTO)


class PredictorRiesgoCliente:
    def predecir(
        self,
        *,
        proporcion_uso: float,
        linea_credito_limite: float,
        monto_vencido_total: float,
        dias_vencida_max: float,
        facturas_vencidas_count: int,
    ) -> dict:
        features = [[proporcion_uso, linea_credito_limite, monto_vencido_total, dias_vencida_max, facturas_vencidas_count]]
        probabilidad = float(_modelo().predict_proba(features)[0][1])
        return {
            "probabilidad_impago": round(probabilidad, 4),
            "nivel_riesgo": "alto" if probabilidad >= 0.6 else ("medio" if probabilidad >= 0.3 else "bajo"),
        }
