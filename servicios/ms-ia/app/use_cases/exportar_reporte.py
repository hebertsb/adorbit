"""Exporta un ReporteGenerado ya persistido a PDF o Excel. Si las filas tienen la
forma simple columna-de-texto + columna-numerica, se agrega un grafico de barras
nativo de cada libreria (sin matplotlib -- mas liviano para un plan gratuito de
despliegue); si no, se deja solo la tabla.
"""

from __future__ import annotations

import io
import re
from datetime import date, datetime
from decimal import Decimal, InvalidOperation
from html import escape
from typing import Any
from uuid import UUID

from ..domain.errores import ExcepcionDominio
from ..domain.puertos import ReporteGeneradoRepositorio
from ..domain.reporte_generado import ReporteGenerado
from .compartido.forma_tabla import columna_dto, columna_numerica_y_texto as _columna_numerica_y_texto

FORMATOS_VALIDOS = {"pdf", "xlsx", "txt"}


def _resumen_limpio(reporte: ReporteGenerado) -> str:
    """Quita la tabla Markdown duplicada; los datos ya se presentan formalmente abajo."""
    texto = (reporte.respuesta_nl or "").strip()
    if not texto:
        return f"Se encontraron {len(reporte.filas)} registros para la consulta realizada."
    lineas = [linea.strip() for linea in texto.splitlines() if linea.strip()]
    sin_tabla = [linea for linea in lineas if "|" not in linea]
    if not sin_tabla and "|" in texto:
        partes = [parte.strip() for parte in texto.split("|")]
        sin_tabla = [partes[0], partes[-1]]
    limpio = " ".join(sin_tabla)
    limpio = re.sub(r"[*_`#]+", "", limpio)
    limpio = re.sub(r"\s+", " ", limpio).strip(" -|")
    if not limpio:
        limpio = f"Se encontraron {len(reporte.filas)} registros para la consulta realizada."
    return limpio[:900]


def _a_numero(valor: Any) -> int | float | Any:
    if isinstance(valor, bool) or valor is None:
        return valor
    if isinstance(valor, (int, float)):
        return valor
    if isinstance(valor, (Decimal, str)):
        try:
            numero = Decimal(str(valor))
            return int(numero) if numero == numero.to_integral_value() else float(numero)
        except (InvalidOperation, ValueError):
            return valor
    return valor


def _valor_excel(clave: str, valor: Any) -> Any:
    tipo = columna_dto(clave)["tipo"]
    if tipo in {"dinero", "numero", "porcentaje"}:
        return _a_numero(valor)
    if tipo == "fecha" and isinstance(valor, str):
        try:
            return date.fromisoformat(valor[:10])
        except ValueError:
            return valor
    return valor


def _referencia_empresarial(clave: str, valor: Any, fila: dict[str, Any]) -> str:
    """Referencia breve solo de presentación; el UUID interno no se modifica."""
    normalizado = re.sub(r"[^0-9a-f]", "", str(valor).lower())
    legado_campana = re.fullmatch(r"0{28}c(\d{3})", normalizado)
    compacto = (legado_campana.group(1).zfill(4) if legado_campana else normalizado[-4:].upper().rjust(4, "0"))
    if clave == "campana_id":
        fecha = str(fila.get("fecha_inicio") or "")
        ano = fecha[:4] if re.fullmatch(r"\d{4}", fecha[:4]) else "GEN"
        return f"CMP-{ano}-{compacto}"
    if clave == "cliente_id":
        return f"CLI-{compacto}"
    if clave == "factura_id":
        return f"FAC-{compacto}"
    return compacto


def _etiqueta_excel(clave: str) -> str:
    return {
        "campana_id": "Código de campaña",
        "cliente_id": "Código de cliente",
        "factura_id": "Código de factura",
    }.get(clave, columna_dto(clave)["etiqueta"])


