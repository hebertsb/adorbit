from datetime import UTC, datetime
from io import BytesIO
from uuid import uuid4

from openpyxl import load_workbook

from app.domain.reporte_generado import ReporteGenerado
from app.use_cases.compartido.forma_tabla import columna_numerica_y_texto
from app.use_cases.exportar_reporte import _exportar_pdf, _exportar_xlsx


def _reporte() -> ReporteGenerado:
    columnas = [
        "campana_id", "cliente_id", "nombre", "estado", "presupuesto_total",
        "gasto_actual", "fecha_inicio", "fecha_fin",
    ]
    filas = [
        {
            "campana_id": str(uuid4()),
            "cliente_id": str(uuid4()),
            "nombre": "Campaña institucional",
            "estado": "activa",
            "presupuesto_total": "185000.00",
            "gasto_actual": "92400.00",
            "fecha_inicio": "2026-02-01",
            "fecha_fin": "2026-05-31",
        }
    ]
    return ReporteGenerado(
        id=uuid4(),
        usuario_id=None,
        pregunta="Campañas activas",
        respuesta_nl="**Campañas activas** | Nombre | Total | |---|---| | Institucional | 185000 | Todas activas.",
        herramientas_usadas=[],
        columnas=columnas,
        filas=filas,
        creado_en=datetime.now(UTC),
    )


def test_codigo_empresarial_de_semilla_no_expone_uuid() -> None:
    from app.use_cases.exportar_reporte import _referencia_empresarial

    fila = {"fecha_inicio": "2026-04-01"}
    assert _referencia_empresarial("campana_id", "00000000-0000-0000-0000-00000000c007", fila) == "CMP-2026-0007"
    assert _referencia_empresarial("cliente_id", "00000000-0000-0000-0000-000000000004", fila) == "CLI-0004"


def test_grafico_prefiere_nombre_en_vez_de_uuid() -> None:
    reporte = _reporte()
    assert columna_numerica_y_texto(reporte.columnas, reporte.filas) == ("nombre", "presupuesto_total")


def test_excel_formal_tiene_datos_numericos_y_grafico() -> None:
    contenido, tipo, _ = _exportar_xlsx(_reporte())
    libro = load_workbook(BytesIO(contenido))
    hoja = libro["Reporte"]

    assert tipo == "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    assert libro.sheetnames == ["Reporte", "Gráfico"]
    assert hoja["A4"].value == "REPORTE DE INTELIGENCIA"
    assert hoja.freeze_panes == "A11"
    assert hoja.auto_filter.ref == "A10:H11"
    assert hoja["A10"].value == "Código de campaña"
    assert hoja["A11"].value.startswith("CMP-2026-")
    assert hoja["B11"].value.startswith("CLI-")
    assert len(hoja["A11"].value) < 20
    assert isinstance(hoja["E11"].value, int | float)
    assert len(libro["Gráfico"]._charts) == 1


def test_pdf_formal_tiene_portada_tabla_y_pagina_de_grafico() -> None:
    contenido, tipo, _ = _exportar_pdf(_reporte())

    assert tipo == "application/pdf"
    assert contenido.startswith(b"%PDF")
    assert contenido.count(b"/Type /Page\n") >= 2
