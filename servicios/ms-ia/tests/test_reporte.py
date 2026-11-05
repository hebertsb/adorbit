from datetime import datetime
from decimal import Decimal
from uuid import uuid4

from app.domain.reporte import ReporteCampana


def _reporte(ultima_version: int) -> ReporteCampana:
    return ReporteCampana(
        campana_id=uuid4(),
        cliente_id=uuid4(),
        nombre="Lanzamiento",
        estado="activa",
        presupuesto_total=Decimal("1000.00"),
        gasto_actual=Decimal("500.00"),
        fecha_inicio=None,
        fecha_fin=None,
        ultima_version=ultima_version,
        actualizado_en=datetime.now(),
    )


def test_version_igual_es_vieja() -> None:
    assert _reporte(ultima_version=3).es_version_vieja(3) is True


def test_version_menor_es_vieja() -> None:
    assert _reporte(ultima_version=3).es_version_vieja(2) is True


def test_version_mayor_no_es_vieja() -> None:
    assert _reporte(ultima_version=3).es_version_vieja(4) is False
