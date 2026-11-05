"""Entidades del read model (reporte_*) — ver base_de_datos/ms-ia.postgres.sql.

Son filas desnormalizadas que el consumidor de eventos mantiene al dia; la unica
regla de negocio real es que reporte_campanas no debe retroceder con un evento viejo
(columna ultima_version, "ignora eventos viejos" segun el comentario del esquema).
reporte_clientes y reporte_facturacion no tienen ese campo en el esquema: se
actualizan sin ese guard (el dedupe por id_evento en eventos_procesados ya evita
reprocesar el MISMO evento dos veces; el orden entre tipos de evento distintos no
esta protegido por el esquema tal cual esta escrito).
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime
from decimal import Decimal
from uuid import UUID


@dataclass(slots=True)
class ReporteCampana:
    campana_id: UUID
    cliente_id: UUID
    nombre: str
    estado: str
    presupuesto_total: Decimal
    gasto_actual: Decimal
    fecha_inicio: date | None
    fecha_fin: date | None
    ultima_version: int
    actualizado_en: datetime | None = None

    def es_version_vieja(self, version_entrante: int) -> bool:
        return version_entrante <= self.ultima_version


@dataclass(slots=True)
class ReporteCliente:
    cliente_id: UUID
    nombre: str
    nit: str | None
    estado: str | None
    linea_credito_limite: Decimal | None
    linea_credito_usado: Decimal | None
    actualizado_en: datetime | None = None


@dataclass(slots=True)
class ReporteFacturacion:
    factura_id: UUID
    cliente_id: UUID
    campana_id: UUID | None
    estado: str
    total: Decimal
    moneda: str
    fecha_emision: date | None
    fecha_vencimiento: date | None
    actualizado_en: datetime | None = None
