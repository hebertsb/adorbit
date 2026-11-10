#!/usr/bin/env bash
# ============================================================================
# ms-facturacion  |  DynamoDB (AdOrbitFacturacion)  |  DATOS DE SEMILLA
# Pobla la tabla con:
#   - 5 facturas (cabecera + ítems + cobros)
#   - 1 nota de crédito (compensación SAGA)
#   - Registros de idempotencia asociados
# ============================================================================
set -euo pipefail

TABLE="AdOrbitFacturacion"
REGION="${AWS_REGION:-us-east-1}"
ENDPOINT="${ENDPOINT:-}"

echo "======================================================"
echo "  Poblando $TABLE en $REGION"
echo "======================================================"

# ─────────────────────────────────────────────────────────────────────────────
# CLIENTES (UUIDs fijos que deben coincidir con ms-clientes-crm)
# ─────────────────────────────────────────────────────────────────────────────
CLI1="aaaaaaaa-1111-1111-1111-aaaaaaaaaaaa"   # Empresa Alpha S.R.L.
CLI2="bbbbbbbb-2222-2222-2222-bbbbbbbbbbbb"   # Medios Beta S.A.
CLI3="cccccccc-3333-3333-3333-cccccccccccc"   # Gamma Digital S.R.L.

# CAMPAÑAS (UUIDs fijos que deben coincidir con ms-campanas)
CAMP1="11111111-aaaa-aaaa-aaaa-111111111111"
CAMP2="22222222-bbbb-bbbb-bbbb-222222222222"
CAMP3="33333333-cccc-cccc-cccc-333333333333"
CAMP4="44444444-dddd-dddd-dddd-444444444444"
CAMP5="55555555-eeee-eeee-eeee-555555555555"

# IDs de facturas
F1="fact-0001-aaaa-bbbb-cccc-000000000001"
F2="fact-0002-aaaa-bbbb-cccc-000000000002"
F3="fact-0003-aaaa-bbbb-cccc-000000000003"
F4="fact-0004-aaaa-bbbb-cccc-000000000004"
F5="fact-0005-aaaa-bbbb-cccc-000000000005"

# TTL de idempotencia: 30 días desde hoy ≈ epoch 1800000000
IDEMP_TTL="1800000000"
# TTL de outbox: ya publicados se limpian en 7 días
OUTBOX_TTL="1797000000"

echo ""
echo "── FACTURA 1: EMITIDA, cliente Alpha, campaña 1 ──────────────────────"
aws dynamodb transact-write-items $ENDPOINT --region "$REGION" --transact-items "[
  {\"Put\":{\"TableName\":\"$TABLE\",
    \"ConditionExpression\":\"attribute_not_exists(PK)\",
    \"Item\":{
      \"PK\":{\"S\":\"FACT#$F1\"},\"SK\":{\"S\":\"META\"},
      \"factura_id\":{\"S\":\"$F1\"},
      \"cliente_id\":{\"S\":\"$CLI1\"},
      \"campana_id\":{\"S\":\"$CAMP1\"},
      \"numero_factura\":{\"S\":\"FAC-2026-0001\"},
      \"estado\":{\"S\":\"EMITIDA\"},
      \"subtotal\":{\"N\":\"8620.69\"},
      \"impuesto_porcentaje\":{\"N\":\"13\"},
      \"impuesto_monto\":{\"N\":\"1120.69\"},
      \"total\":{\"N\":\"9741.38\"},
      \"moneda\":{\"S\":\"BOB\"},
      \"fecha_emision\":{\"S\":\"2026-10-01\"},
      \"fecha_vencimiento\":{\"S\":\"2026-10-31\"},
      \"notas\":{\"S\":\"Campaña digital Q4 — primer hito\"},
      \"version\":{\"N\":\"1\"},
      \"GSI1PK\":{\"S\":\"CLI#$CLI1\"},\"GSI1SK\":{\"S\":\"2026-10-01\"},
      \"GSI2PK\":{\"S\":\"ESTADO#EMITIDA\"},\"GSI2SK\":{\"S\":\"2026-10-31\"}
    }}},
  {\"Put\":{\"TableName\":\"$TABLE\",\"Item\":{
      \"PK\":{\"S\":\"FACT#$F1\"},\"SK\":{\"S\":\"ITEM#01\"},
      \"descripcion\":{\"S\":\"Producción de spot publicitario 30s\"},
      \"cantidad\":{\"N\":\"1\"},
      \"precio_unitario\":{\"N\":\"5000.00\"},
      \"subtotal\":{\"S\":\"5000.00\"},
      \"moneda\":{\"S\":\"BOB\"}
    }}},
  {\"Put\":{\"TableName\":\"$TABLE\",\"Item\":{
      \"PK\":{\"S\":\"FACT#$F1\"},\"SK\":{\"S\":\"ITEM#02\"},
      \"descripcion\":{\"S\":\"Pauta en redes sociales (Oct 2026)\"},
      \"cantidad\":{\"N\":\"1\"},
      \"precio_unitario\":{\"N\":\"3620.69\"},
      \"subtotal\":{\"S\":\"3620.69\"},
      \"moneda\":{\"S\":\"BOB\"}
    }}},
  {\"Put\":{\"TableName\":\"$TABLE\",
    \"ConditionExpression\":\"attribute_not_exists(PK)\",
    \"Item\":{
      \"PK\":{\"S\":\"IDEMP#emit-fact-$F1\"},\"SK\":{\"S\":\"META\"},
      \"huella_solicitud\":{\"S\":\"sha256:aabbcc1122334455aabbcc1122334455aabbcc1122334455aabbcc1122334455\"},
      \"estado\":{\"S\":\"COMPLETADO\"},
      \"respuesta\":{\"S\":\"{\\\"factura_id\\\":\\\"$F1\\\",\\\"numero_factura\\\":\\\"FAC-2026-0001\\\",\\\"total\\\":9741.38}\"},
      \"vence_epoch\":{\"N\":\"$IDEMP_TTL\"}
    }}}
]"
echo "  ✓ Factura 1 + ítems + idempotencia"

