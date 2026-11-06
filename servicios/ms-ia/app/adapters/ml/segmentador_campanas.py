"""Inferencia de kmeans_campanas (tarea 6). Mismas features que
_generar_dataset_campanas() del script de entrenamiento: [presupuesto_total,
gasto_actual, proporcion_gasto]."""

from __future__ import annotations

from functools import lru_cache
from pathlib import Path

import joblib

_RUTA_ARTEFACTO = Path(__file__).parent / "artefactos" / "kmeans_campanas.joblib"


@lru_cache(maxsize=1)
def _artefacto():
    if not _RUTA_ARTEFACTO.exists():
        raise RuntimeError(
            f"No existe {_RUTA_ARTEFACTO} -- correr 'python herramientas/entrenar_modelos_ml.py' primero"
        )
    return joblib.load(_RUTA_ARTEFACTO)


class SegmentadorCampanas:
    def segmentar(self, *, presupuesto_total: float, gasto_actual: float) -> dict:
        proporcion = gasto_actual / presupuesto_total if presupuesto_total > 0 else 0.0
        art = _artefacto()
        features_esc = art["escalador"].transform([[presupuesto_total, gasto_actual, proporcion]])
        cluster = int(art["modelo"].predict(features_esc)[0])
        return {"cluster": cluster, "segmento": art["nombres_cluster"].get(cluster, f"cluster_{cluster}")}
