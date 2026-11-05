"""Repos de las 3 tablas reporte_* — ver base_de_datos/ms-ia.postgres.sql.

reporte_campanas usa UPSERT con un WHERE que compara ultima_version: la fila base de
datos decide atomicamente si el evento entrante es mas nuevo, sin necesidad de leer
primero (evita una condicion de carrera entre el SELECT y el UPDATE).
"""

from __future__ import annotations

from typing import Any
from uuid import UUID

from ...domain.reporte import ReporteCampana, ReporteCliente, ReporteFacturacion
from .conexion import obtener_pool_principal


class ReporteCampanaRepositorioPg:
    async def guardar(self, reporte: ReporteCampana, conexion: Any) -> None:
        await conexion.execute(
            """
            INSERT INTO reporte_campanas
              (campana_id, cliente_id, nombre, estado, presupuesto_total, gasto_actual,
               fecha_inicio, fecha_fin, ultima_version, actualizado_en)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, now())
            ON CONFLICT (campana_id) DO UPDATE SET
              cliente_id = EXCLUDED.cliente_id,
              nombre = EXCLUDED.nombre,
              estado = EXCLUDED.estado,
              presupuesto_total = EXCLUDED.presupuesto_total,
              gasto_actual = EXCLUDED.gasto_actual,
              fecha_inicio = EXCLUDED.fecha_inicio,
              fecha_fin = EXCLUDED.fecha_fin,
              ultima_version = EXCLUDED.ultima_version,
              actualizado_en = now()
            WHERE reporte_campanas.ultima_version < EXCLUDED.ultima_version
            """,
            reporte.campana_id,
            reporte.cliente_id,
            reporte.nombre,
            reporte.estado,
            reporte.presupuesto_total,
            reporte.gasto_actual,
            reporte.fecha_inicio,
            reporte.fecha_fin,
            reporte.ultima_version,
        )

    async def buscar(self, campana_id: UUID) -> ReporteCampana | None:
        pool = await obtener_pool_principal()
        fila = await pool.fetchrow("SELECT * FROM reporte_campanas WHERE campana_id = $1", campana_id)
        if fila is None:
            return None
        return ReporteCampana(**dict(fila))


class ReporteClienteRepositorioPg:
    async def guardar(self, reporte: ReporteCliente, conexion: Any) -> None:
        await conexion.execute(
            """
            INSERT INTO reporte_clientes
              (cliente_id, nombre, nit, estado, linea_credito_limite, linea_credito_usado, actualizado_en)
            VALUES ($1, $2, $3, $4, $5, $6, now())
            ON CONFLICT (cliente_id) DO UPDATE SET
              nombre = EXCLUDED.nombre,
              nit = EXCLUDED.nit,
              estado = EXCLUDED.estado,
              linea_credito_limite = EXCLUDED.linea_credito_limite,
              linea_credito_usado = EXCLUDED.linea_credito_usado,
              actualizado_en = now()
            """,
            reporte.cliente_id,
            reporte.nombre,
            reporte.nit,
            reporte.estado,
            reporte.linea_credito_limite,
            reporte.linea_credito_usado,
        )


class ReporteFacturacionRepositorioPg:
    async def guardar(self, reporte: ReporteFacturacion, conexion: Any) -> None:
        await conexion.execute(
            """
            INSERT INTO reporte_facturacion
              (factura_id, cliente_id, campana_id, estado, total, moneda, fecha_emision,
               fecha_vencimiento, actualizado_en)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, now())
            ON CONFLICT (factura_id) DO UPDATE SET
              cliente_id = EXCLUDED.cliente_id,
              campana_id = EXCLUDED.campana_id,
              estado = EXCLUDED.estado,
              total = EXCLUDED.total,
              moneda = EXCLUDED.moneda,
              fecha_emision = EXCLUDED.fecha_emision,
              fecha_vencimiento = EXCLUDED.fecha_vencimiento,
              actualizado_en = now()
            """,
            reporte.factura_id,
            reporte.cliente_id,
            reporte.campana_id,
            reporte.estado,
            reporte.total,
            reporte.moneda,
            reporte.fecha_emision,
            reporte.fecha_vencimiento,
        )
