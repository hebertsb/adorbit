"""Metadatos de columna y deteccion de grafico, compartidos entre la respuesta JSON de
/api/v1/reportes (api/reportes.py) y la exportacion PDF/Excel (use_cases/exportar_reporte.py).
Las claves conocidas son las que devuelven las 4 herramientas MCP (ver
adapters/postgres/vista_mcp_repo.py) -- una clave desconocida cae en el heuristico de
abajo en vez de tronar.
"""

from __future__ import annotations

from typing import Any, TypedDict


class ColumnaDto(TypedDict, total=False):
    clave: str
    etiqueta: str
    tipo: str
    moneda: str


_METADATOS_COLUMNA: dict[str, ColumnaDto] = {
    "campana_id": {"etiqueta": "ID de campaña", "tipo": "texto"},
    "cliente_id": {"etiqueta": "ID de cliente", "tipo": "texto"},
    "factura_id": {"etiqueta": "ID de factura", "tipo": "texto"},
    "nombre": {"etiqueta": "Nombre", "tipo": "texto"},
    "estado": {"etiqueta": "Estado", "tipo": "texto"},
    "moneda": {"etiqueta": "Moneda", "tipo": "texto"},
    "presupuesto_total": {"etiqueta": "Presupuesto total", "tipo": "dinero", "moneda": "BOB"},
    "gasto_actual": {"etiqueta": "Gasto actual", "tipo": "dinero", "moneda": "BOB"},
    "total": {"etiqueta": "Total", "tipo": "dinero", "moneda": "BOB"},
    "linea_credito_limite": {"etiqueta": "Límite de crédito", "tipo": "dinero", "moneda": "BOB"},
    "linea_credito_usado": {"etiqueta": "Crédito usado", "tipo": "dinero", "moneda": "BOB"},
    "fecha_inicio": {"etiqueta": "Fecha de inicio", "tipo": "fecha"},
    "fecha_fin": {"etiqueta": "Fecha de fin", "tipo": "fecha"},
    "fecha_emision": {"etiqueta": "Fecha de emisión", "tipo": "fecha"},
    "fecha_vencimiento": {"etiqueta": "Fecha de vencimiento", "tipo": "fecha"},
    "dias_vencida": {"etiqueta": "Días vencida", "tipo": "numero"},
}

TITULOS_HERRAMIENTA: dict[str, str] = {
    "consultar_campanas": "Campañas",
    "facturas_por_vencer": "Facturas por vencer",
    "clientes_morosos": "Clientes morosos",
    "resumen_gasto_campana": "Resumen de gasto de campaña",
}


def columna_dto(clave: str) -> ColumnaDto:
    conocida = _METADATOS_COLUMNA.get(clave)
    if conocida:
        return {"clave": clave, **conocida}
    return {"clave": clave, "etiqueta": clave.replace("_", " ").capitalize(), "tipo": "texto"}


def titulo_desde_herramienta(herramienta: str | None, pregunta: str) -> str:
    if herramienta:
        return TITULOS_HERRAMIENTA.get(herramienta, pregunta[:60])
    return pregunta[:60]


_TIPOS_NUMERICOS = {"numero", "dinero", "porcentaje"}


def columna_numerica_y_texto(columnas: list[str], filas: list[dict[str, Any]]) -> tuple[str, str] | None:
    """Detecta la forma simple (1 columna de texto + 1 numerica) que amerita un grafico."""
    if len(columnas) < 2 or not filas:
        return None
    candidatas_texto: list[str] = []
    col_numero: str | None = None
    for clave in columnas:
        valor = filas[0].get(clave)
        dto = columna_dto(clave)
        if isinstance(valor, bool):
            continue
        if (isinstance(valor, (int, float)) or dto["tipo"] in _TIPOS_NUMERICOS) and col_numero is None:
            col_numero = clave
        elif isinstance(valor, str):
            candidatas_texto.append(clave)
    # Un UUID es una categoria tecnica y vuelve ilegible cualquier grafico. Se
    # prefiere el nombre; despues fechas u otra etiqueta de negocio; los IDs son
    # el ultimo recurso.
    candidatas_texto.sort(
        key=lambda clave: (
            0 if clave == "nombre" else 1 if columna_dto(clave)["tipo"] == "fecha" else 3 if clave.endswith("_id") else 2,
            columnas.index(clave),
        )
    )
    col_texto = candidatas_texto[0] if candidatas_texto else None
    if col_texto and col_numero:
        return col_texto, col_numero
    return None


def grafico_dto(columnas: list[str], filas: list[dict[str, Any]]) -> dict[str, str] | None:
    par = columna_numerica_y_texto(columnas, filas)
    if not par:
        return None
    col_texto, col_numero = par
    tipo = "linea" if columna_dto(col_texto)["tipo"] == "fecha" else "barras"
    return {"tipo": tipo, "x": col_texto, "y": col_numero}