echo ""
echo "── FACTURA 2: PAGADA, cliente Alpha, campaña 2 ───────────────────────"
F2_COBRO="cobro-0001-ffff-eeee-dddd-000000000001"
aws dynamodb transact-write-items $ENDPOINT --region "$REGION" --transact-items "[
  {\"Put\":{\"TableName\":\"$TABLE\",
    \"ConditionExpression\":\"attribute_not_exists(PK)\",
    \"Item\":{
      \"PK\":{\"S\":\"FACT#$F2\"},\"SK\":{\"S\":\"META\"},
      \"factura_id\":{\"S\":\"$F2\"},
      \"cliente_id\":{\"S\":\"$CLI1\"},
      \"campana_id\":{\"S\":\"$CAMP2\"},
      \"numero_factura\":{\"S\":\"FAC-2026-0002\"},
      \"estado\":{\"S\":\"PAGADA\"},
      \"subtotal\":{\"N\":\"21739.13\"},
      \"impuesto_porcentaje\":{\"N\":\"13\"},
      \"impuesto_monto\":{\"N\":\"2826.09\"},
      \"total\":{\"N\":\"24565.22\"},
      \"moneda\":{\"S\":\"BOB\"},
      \"fecha_emision\":{\"S\":\"2026-09-01\"},
      \"fecha_vencimiento\":{\"S\":\"2026-09-30\"},
      \"notas\":{\"S\":\"Campaña TV — temporada verano\"},
      \"version\":{\"N\":\"2\"},
      \"GSI1PK\":{\"S\":\"CLI#$CLI1\"},\"GSI1SK\":{\"S\":\"2026-09-01\"},
      \"GSI2PK\":{\"S\":\"ESTADO#PAGADA\"},\"GSI2SK\":{\"S\":\"2026-09-30\"}
    }}},
  {\"Put\":{\"TableName\":\"$TABLE\",\"Item\":{
      \"PK\":{\"S\":\"FACT#$F2\"},\"SK\":{\"S\":\"ITEM#01\"},
      \"descripcion\":{\"S\":\"Producción audiovisual TV — 60s\"},
      \"cantidad\":{\"N\":\"1\"},
      \"precio_unitario\":{\"N\":\"15000.00\"},
      \"subtotal\":{\"S\":\"15000.00\"},
      \"moneda\":{\"S\":\"BOB\"}
    }}},
  {\"Put\":{\"TableName\":\"$TABLE\",\"Item\":{
      \"PK\":{\"S\":\"FACT#$F2\"},\"SK\":{\"S\":\"ITEM#02\"},
      \"descripcion\":{\"S\":\"Pautas en canales nacionales (5 emisiones)\"},
      \"cantidad\":{\"N\":\"5\"},
      \"precio_unitario\":{\"N\":\"1347.83\"},
      \"subtotal\":{\"S\":\"6739.13\"},
      \"moneda\":{\"S\":\"BOB\"}
    }}},
  {\"Put\":{\"TableName\":\"$TABLE\",\"Item\":{
      \"PK\":{\"S\":\"FACT#$F2\"},\"SK\":{\"S\":\"COBRO#$F2_COBRO\"},
      \"cobro_id\":{\"S\":\"$F2_COBRO\"},
      \"monto\":{\"N\":\"24565.22\"},
      \"moneda\":{\"S\":\"BOB\"},
      \"metodo_pago\":{\"S\":\"TRANSFERENCIA_BANCARIA\"},
      \"referencia\":{\"S\":\"TRF-BNB-20260930-00445\"},
      \"fecha_cobro\":{\"S\":\"2026-09-28\"},
      \"registrado_en\":{\"S\":\"2026-09-28T14:30:00Z\"}
    }}}
]"
echo "  ✓ Factura 2 + ítems + cobro (PAGADA)"