def _formatear_pdf(clave: str, valor: Any) -> str:
    if valor is None:
        return "—"
    dto = columna_dto(clave)
    if dto["tipo"] == "dinero":
        numero = _a_numero(valor)
        if isinstance(numero, (int, float)):
            return f"Bs {numero:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
    if dto["tipo"] == "fecha" and isinstance(valor, (date, datetime)):
        return valor.strftime("%d/%m/%Y")
    if dto["tipo"] == "fecha" and isinstance(valor, str):
        try:
            return date.fromisoformat(valor[:10]).strftime("%d/%m/%Y")
        except ValueError:
            pass
    return str(valor)


def _logo_png() -> io.BytesIO:
    """Logo raster en memoria para PDF/XLSX; no crea archivos temporales."""
    from PIL import Image, ImageDraw, ImageFont

    imagen = Image.new("RGBA", (500, 112), (255, 255, 255, 0))
    dibujo = ImageDraw.Draw(imagen)
    dibujo.rounded_rectangle((4, 4, 104, 104), radius=22, fill="#4f46e5")
    dibujo.polygon([(25, 82), (54, 25), (63, 25), (88, 82), (70, 82), (58, 48), (43, 82)], fill="white")
    dibujo.ellipse((18, 42, 92, 78), outline="white", width=5)
    dibujo.ellipse((84, 26, 98, 40), fill="white")
    try:
        fuente = ImageFont.truetype("DejaVuSans-Bold.ttf", 46)
    except OSError:
        fuente = ImageFont.load_default(size=42)
    dibujo.text((122, 28), "AdOrbit", fill="#111827", font=fuente)
    salida = io.BytesIO()
    imagen.save(salida, format="PNG")
    salida.seek(0)
    return salida


class ExportarReporte:
    def __init__(self, repositorio: ReporteGeneradoRepositorio) -> None:
        self._repositorio = repositorio

    async def ejecutar(self, id_reporte: UUID, formato: str) -> tuple[bytes, str, str]:
        """Devuelve (bytes, content_type, nombre_archivo)."""
        if formato not in FORMATOS_VALIDOS:
            raise ExcepcionDominio("formato_invalido", "formato debe ser pdf, xlsx o txt")

        reporte = await self._repositorio.buscar(id_reporte)
        if reporte is None:
            raise ExcepcionDominio("reporte_no_encontrado", "No existe un reporte con ese id")

        if formato == "xlsx":
            return _exportar_xlsx(reporte)
        if formato == "txt":
            return _exportar_txt(reporte)
        return _exportar_pdf(reporte)


def _formatear_txt(clave: str, valor: Any, fila: dict[str, Any]) -> str:
    if valor is None:
        return "—"
    if clave.endswith("_id"):
        return _referencia_empresarial(clave, valor, fila)
    dto = columna_dto(clave)
    if dto["tipo"] == "dinero":
        numero = _a_numero(valor)
        if isinstance(numero, (int, float)):
            return f"Bs {numero:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
    if dto["tipo"] == "porcentaje":
        numero = _a_numero(valor)
        if isinstance(numero, (int, float)):
            return f"{numero:.1f}%"
    if dto["tipo"] == "fecha" and isinstance(valor, (date, datetime)):
        return valor.strftime("%d/%m/%Y")
    if dto["tipo"] == "fecha" and isinstance(valor, str):
        try:
            return date.fromisoformat(valor[:10]).strftime("%d/%m/%Y")
        except ValueError:
            pass
    return str(valor)


