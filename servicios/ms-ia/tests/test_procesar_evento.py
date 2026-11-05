from __future__ import annotations

from typing import Any
from uuid import UUID, uuid4

import pytest

from app.domain.reporte import ReporteCampana, ReporteCliente, ReporteFacturacion
from app.use_cases.procesar_evento import ProcesarEvento


class EventosProcesadosFalsa:
    def __init__(self) -> None:
        self.vistos: set[UUID] = set()

    async def marcar_si_nuevo(self, id_evento: UUID, tipo_evento: str, conexion: Any) -> bool:
        if id_evento in self.vistos:
            return False
        self.vistos.add(id_evento)
        return True


class ReporteCampanaFalsa:
    def __init__(self) -> None:
        self.guardados: list[ReporteCampana] = []

    async def guardar(self, reporte: ReporteCampana, conexion: Any) -> None:
        self.guardados.append(reporte)

    async def buscar(self, campana_id: UUID) -> ReporteCampana | None:
        return None


class ReporteClienteFalsa:
    def __init__(self) -> None:
        self.guardados: list[ReporteCliente] = []

    async def guardar(self, reporte: ReporteCliente, conexion: Any) -> None:
        self.guardados.append(reporte)


class ReporteFacturacionFalsa:
    def __init__(self) -> None:
        self.guardados: list[ReporteFacturacion] = []

    async def guardar(self, reporte: ReporteFacturacion, conexion: Any) -> None:
        self.guardados.append(reporte)


@pytest.fixture
def entorno() -> tuple[ProcesarEvento, EventosProcesadosFalsa, ReporteCampanaFalsa]:
    eventos = EventosProcesadosFalsa()
    campanas = ReporteCampanaFalsa()
    clientes = ReporteClienteFalsa()
    facturacion = ReporteFacturacionFalsa()
    procesar = ProcesarEvento(eventos, campanas, clientes, facturacion)
    return procesar, eventos, campanas


async def test_procesa_evento_de_campana_nuevo(
    entorno: tuple[ProcesarEvento, EventosProcesadosFalsa, ReporteCampanaFalsa],
) -> None:
    procesar, _eventos, campanas = entorno
    carga = {
        "campana_id": str(uuid4()),
        "cliente_id": str(uuid4()),
        "nombre": "Lanzamiento",
        "estado": "activa",
        "presupuesto_total": "1000.00",
        "gasto_actual": "0",
        "version": 1,
    }

    proceso = await procesar.ejecutar(uuid4(), "CampanaCreada", carga, conexion=None)

    assert proceso is True
    assert len(campanas.guardados) == 1
    assert campanas.guardados[0].nombre == "Lanzamiento"


async def test_evento_duplicado_no_se_reprocesa(
    entorno: tuple[ProcesarEvento, EventosProcesadosFalsa, ReporteCampanaFalsa],
) -> None:
    procesar, _eventos, campanas = entorno
    id_evento = uuid4()
    carga = {"campana_id": str(uuid4()), "cliente_id": str(uuid4()), "nombre": "Lanzamiento", "estado": "activa", "version": 1}

    primera = await procesar.ejecutar(id_evento, "CampanaCreada", carga, conexion=None)
    segunda = await procesar.ejecutar(id_evento, "CampanaCreada", carga, conexion=None)

    assert primera is True
    assert segunda is False
    assert len(campanas.guardados) == 1  # no se duplico la escritura


async def test_evento_de_tipo_desconocido_se_dedupe_sin_fallar(
    entorno: tuple[ProcesarEvento, EventosProcesadosFalsa, ReporteCampanaFalsa],
) -> None:
    procesar, _eventos, _campanas = entorno
    proceso = await procesar.ejecutar(uuid4(), "EventoQueNoExisteTodavia", {}, conexion=None)
    assert proceso is True  # se marca procesado, no explota