echo ""
echo "── FACTURA 3: VENCIDA, cliente Beta, campaña 3 ───────────────────────"
aws dynamodb transact-write-items $ENDPOINT --region "$REGION" --transact-items "[
  {\"Put\":{\"TableName\":\"$TABLE\",
    \"ConditionExpression\":\"attribute_not_exists(PK)\",
    \"Item\":{
      \"PK\":{\"S\":\"FACT#$F3\"},\"SK\":{\"S\":\"META\"},
      \"factura_id\":{\"S\":\"$F3\"},
      \"cliente_id\":{\"S\":\"$CLI2\"},
      \"campana_id\":{\"S\":\"$CAMP3\"},
      \"numero_factura\":{\"S\":\"FAC-2026-0003\"},
      \"estado\":{\"S\":\"VENCIDA\"},
      \"subtotal\":{\"N\":\"13274.34\"},
      \"impuesto_porcentaje\":{\"N\":\"13\"},
      \"impuesto_monto\":{\"N\":\"1725.66\"},
      \"total\":{\"N\":\"15000.00\"},
      \"moneda\":{\"S\":\"BOB\"},
      \"fecha_emision\":{\"S\":\"2026-08-01\"},
      \"fecha_vencimiento\":{\"S\":\"2026-08-31\"},
      \"notas\":{\"S\":\"Campaña radio — sin respuesta de pago\"},
      \"version\":{\"N\":\"1\"},
      \"GSI1PK\":{\"S\":\"CLI#$CLI2\"},\"GSI1SK\":{\"S\":\"2026-08-01\"},
      \"GSI2PK\":{\"S\":\"ESTADO#VENCIDA\"},\"GSI2SK\":{\"S\":\"2026-08-31\"}
    }}},
  {\"Put\":{\"TableName\":\"$TABLE\",\"Item\":{
      \"PK\":{\"S\":\"FACT#$F3\"},\"SK\":{\"S\":\"ITEM#01\"},
      \"descripcion\":{\"S\":\"Producción cuña radial 30s — 3 versiones\"},
      \"cantidad\":{\"N\":\"3\"},
      \"precio_unitario\":{\"N\":\"2000.00\"},
      \"subtotal\":{\"S\":\"6000.00\"},
      \"moneda\":{\"S\":\"BOB\"}
    }}},
  {\"Put\":{\"TableName\":\"$TABLE\",\"Item\":{
      \"PK\":{\"S\":\"FACT#$F3\"},\"SK\":{\"S\":\"ITEM#02\"},
      \"descripcion\":{\"S\":\"Pauta en emisoras AM/FM (30 días)\"},
      \"cantidad\":{\"N\":\"1\"},
      \"precio_unitario\":{\"N\":\"7274.34\"},
      \"subtotal\":{\"S\":\"7274.34\"},
      \"moneda\":{\"S\":\"BOB\"}
    }}}
]"
echo "  ✓ Factura 3 + ítems (VENCIDA)"