def _exportar_txt(reporte: ReporteGenerado) -> tuple[bytes, str, str]:
    ancho_total = 88
    linea_doble = "=" * ancho_total
    linea_simple = "-" * ancho_total

    fecha_gen = reporte.creado_en or datetime.now()
    fecha_str = fecha_gen.strftime("%d/%m/%Y %H:%M:%S")

    lineas: list[str] = [
        linea_doble,
        "                         ADORBIT ADVERTISING PLATFORM",
        "                      REPORTE EJECUTIVO DE INTELIGENCIA",
        linea_doble,
        f"ID Reporte    : {reporte.id}",
        f"Fecha/Hora    : {fecha_str}",
        f"Consulta      : {reporte.pregunta}",
    ]

    if reporte.herramientas_usadas:
        ultima = reporte.herramientas_usadas[-1]
        lineas.append(f"Herramienta   : {ultima.get('herramienta', 'mcp_consultas')}")
    lineas.extend([
        f"Registros     : {len(reporte.filas)} encontrados",
        linea_simple,
        "",
        "1. RESUMEN EJECUTIVO & SÍNTESIS DE INTELIGENCIA ARTIFICIAL",
        linea_simple,
        _resumen_limpio(reporte),
        "",
    ])

    if reporte.columnas and reporte.filas:
        columnas_tabla = reporte.columnas
        etiquetas = [_etiqueta_excel(c) for c in columnas_tabla]

        anchos = [len(e) for e in etiquetas]
        matriz_celdas: list[list[str]] = []
        for fila in reporte.filas:
            fila_txt = [_formatear_txt(c, fila.get(c), fila) for c in columnas_tabla]
            matriz_celdas.append(fila_txt)
            for i, celda in enumerate(fila_txt):
                if len(celda) > anchos[i]:
                    anchos[i] = min(40, len(celda))

        borde_horiz = "+" + "+".join("-" * (w + 2) for w in anchos) + "+"

        lineas.extend([
            "2. TABLA DETALLADA DE DATOS",
            linea_simple,
            borde_horiz,
            "|" + "|".join(f" {etiquetas[i].ljust(anchos[i])[:anchos[i]]} " for i in range(len(columnas_tabla))) + "|",
            borde_horiz,
        ])

        for fila_txt in matriz_celdas:
            celdas_fmt = []
            for i, celda in enumerate(fila_txt):
                col = columnas_tabla[i]
                dto = columna_dto(col)
                ancho = anchos[i]
                valor_cortado = celda[:ancho]
                if dto["tipo"] in {"dinero", "numero", "porcentaje"}:
                    celdas_fmt.append(f" {valor_cortado.rjust(ancho)} ")
                else:
                    celdas_fmt.append(f" {valor_cortado.ljust(ancho)} ")
            lineas.append("|" + "|".join(celdas_fmt) + "|")

        lineas.append(borde_horiz)
        lineas.append("")

        kpis: list[str] = []
        for c in columnas_tabla:
            dto = columna_dto(c)
            if dto["tipo"] in {"dinero", "numero"}:
                valores_num = [_a_numero(f.get(c)) for f in reporte.filas]
                validos = [float(v) for v in valores_num if isinstance(v, (int, float))]
                if validos:
                    total = sum(validos)
                    promedio = total / len(validos)
                    etiqueta = _etiqueta_excel(c)
                    if dto["tipo"] == "dinero":
                        tot_fmt = f"Bs {total:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
                        prom_fmt = f"Bs {promedio:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
                        kpis.append(f"• {etiqueta:<28}: Total = {tot_fmt} | Promedio = {prom_fmt}")
                    else:
                        kpis.append(f"• {etiqueta:<28}: Total = {total:,.1f} | Promedio = {promedio:,.1f}")

        if kpis:
            lineas.extend([
                "3. INDICADORES CLAVE (KPIs)",
                linea_simple,
                *kpis,
                "",
            ])

    lineas.extend([
        linea_doble,
        "  AdOrbit Intelligence Engine · Generado automáticamente · Documento Confidencial",
        linea_doble,
    ])

    contenido_txt = "\n".join(lineas) + "\n"
    nombre_archivo = f"reporte-{reporte.id}.txt"
    return contenido_txt.encode("utf-8"), "text/plain; charset=utf-8", nombre_archivo


