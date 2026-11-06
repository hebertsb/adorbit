"""Inferencia de isolation_forest_campanas (tarea 6). Mismas features que
_generar_dataset_campanas() del script de entrenamiento."""

from __future__ import annotations

from functools import lru_cache
from pathlib import Path

import joblib

_RUTA_ARTEFACTO = Path(__file__).parent / "artefactos" / "isolation_forest_campanas.joblib"


@lru_cache(maxsize=1)
def _artefacto():
    if not _RUTA_ARTEFACTO.exists():
        raise RuntimeError(
            f"No existe {_RUTA_ARTEFACTO} -- correr 'python herramientas/entrenar_modelos_ml.py' primero"
        )
    return joblib.load(_RUTA_ARTEFACTO)


class DetectorAnomaliasCampanas:
    def evaluar(self, *, presupuesto_total: float, gasto_actual: float) -> dict:
        proporcion = gasto_actual / presupuesto_total if presupuesto_total > 0 else 0.0
        art = _artefacto()
        features_esc = art["escalador"].transform([[presupuesto_total, gasto_actual, proporcion]])
        es_anomalia = bool(art["modelo"].predict(features_esc)[0] == -1)
        puntaje = float(art["modelo"].decision_function(features_esc)[0])  # mas negativo = mas anomalo
        return {"es_anomalia": es_anomalia, "puntaje_anomalia": round(puntaje, 4)}