echo ""
echo "── FACTURA 4: BORRADOR, cliente Gamma, campaña 4 ─────────────────────"
aws dynamodb transact-write-items $ENDPOINT --region "$REGION" --transact-items "[
  {\"Put\":{\"TableName\":\"$TABLE\",
    \"ConditionExpression\":\"attribute_not_exists(PK)\",
    \"Item\":{
      \"PK\":{\"S\":\"FACT#$F4\"},\"SK\":{\"S\":\"META\"},
      \"factura_id\":{\"S\":\"$F4\"},
      \"cliente_id\":{\"S\":\"$CLI3\"},
      \"campana_id\":{\"S\":\"$CAMP4\"},
      \"numero_factura\":{\"S\":\"FAC-2026-0004\"},
      \"estado\":{\"S\":\"BORRADOR\"},
      \"subtotal\":{\"N\":\"4424.78\"},
      \"impuesto_porcentaje\":{\"N\":\"13\"},
      \"impuesto_monto\":{\"N\":\"575.22\"},
      \"total\":{\"N\":\"5000.00\"},
      \"moneda\":{\"S\":\"BOB\"},
      \"fecha_emision\":{\"S\":\"2026-11-01\"},
      \"fecha_vencimiento\":{\"S\":\"2026-11-30\"},
      \"notas\":{\"S\":\"Cotización pendiente de aprobación\"},
      \"version\":{\"N\":\"1\"},
      \"GSI1PK\":{\"S\":\"CLI#$CLI3\"},\"GSI1SK\":{\"S\":\"2026-11-01\"},
      \"GSI2PK\":{\"S\":\"ESTADO#BORRADOR\"},\"GSI2SK\":{\"S\":\"2026-11-30\"}
    }}},
  {\"Put\":{\"TableName\":\"$TABLE\",\"Item\":{
      \"PK\":{\"S\":\"FACT#$F4\"},\"SK\":{\"S\":\"ITEM#01\"},
      \"descripcion\":{\"S\":\"Diseño de identidad visual campaña digital\"},
      \"cantidad\":{\"N\":\"1\"},
      \"precio_unitario\":{\"N\":\"2500.00\"},
      \"subtotal\":{\"S\":\"2500.00\"},
      \"moneda\":{\"S\":\"BOB\"}
    }}},
  {\"Put\":{\"TableName\":\"$TABLE\",\"Item\":{
      \"PK\":{\"S\":\"FACT#$F4\"},\"SK\":{\"S\":\"ITEM#02\"},
      \"descripcion\":{\"S\":\"Gestión de redes sociales — 1 mes\"},
      \"cantidad\":{\"N\":\"1\"},
      \"precio_unitario\":{\"N\":\"1924.78\"},
      \"subtotal\":{\"S\":\"1924.78\"},
      \"moneda\":{\"S\":\"BOB\"}
    }}}
]"
echo "  ✓ Factura 4 + ítems (BORRADOR)"

echo ""
echo "── FACTURA 5: ANULADA con NOTA DE CRÉDITO (compensación SAGA) ────────"
F5_NC="nc-0001-9999-8888-7777-000000000001"
aws dynamodb transact-write-items $ENDPOINT --region "$REGION" --transact-items "[
  {\"Put\":{\"TableName\":\"$TABLE\",
    \"ConditionExpression\":\"attribute_not_exists(PK)\",
    \"Item\":{
      \"PK\":{\"S\":\"FACT#$F5\"},\"SK\":{\"S\":\"META\"},
      \"factura_id\":{\"S\":\"$F5\"},
      \"cliente_id\":{\"S\":\"$CLI2\"},
      \"campana_id\":{\"S\":\"$CAMP5\"},
      \"numero_factura\":{\"S\":\"FAC-2026-0005\"},
      \"estado\":{\"S\":\"ANULADA\"},
      \"subtotal\":{\"N\":\"17699.11\"},
      \"impuesto_porcentaje\":{\"N\":\"13\"},
      \"impuesto_monto\":{\"N\":\"2300.89\"},
      \"total\":{\"N\":\"20000.00\"},
      \"moneda\":{\"S\":\"USD\"},
      \"fecha_emision\":{\"S\":\"2026-10-15\"},
      \"fecha_vencimiento\":{\"S\":\"2026-11-14\"},
      \"notas\":{\"S\":\"Campaña cancelada por el cliente — SAGA revertida\"},
      \"version\":{\"N\":\"2\"},
      \"nc_id\":{\"S\":\"$F5_NC\"},
      \"GSI1PK\":{\"S\":\"CLI#$CLI2\"},\"GSI1SK\":{\"S\":\"2026-10-15\"},
      \"GSI2PK\":{\"S\":\"ESTADO#ANULADA\"},\"GSI2SK\":{\"S\":\"2026-11-14\"}
    }}},
  {\"Put\":{\"TableName\":\"$TABLE\",\"Item\":{
      \"PK\":{\"S\":\"FACT#$F5\"},\"SK\":{\"S\":\"ITEM#01\"},
      \"descripcion\":{\"S\":\"Campaña 360° — producción + pauta (USD)\"},
      \"cantidad\":{\"N\":\"1\"},
      \"precio_unitario\":{\"N\":\"17699.11\"},
      \"subtotal\":{\"S\":\"17699.11\"},
      \"moneda\":{\"S\":\"USD\"}
    }}},
  {\"Put\":{\"TableName\":\"$TABLE\",
    \"ConditionExpression\":\"attribute_not_exists(PK)\",
    \"Item\":{
      \"PK\":{\"S\":\"NC#$F5_NC\"},\"SK\":{\"S\":\"META\"},
      \"nc_id\":{\"S\":\"$F5_NC\"},
      \"factura_id_origen\":{\"S\":\"$F5\"},
      \"cliente_id\":{\"S\":\"$CLI2\"},
      \"saga_id\":{\"S\":\"saga-0005-aaaa-bbbb-cccc-000000000005\"},
      \"motivo\":{\"S\":\"SAGA_COMPENSACION\"},
      \"monto\":{\"N\":\"20000.00\"},
      \"moneda\":{\"S\":\"USD\"},
      \"fecha_emision\":{\"S\":\"2026-10-20\"},
      \"numero_nc\":{\"S\":\"NC-2026-0001\"},
      \"version\":{\"N\":\"1\"},
      \"GSI1PK\":{\"S\":\"CLI#$CLI2\"},\"GSI1SK\":{\"S\":\"2026-10-20\"}
    }}}
]"
echo "  ✓ Factura 5 (ANULADA) + Nota de Crédito (compensación SAGA)"