def _exportar_xlsx(reporte: ReporteGenerado) -> tuple[bytes, str, str]:
    from openpyxl import Workbook
    from openpyxl.chart import BarChart, Reference
    from openpyxl.drawing.image import Image
    from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
    from openpyxl.utils import get_column_letter

    libro = Workbook()
    hoja = libro.active
    hoja.title = "Reporte"

    max_columna = max(2, len(reporte.columnas))
    ultima_letra = get_column_letter(max_columna)
    morado = "4F46E5"
    azul_oscuro = "111827"
    gris = "E5E7EB"

    hoja.merge_cells(start_row=1, start_column=1, end_row=2, end_column=max_columna)
    for fila in range(1, 3):
        for columna in range(1, max_columna + 1):
            hoja.cell(fila, columna).fill = PatternFill("solid", fgColor="FFFFFF")
    for columna in range(1, max_columna + 1):
        hoja.cell(2, columna).border = Border(bottom=Side(style="medium", color=morado))
    logo_buffer = _logo_png()
    logo = Image(logo_buffer)
    logo.width, logo.height = 178, 40
    hoja.add_image(logo, "A1")
    hoja.row_dimensions[1].height = 24
    hoja.row_dimensions[2].height = 20

    hoja.merge_cells(start_row=4, start_column=1, end_row=4, end_column=max_columna)
    hoja.cell(4, 1, "REPORTE DE INTELIGENCIA")
    hoja.cell(4, 1).font = Font(size=16, bold=True, color=azul_oscuro)
    hoja.cell(5, 1, "Pregunta")
    hoja.merge_cells(start_row=5, start_column=2, end_row=5, end_column=max_columna)
    hoja.cell(5, 2, reporte.pregunta)
    hoja.cell(6, 1, "Generado")
    hoja.merge_cells(start_row=6, start_column=2, end_row=6, end_column=max_columna)
    fecha_generacion = reporte.creado_en or datetime.now()
    if fecha_generacion.tzinfo is not None:
        fecha_generacion = fecha_generacion.replace(tzinfo=None)
    hoja.cell(6, 2, fecha_generacion)
    hoja.cell(6, 2).number_format = "dd/mm/yyyy hh:mm"
    hoja.cell(7, 1, "Resumen")
    hoja.merge_cells(start_row=7, start_column=2, end_row=8, end_column=max_columna)
    hoja.cell(7, 2, _resumen_limpio(reporte))
    hoja.cell(7, 2).alignment = Alignment(wrap_text=True, vertical="top")
    hoja.row_dimensions[7].height = 30
    for fila in range(5, 8):
        hoja.cell(fila, 1).font = Font(bold=True, color=morado)

    fila_encabezado = 10
    if reporte.columnas:
        for indice, clave in enumerate(reporte.columnas, 1):
            celda = hoja.cell(fila_encabezado, indice, _etiqueta_excel(clave))
            celda.fill = PatternFill("solid", fgColor=morado)
            celda.font = Font(color="FFFFFF", bold=True)
            celda.alignment = Alignment(wrap_text=True, vertical="center")
        for fila in reporte.filas:
            hoja.append([
                _referencia_empresarial(columna, fila.get(columna), fila)
                if columna.endswith("_id") else _valor_excel(columna, fila.get(columna))
                for columna in reporte.columnas
            ])

        fila_final = fila_encabezado + len(reporte.filas)
        borde = Border(bottom=Side(style="thin", color=gris))
        for fila in hoja.iter_rows(min_row=fila_encabezado + 1, max_row=fila_final, max_col=len(reporte.columnas)):
            for celda in fila:
                celda.border = borde
                celda.alignment = Alignment(vertical="top", wrap_text=True)
        for indice, clave in enumerate(reporte.columnas, 1):
            tipo = columna_dto(clave)["tipo"]
            for fila in range(fila_encabezado + 1, fila_final + 1):
                if tipo == "dinero":
                    hoja.cell(fila, indice).number_format = '"Bs" #,##0.00'
                elif tipo == "numero":
                    hoja.cell(fila, indice).number_format = "#,##0.00"
                elif tipo == "fecha" and isinstance(hoja.cell(fila, indice).value, date):
                    hoja.cell(fila, indice).number_format = "dd/mm/yyyy"
            valores = [_etiqueta_excel(clave)] + [
                _referencia_empresarial(clave, f.get(clave), f)
                if clave.endswith("_id") else str(f.get(clave, "") or "")
                for f in reporte.filas
            ]
            ancho = min(48, max(12, max(len(v) for v in valores) + 2))
            if clave.endswith("_id"):
                ancho = min(ancho, 22)
            hoja.column_dimensions[get_column_letter(indice)].width = ancho

        hoja.freeze_panes = f"A{fila_encabezado + 1}"
        hoja.auto_filter.ref = f"A{fila_encabezado}:{get_column_letter(len(reporte.columnas))}{fila_final}"
        hoja.sheet_view.showGridLines = False
        hoja.page_setup.orientation = "landscape"
        hoja.page_setup.fitToWidth = 1
        hoja.sheet_properties.pageSetUpPr.fitToPage = True
        hoja.print_title_rows = f"1:{fila_encabezado}"

        par = _columna_numerica_y_texto(reporte.columnas, reporte.filas)
        if par:
            col_texto, col_numero = par
            indice_numero = reporte.columnas.index(col_numero) + 1
            grafico = BarChart()
            grafico.type = "bar"
            grafico.style = 10
            grafico.title = columna_dto(col_numero)["etiqueta"]
            grafico.y_axis.title = columna_dto(col_texto)["etiqueta"]
            grafico.x_axis.title = columna_dto(col_numero)["etiqueta"]
            grafico.legend = None
            grafico.height = 9
            grafico.width = 20
            datos = Reference(hoja, min_col=indice_numero, min_row=fila_encabezado, max_row=fila_final)
            categorias = Reference(
                hoja, min_col=reporte.columnas.index(col_texto) + 1, min_row=fila_encabezado + 1, max_row=fila_final
            )
            grafico.add_data(datos, titles_from_data=True)
            grafico.set_categories(categorias)
            hoja_grafico = libro.create_sheet("Gráfico")
            hoja_grafico.sheet_view.showGridLines = False
            hoja_grafico["A1"] = f"{columna_dto(col_numero)['etiqueta']} por {columna_dto(col_texto)['etiqueta'].lower()}"
            hoja_grafico["A1"].font = Font(size=16, bold=True, color=azul_oscuro)
            hoja_grafico.add_chart(grafico, "A3")

    buffer = io.BytesIO()
    libro.save(buffer)
    return (
        buffer.getvalue(),
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        f"reporte-{reporte.id}.xlsx",
    )


