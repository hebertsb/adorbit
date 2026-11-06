"""Tarea 6 (ML supervisado): probabilidad de impago de un cliente, con roi_xgboost.
Trae los datos del cliente via ConsultasMcp (misma frontera auditada que el resto de
ms-ia) y calcula las features exactamente como las espera el modelo entrenado."""

from __future__ import annotations

from datetime import date
from typing import Any
from uuid import UUID

from ..adapters.ml.predictor_riesgo import PredictorRiesgoCliente
from ..domain.errores import ExcepcionDominio
from .consultas_mcp import ConsultasMcp


class PredecirRiesgoCliente:
    def __init__(self, consultas: ConsultasMcp, predictor: PredictorRiesgoCliente) -> None:
        self._consultas = consultas
        self._predictor = predictor

    async def ejecutar(self, *, cliente_id: str, usuario_id: UUID | None) -> dict[str, Any]:
        cliente = await self._consultas.buscar_cliente(cliente_id=cliente_id, usuario_id=usuario_id, agente_id=None)
        if cliente is None:
            raise ExcepcionDominio("cliente_no_encontrado", f"No existe el cliente {cliente_id}")

        limite = float(cliente["linea_credito_limite"] or 0)
        usado = float(cliente["linea_credito_usado"] or 0)
        proporcion_uso = usado / limite if limite > 0 else 0.0

        facturas = await self._consultas.facturas_por_vencer(dias=365, usuario_id=usuario_id, agente_id=None)
        hoy = date.today()
        facturas_cliente_vencidas = [
            f
            for f in facturas
            if str(f["cliente_id"]) == str(cliente_id) and (f.get("dias_vencida") or 0) > 0
        ]
        monto_vencido_total = sum(float(f["total"]) for f in facturas_cliente_vencidas)
        dias_vencida_max = max((f.get("dias_vencida") or 0) for f in facturas_cliente_vencidas) if facturas_cliente_vencidas else 0

        prediccion = self._predictor.predecir(
            proporcion_uso=proporcion_uso,
            linea_credito_limite=limite,
            monto_vencido_total=monto_vencido_total,
            dias_vencida_max=dias_vencida_max,
            facturas_vencidas_count=len(facturas_cliente_vencidas),
        )

        return {
            "cliente_id": str(cliente_id),
            "cliente_nombre": cliente["nombre"],
            "features": {
                "proporcion_uso": round(proporcion_uso, 4),
                "linea_credito_limite": limite,
                "monto_vencido_total": monto_vencido_total,
                "dias_vencida_max": dias_vencida_max,
                "facturas_vencidas_count": len(facturas_cliente_vencidas),
            },
            **prediccion,
            "calculado_en": hoy.isoformat(),
        }
