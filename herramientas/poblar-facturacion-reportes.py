#!/usr/bin/env python3
"""
Genera ~200 registros realistas en AdOrbitFacturacion (DynamoDB) para reportes.
Cubre: facturas por mes (12 meses), clientes, estados variados, cobros y notas de crédito.

Uso:
  python3 herramientas/poblar-facturacion-reportes.py
  AWS_REGION=us-east-1 python3 herramientas/poblar-facturacion-reportes.py
"""
import boto3
import uuid
import random
import hashlib
import json
import os
from datetime import date, timedelta
from decimal import Decimal

# ─── Configuración ────────────────────────────────────────────────────────────
TABLE   = os.environ.get("DYNAMO_TABLE", "AdOrbitFacturacion")
REGION  = os.environ.get("AWS_REGION",   "us-east-1")
ENDPOINT = os.environ.get("DYNAMO_ENDPOINT", None)   # para DynamoDB local

kwargs = dict(region_name=REGION)
if ENDPOINT:
    kwargs["endpoint_url"] = ENDPOINT

dynamodb  = boto3.resource("dynamodb", **kwargs)
dynamo_cl = boto3.client("dynamodb",   **kwargs)
tabla     = dynamodb.Table(TABLE)

# ─── Datos de referencia (deben coincidir con ms-clientes-crm y ms-campanas) ─
CLIENTES = [
    {"id": "aaaaaaaa-1111-1111-1111-aaaaaaaaaaaa", "nombre": "Empresa Alpha S.R.L."},
    {"id": "bbbbbbbb-2222-2222-2222-bbbbbbbbbbbb", "nombre": "Medios Beta S.A."},
    {"id": "cccccccc-3333-3333-3333-cccccccccccc", "nombre": "Gamma Digital S.R.L."},
    {"id": "dddddddd-4444-4444-4444-dddddddddddd", "nombre": "Delta Publicidad E.U."},
    {"id": "eeeeeeee-5555-5555-5555-eeeeeeeeeeee", "nombre": "Epsilon Media S.A."},
]

CAMPANAS_POOL = [str(uuid.UUID(f"{i:032x}")) for i in range(1, 51)]  # 50 IDs fijos

SERVICIOS_PUBLICIDAD = [
    ("Producción spot TV 30s",           "1", "8500.00"),
    ("Producción spot radio 30s",        "1", "1800.00"),
    ("Diseño banner digital",            "3", "450.00"),
    ("Pauta redes sociales (mensual)",   "1", "2200.00"),
    ("Pauta televisión nacional",        "5", "3500.00"),
    ("Pauta radio AM/FM",                "10","680.00"),
    ("Gigantografía 4x8m",               "2", "2900.00"),
    ("Valla publicitaria exterior",      "1", "4100.00"),
    ("Diseño identidad de marca",        "1", "6000.00"),
    ("Video institucional 60s",          "1", "12000.00"),
    ("Fotografía producto",              "20","180.00"),
    ("Gestión redes 1 mes",              "1", "1500.00"),
    ("Campaña email marketing",          "1", "900.00"),
    ("Consultoría estratégica",          "4", "750.00"),
    ("Producción animación 2D 15s",      "1", "5500.00"),
    ("Publicidad POP (piezas)",          "50","45.00"),
    ("Locución profesional",             "1", "400.00"),
    ("Story Instagram (pack 5)",         "5", "280.00"),
    ("Reels Instagram (pack 3)",         "3", "520.00"),
    ("SEO mensual",                      "1", "1100.00"),
]

ESTADOS = ["EMITIDA", "PAGADA", "VENCIDA", "BORRADOR", "ANULADA"]
PESOS   = [0.35,       0.30,     0.15,      0.12,       0.08]      # distribución realista

MONEDAS = ["BOB", "BOB", "BOB", "USD"]   # 75% BOB, 25% USD
IVA     = Decimal("0.13")

numero_factura_seq = 6   # empieza después de las semillas existentes

# ─── Helpers ─────────────────────────────────────────────────────────────────
def nuevo_uuid():
    return str(uuid.uuid4())

def fecha_aleatoria(inicio: date, fin: date) -> date:
    delta = (fin - inicio).days
    return inicio + timedelta(days=random.randint(0, delta))

def calcular_totales(items):
    subtotal = sum(Decimal(it["precio_unitario"]) * int(it["cantidad"]) for it in items)
    impuesto = (subtotal * IVA).quantize(Decimal("0.01"))
    total    = subtotal + impuesto
    return subtotal.quantize(Decimal("0.01")), impuesto, total.quantize(Decimal("0.01"))

def huella(data: str) -> str:
    return "sha256:" + hashlib.sha256(data.encode()).hexdigest()