def _exportar_pdf(reporte: ReporteGenerado) -> tuple[bytes, str, str]:
    from reportlab.graphics.charts.barcharts import HorizontalBarChart
    from reportlab.graphics.shapes import Drawing
    from reportlab.lib import colors
    from reportlab.lib.enums import TA_RIGHT
    from reportlab.lib.pagesizes import A4, landscape
    from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
    from reportlab.lib.units import mm
    from reportlab.platypus import Image, PageBreak, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

    buffer = io.BytesIO()
    documento = SimpleDocTemplate(
        buffer, pagesize=landscape(A4), leftMargin=14 * mm, rightMargin=14 * mm,
        topMargin=12 * mm, bottomMargin=16 * mm,
        title=f"Reporte AdOrbit - {reporte.pregunta}", author="AdOrbit",
    )
    estilos = getSampleStyleSheet()
    estilos.add(ParagraphStyle(name="ResumenAdOrbit", parent=estilos["BodyText"], leading=15, textColor=colors.HexColor("#374151")))
    estilos.add(ParagraphStyle(name="CeldaAdOrbit", parent=estilos["BodyText"], fontSize=7.5, leading=9))
    estilos.add(ParagraphStyle(name="CeldaNumero", parent=estilos["CeldaAdOrbit"], alignment=TA_RIGHT))
    logo_buffer = _logo_png()
    logo = Image(logo_buffer, width=47 * mm, height=10.5 * mm)
    encabezado = Table(
        [[logo, Paragraph("REPORTE DE INTELIGENCIA", estilos["Heading1"])]],
        colWidths=[55 * mm, 205 * mm],
    )
    encabezado.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "MIDDLE"), ("LINEBELOW", (0, 0), (-1, -1), 1.2, colors.HexColor("#4f46e5"))]))
    elementos: list[Any] = [
        encabezado,
        Spacer(1, 12),
        Paragraph(f"<b>Pregunta:</b> {escape(reporte.pregunta)}", estilos["Normal"]),
        Spacer(1, 6),
        Paragraph(f"<b>Generado:</b> {(reporte.creado_en or datetime.now()).strftime('%d/%m/%Y %H:%M')}", estilos["Normal"]),
        Spacer(1, 8),
        Paragraph(f"<b>Resumen ejecutivo:</b> {escape(_resumen_limpio(reporte))}", estilos["ResumenAdOrbit"]),
        Spacer(1, 16),
    ]

    if reporte.columnas:
        columnas_pdf = [c for c in reporte.columnas if not c.endswith("_id")]
        if not columnas_pdf:
            columnas_pdf = reporte.columnas
        filas_tabla = [[Paragraph(f"<b>{escape(columna_dto(c)['etiqueta'])}</b>", estilos["CeldaAdOrbit"]) for c in columnas_pdf]] + [
            [Paragraph(escape(_formatear_pdf(c, fila.get(c))), estilos["CeldaNumero"] if columna_dto(c)["tipo"] in {"dinero", "numero"} else estilos["CeldaAdOrbit"]) for c in columnas_pdf]
            for fila in reporte.filas
        ]
        pesos = [3.6 if c == "nombre" else 1.4 if columna_dto(c)["tipo"] == "fecha" else 1.5 for c in columnas_pdf]
        ancho_disponible = landscape(A4)[0] - 28 * mm
        total_pesos = sum(pesos)
        tabla = Table(filas_tabla, colWidths=[ancho_disponible * p / total_pesos for p in pesos], repeatRows=1)
        tabla.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#4f46e5")),
                    ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                    ("GRID", (0, 0), (-1, -1), 0.35, colors.HexColor("#d1d5db")),
                    ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f9fafb")]),
                    ("VALIGN", (0, 0), (-1, -1), "TOP"),
                    ("TOPPADDING", (0, 0), (-1, -1), 5),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
                ]
            )
        )
        elementos.append(tabla)

        par = _columna_numerica_y_texto(reporte.columnas, reporte.filas)
        if par:
            col_texto, col_numero = par
            elementos.extend([PageBreak(), Paragraph(f"{escape(columna_dto(col_numero)['etiqueta'])} por {escape(columna_dto(col_texto)['etiqueta'].lower())}", estilos["Heading2"]), Spacer(1, 8)])
            filas_grafico = reporte.filas[:12]
            dibujo = Drawing(720, 360)
            grafico = HorizontalBarChart()
            grafico.x, grafico.y, grafico.width, grafico.height = 185, 35, 500, 285
            grafico.data = [[float(_a_numero(fila.get(col_numero)) or 0) for fila in filas_grafico]]
            grafico.categoryAxis.categoryNames = [str(fila.get(col_texto, ""))[:42] for fila in filas_grafico]
            grafico.valueAxis.valueMin = 0
            grafico.categoryAxis.labels.fontSize = 7
            grafico.valueAxis.labels.fontSize = 8
            grafico.bars[0].fillColor = colors.HexColor("#4f46e5")
            dibujo.add(grafico)
            elementos.append(dibujo)

    def pie_pagina(canvas: Any, doc: Any) -> None:
        canvas.saveState()
        canvas.setStrokeColor(colors.HexColor("#d1d5db"))
        canvas.line(14 * mm, 11 * mm, landscape(A4)[0] - 14 * mm, 11 * mm)
        canvas.setFont("Helvetica", 8)
        canvas.setFillColor(colors.HexColor("#6b7280"))
        canvas.drawString(14 * mm, 7 * mm, "AdOrbit · Plataforma publicitaria")
        canvas.drawRightString(landscape(A4)[0] - 14 * mm, 7 * mm, f"Página {doc.page}")
        canvas.restoreState()

    documento.build(elementos, onFirstPage=pie_pagina, onLaterPages=pie_pagina)
    return buffer.getvalue(), "application/pdf", f"reporte-{reporte.id}.pdf"
