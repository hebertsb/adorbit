"""Tarea 6 (ML no supervisado): segmenta las campanas activas con kmeans_campanas y
marca anomalias de gasto con isolation_forest_campanas. Reusa el mismo listado de
consultar_campanas que ya usan los reportes/agentes."""

from __future__ import annotations

from typing import Any
from uuid import UUID

from ..adapters.ml.detector_anomalias import DetectorAnomaliasCampanas
from ..adapters.ml.segmentador_campanas import SegmentadorCampanas
from .consultas_mcp import ConsultasMcp


class SegmentarCampanas:
    def __init__(
        self, consultas: ConsultasMcp, segmentador: SegmentadorCampanas, detector_anomalias: DetectorAnomaliasCampanas
    ) -> None:
        self._consultas = consultas
        self._segmentador = segmentador
        self._detector_anomalias = detector_anomalias

    async def ejecutar(self, *, usuario_id: UUID | None, solo_anomalias: bool = False) -> list[dict[str, Any]]:
        campanas = await self._consultas.consultar_campanas(
            estado="activa", cliente_id=None, desde=None, hasta=None, usuario_id=usuario_id, agente_id=None
        )

        resultado: list[dict[str, Any]] = []
        for c in campanas:
            presupuesto = float(c["presupuesto_total"] or 0)
            gasto = float(c["gasto_actual"] or 0)
            segmento = self._segmentador.segmentar(presupuesto_total=presupuesto, gasto_actual=gasto)
            anomalia = self._detector_anomalias.evaluar(presupuesto_total=presupuesto, gasto_actual=gasto)

            if solo_anomalias and not anomalia["es_anomalia"]:
                continue

            resultado.append(
                {
                    "campana_id": str(c["campana_id"]),
                    "nombre": c["nombre"],
                    "presupuesto_total": presupuesto,
                    "gasto_actual": gasto,
                    **segmento,
                    **anomalia,
                }
            )
        return resultado