def put_item_seguro(item):
    """Inserta sin fallar si ya existe (idempotente)."""
    try:
        tabla.put_item(
            Item=item,
            ConditionExpression="attribute_not_exists(PK)"
        )
    except dynamodb.meta.client.exceptions.ConditionalCheckFailedException:
        pass  # ya existe, no duplicar

# ─── Generación de facturas ───────────────────────────────────────────────────
def generar_items_factura(n_items=None):
    if n_items is None:
        n_items = random.randint(1, 4)
    servicios = random.sample(SERVICIOS_PUBLICIDAD, min(n_items, len(SERVICIOS_PUBLICIDAD)))
    return [
        {
            "descripcion":    s[0],
            "cantidad":       int(s[1]),
            "precio_unitario": s[2],
        }
        for s in servicios
    ]

def insertar_factura(seq: int, cliente: dict, campana_id: str,
                     estado: str, fecha_emision: date,
                     moneda: str = "BOB") -> str:
    global numero_factura_seq
    fid       = nuevo_uuid()
    num       = f"FAC-2026-{seq:04d}"
    dias_venc = random.choice([15, 30, 45, 60])
    fecha_venc = fecha_emision + timedelta(days=dias_venc)

    items = generar_items_factura()
    subtotal, impuesto, total = calcular_totales(items)

    # cabecera
    put_item_seguro({
        "PK":               f"FACT#{fid}",
        "SK":               "META",
        "factura_id":       fid,
        "cliente_id":       cliente["id"],
        "campana_id":       campana_id,
        "numero_factura":   num,
        "estado":           estado,
        "subtotal":         str(subtotal),
        "impuesto_porcentaje": "13",
        "impuesto_monto":   str(impuesto),
        "total":            str(total),
        "moneda":           moneda,
        "fecha_emision":    fecha_emision.isoformat(),
        "fecha_vencimiento":fecha_venc.isoformat(),
        "notas":            f"Demo {cliente['nombre']} — {random.choice(['Q1','Q2','Q3','Q4'])} 2026",
        "version":          1,
        "GSI1PK":           f"CLI#{cliente['id']}",
        "GSI1SK":           fecha_emision.isoformat(),
        "GSI2PK":           f"ESTADO#{estado}",
        "GSI2SK":           fecha_venc.isoformat(),
    })

    # ítems
    for idx, it in enumerate(items, 1):
        sub_item = (Decimal(it["precio_unitario"]) * it["cantidad"]).quantize(Decimal("0.01"))
        put_item_seguro({
            "PK":              f"FACT#{fid}",
            "SK":              f"ITEM#{idx:02d}",
            "descripcion":     it["descripcion"],
            "cantidad":        it["cantidad"],
            "precio_unitario": it["precio_unitario"],
            "subtotal":        str(sub_item),
            "moneda":          moneda,
        })

    # cobro si PAGADA
    if estado == "PAGADA":
        cobro_id = nuevo_uuid()
        fecha_cobro = fecha_emision + timedelta(days=random.randint(5, dias_venc - 2))
        put_item_seguro({
            "PK":           f"FACT#{fid}",
            "SK":           f"COBRO#{cobro_id}",
            "cobro_id":     cobro_id,
            "monto":        str(total),
            "moneda":       moneda,
            "metodo_pago":  random.choice(["TRANSFERENCIA_BANCARIA", "DEPOSITO", "CHEQUE"]),
            "referencia":   f"REF-{random.randint(10000,99999)}",
            "fecha_cobro":  fecha_cobro.isoformat(),
            "registrado_en": f"{fecha_cobro.isoformat()}T10:00:00Z",
        })

    # cobro parcial si VENCIDA (a veces)
    if estado == "VENCIDA" and random.random() < 0.4:
        cobro_id = nuevo_uuid()
        monto_parcial = (total * Decimal("0.4")).quantize(Decimal("0.01"))
        fecha_cobro = fecha_emision + timedelta(days=random.randint(5, 20))
        put_item_seguro({
            "PK":           f"FACT#{fid}",
            "SK":           f"COBRO#{cobro_id}",
            "cobro_id":     cobro_id,
            "monto":        str(monto_parcial),
            "moneda":       moneda,
            "metodo_pago":  "TRANSFERENCIA_BANCARIA",
            "referencia":   f"PARCIAL-{random.randint(10000,99999)}",
            "fecha_cobro":  fecha_cobro.isoformat(),
            "registrado_en": f"{fecha_cobro.isoformat()}T14:30:00Z",
        })

    # nota de crédito si ANULADA
    if estado == "ANULADA":
        nc_id = nuevo_uuid()
        saga_id = nuevo_uuid()
        put_item_seguro({
            "PK":               f"NC#{nc_id}",
            "SK":               "META",
            "nc_id":            nc_id,
            "factura_id_origen": fid,
            "cliente_id":       cliente["id"],
            "saga_id":          saga_id,
            "motivo":           "SAGA_COMPENSACION",
            "monto":            str(total),
            "moneda":           moneda,
            "fecha_emision":    (fecha_emision + timedelta(days=5)).isoformat(),
            "numero_nc":        f"NC-2026-{seq:04d}",
            "version":          1,
            "GSI1PK":           f"CLI#{cliente['id']}",
            "GSI1SK":           (fecha_emision + timedelta(days=5)).isoformat(),
        })

    # idempotencia
    put_item_seguro({
        "PK":               f"IDEMP#emit-{fid}",
        "SK":               "META",
        "huella_solicitud": huella(f"{fid}{str(total)}"),
        "estado":           "COMPLETADO",
        "respuesta":        json.dumps({"factura_id": fid, "numero_factura": num, "total": str(total)}),
        "vence_epoch":      1800000000,
    })

    return fid, str(total), moneda