echo ""
echo "── COTIZACION: pendiente de aprobación ───────────────────────────────"
COT1="cotiz-001-aaaa-bbbb-cccc-000000000001"
aws dynamodb put-item $ENDPOINT --region "$REGION" \
  --table-name "$TABLE" \
  --condition-expression "attribute_not_exists(PK)" \
  --item "{
    \"PK\":{\"S\":\"COT#$COT1\"},\"SK\":{\"S\":\"META\"},
    \"cotizacion_id\":{\"S\":\"$COT1\"},
    \"cliente_id\":{\"S\":\"$CLI3\"},
    \"numero_cotizacion\":{\"S\":\"COT-2026-0001\"},
    \"estado\":{\"S\":\"PENDIENTE\"},
    \"subtotal\":{\"N\":\"8849.56\"},
    \"impuesto_porcentaje\":{\"N\":\"13\"},
    \"impuesto_monto\":{\"N\":\"1150.44\"},
    \"total\":{\"N\":\"10000.00\"},
    \"moneda\":{\"S\":\"BOB\"},
    \"fecha_emision\":{\"S\":\"2026-11-05\"},
    \"fecha_vencimiento\":{\"S\":\"2026-11-19\"},
    \"notas\":{\"S\":\"Propuesta campaña fin de año — sujeto a aprobación\"},
    \"version\":{\"N\":\"1\"},
    \"GSI1PK\":{\"S\":\"CLI#$CLI3\"},\"GSI1SK\":{\"S\":\"2026-11-05\"},
    \"GSI2PK\":{\"S\":\"ESTADO#PENDIENTE\"},\"GSI2SK\":{\"S\":\"2026-11-19\"}
  }"
echo "  ✓ Cotización 1 (PENDIENTE)"

echo ""
echo "── REGISTRO DE IDEMPOTENCIA adicional ────────────────────────────────"
aws dynamodb put-item $ENDPOINT --region "$REGION" \
  --table-name "$TABLE" \
  --condition-expression "attribute_not_exists(PK)" \
  --item "{
    \"PK\":{\"S\":\"IDEMP#emit-fact-$F5\"},\"SK\":{\"S\":\"META\"},
    \"huella_solicitud\":{\"S\":\"sha256:ff00ee11dd22cc33bb44aa5566778899ff00ee11dd22cc33bb44aa5566778899\"},
    \"estado\":{\"S\":\"COMPLETADO\"},
    \"respuesta\":{\"S\":\"{\\\"factura_id\\\":\\\"$F5\\\",\\\"numero_factura\\\":\\\"FAC-2026-0005\\\",\\\"total\\\":20000.00}\"},
    \"vence_epoch\":{\"N\":\"$IDEMP_TTL\"}
  }"
echo "  ✓ Idempotencia Factura 5"

echo ""
echo "======================================================"
echo "  ✅  Seed completado exitosamente"
echo "  Resumen:"
echo "    - 5 Facturas (EMITIDA, PAGADA, VENCIDA, BORRADOR, ANULADA)"
echo "    - 9 Ítems de factura"
echo "    - 1 Cobro registrado"
echo "    - 1 Nota de Crédito (compensación SAGA)"
echo "    - 1 Cotización PENDIENTE"
echo "    - 2 registros de idempotencia"
echo "======================================================"

