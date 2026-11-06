"""Exporta un ReporteGenerado ya persistido a PDF o Excel. Si las filas tienen la
forma simple columna-de-texto + columna-numerica, se agrega un grafico de barras
nativo de cada libreria (sin matplotlib -- mas liviano para un plan gratuito de
despliegue); si no, se deja solo la tabla.
"""

from __future__ import annotations

import io
from typing import Any
from uuid import UUID

from ..domain.errores import ExcepcionDominio
from ..domain.puertos import ReporteGeneradoRepositorio
from ..domain.reporte_generado import ReporteGenerado
from .compartido.forma_tabla import columna_numerica_y_texto as _columna_numerica_y_texto

FORMATOS_VALIDOS = {"pdf", "xlsx"}


class ExportarReporte:
    def __init__(self, repositorio: ReporteGeneradoRepositorio) -> None:
        self._repositorio = repositorio

    async def ejecutar(self, id_reporte: UUID, formato: str) -> tuple[bytes, str, str]:
        """Devuelve (bytes, content_type, nombre_archivo)."""
        if formato not in FORMATOS_VALIDOS:
            raise ExcepcionDominio("formato_invalido", "formato debe ser pdf o xlsx")

        reporte = await self._repositorio.buscar(id_reporte)
        if reporte is None:
            raise ExcepcionDominio("reporte_no_encontrado", "No existe un reporte con ese id")

        if formato == "xlsx":
            return _exportar_xlsx(reporte)
        return _exportar_pdf(reporte)


def _exportar_xlsx(reporte: ReporteGenerado) -> tuple[bytes, str, str]:
    from openpyxl import Workbook
    from openpyxl.chart import BarChart, Reference

    libro = Workbook()
    hoja = libro.active
    hoja.title = "Reporte"

    hoja.append(["Pregunta", reporte.pregunta])
    hoja.append(["Respuesta", reporte.respuesta_nl or ""])
    hoja.append([])

    fila_encabezado = hoja.max_row + 1
    if reporte.columnas:
        hoja.append(reporte.columnas)
        for fila in reporte.filas:
            hoja.append([fila.get(columna) for columna in reporte.columnas])

        par = _columna_numerica_y_texto(reporte.columnas, reporte.filas)
        if par:
            col_texto, col_numero = par
            indice_numero = reporte.columnas.index(col_numero) + 1
            fila_final = fila_encabezado + len(reporte.filas)
            grafico = BarChart()
            grafico.title = col_numero
            datos = Reference(hoja, min_col=indice_numero, min_row=fila_encabezado, max_row=fila_final)
            categorias = Reference(
                hoja, min_col=reporte.columnas.index(col_texto) + 1, min_row=fila_encabezado + 1, max_row=fila_final
            )
            grafico.add_data(datos, titles_from_data=True)
            grafico.set_categories(categorias)
            hoja.add_chart(grafico, f"A{fila_final + 3}")

    buffer = io.BytesIO()
    libro.save(buffer)
    return (
        buffer.getvalue(),
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        f"reporte-{reporte.id}.xlsx",
    )


def _exportar_pdf(reporte: ReporteGenerado) -> tuple[bytes, str, str]:
    from reportlab.graphics.charts.barcharts import VerticalBarChart
    from reportlab.graphics.shapes import Drawing
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import letter
    from reportlab.lib.styles import getSampleStyleSheet
    from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

    buffer = io.BytesIO()
    documento = SimpleDocTemplate(buffer, pagesize=letter)
    estilos = getSampleStyleSheet()
    elementos: list[Any] = [
        Paragraph("Reporte AdOrbit", estilos["Title"]),
        Spacer(1, 12),
        Paragraph(f"<b>Pregunta:</b> {reporte.pregunta}", estilos["Normal"]),
        Spacer(1, 6),
        Paragraph(f"<b>Respuesta:</b> {reporte.respuesta_nl or '(sin respuesta)'}", estilos["Normal"]),
        Spacer(1, 16),
    ]

    if reporte.columnas:
        filas_tabla = [reporte.columnas] + [
            [str(fila.get(columna, "")) for columna in reporte.columnas] for fila in reporte.filas
        ]
        tabla = Table(filas_tabla)
        tabla.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#4f46e5")),
                    ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                    ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
                ]
            )
        )
        elementos.append(tabla)

        par = _columna_numerica_y_texto(reporte.columnas, reporte.filas)
        if par:
            col_texto, col_numero = par
            elementos.append(Spacer(1, 16))
            dibujo = Drawing(400, 200)
            grafico = VerticalBarChart()
            grafico.x, grafico.y, grafico.width, grafico.height = 50, 20, 300, 150
            grafico.data = [[float(fila.get(col_numero) or 0) for fila in reporte.filas]]
            grafico.categoryAxis.categoryNames = [str(fila.get(col_texto, "")) for fila in reporte.filas]
            grafico.valueAxis.valueMin = 0
            dibujo.add(grafico)
            elementos.append(dibujo)

    documento.build(elementos)
    return buffer.getvalue(), "application/pdf", f"reporte-{reporte.id}.pdf"