# ─── MAIN ────────────────────────────────────────────────────────────────────
def main():
    inicio = date(2026, 1, 1)
    fin    = date(2026, 10, 31)

    total_insertadas = 0
    secuencia = numero_factura_seq

    print(f"Generando facturas en {TABLE} ({REGION})…")

    # 180 facturas distribuidas entre 5 clientes y 12 meses
    for mes in range(1, 13):
        mes_inicio = date(2026, mes, 1)
        mes_fin    = date(2026, mes, 28)  # 28 seguro para todos los meses

        # ~15 facturas por mes
        n_mes = random.randint(13, 17)
        for _ in range(n_mes):
            cliente   = random.choice(CLIENTES)
            campana   = random.choice(CAMPANAS_POOL)
            estado    = random.choices(ESTADOS, weights=PESOS, k=1)[0]
            moneda    = random.choice(MONEDAS)
            fecha_em  = fecha_aleatoria(mes_inicio, mes_fin)

            # facturas futuras no pueden estar PAGADAS ni VENCIDAS
            if mes >= 10 and estado in ("PAGADA", "VENCIDA"):
                estado = random.choice(["EMITIDA", "BORRADOR"])

            fid, total, mon = insertar_factura(
                secuencia, cliente, campana, estado, fecha_em, moneda
            )
            secuencia += 1
            total_insertadas += 1
            print(f"  [{total_insertadas:3d}] FAC-2026-{secuencia-1:04d} | {estado:8s} | {mon} {total:>12s} | {cliente['nombre'][:20]}")

    # 20 cotizaciones adicionales
    print("\nGenerando cotizaciones…")
    for i in range(20):
        cliente  = random.choice(CLIENTES)
        items    = generar_items_factura(random.randint(1, 3))
        subtotal, impuesto, total = calcular_totales(items)
        cot_id   = nuevo_uuid()
        fecha_em = fecha_aleatoria(date(2026, 10, 1), date(2026, 11, 9))
        dias_venc = random.choice([10, 15, 20])
        fecha_venc = fecha_em + timedelta(days=dias_venc)
        est_cot  = random.choice(["PENDIENTE", "APROBADA", "RECHAZADA"])

        put_item_seguro({
            "PK":               f"COT#{cot_id}",
            "SK":               "META",
            "cotizacion_id":    cot_id,
            "cliente_id":       cliente["id"],
            "numero_cotizacion": f"COT-2026-{secuencia:04d}",
            "estado":           est_cot,
            "subtotal":         str(subtotal),
            "impuesto_porcentaje": "13",
            "impuesto_monto":   str(impuesto),
            "total":            str(total),
            "moneda":           random.choice(MONEDAS),
            "fecha_emision":    fecha_em.isoformat(),
            "fecha_vencimiento": fecha_venc.isoformat(),
            "notas":            f"Propuesta demo {i+1}",
            "version":          1,
            "GSI1PK":           f"CLI#{cliente['id']}",
            "GSI1SK":           fecha_em.isoformat(),
            "GSI2PK":           f"ESTADO#{est_cot}",
            "GSI2SK":           fecha_venc.isoformat(),
        })
        secuencia += 1
        total_insertadas += 1
        print(f"  [COT {i+1:2d}] {est_cot:9s} | {cliente['nombre'][:25]}")

    print(f"\n✅  {total_insertadas} registros insertados (cabeceras; más ítems/cobros/NCs internos).")
    print(f"   Rango: FAC-2026-0006 → FAC-2026-{secuencia-1:04d}")

    # resumen de scan
    resp = dynamo_cl.scan(TableName=TABLE, Select="COUNT")
    print(f"   Total ítems en tabla ahora: {resp['Count']}")

if __name__ == "__main__":
    main()

