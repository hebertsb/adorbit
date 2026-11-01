#!/usr/bin/env bash
# ============================================================================
# ms-facturacion  |  DynamoDB (single-table)  |  Arquitectura Hexagonal
# Tabla unica: AdOrbitFacturacion
#
# MODELO DE CLAVES
# ----------------------------------------------------------------------------
# Entidad            PK                SK                 GSI1 (cliente)            GSI2 (estado)
# Factura (cabecera) FACT#<id>         META               CLI#<cliente> / <fecha>   ESTADO#<estado> / <fechaVenc>
# Item de factura    FACT#<id>         ITEM#<nn>          -                         -
# Cobro / pago       FACT#<id>         COBRO#<id>         -                         -
# Nota de credito    NC#<id>           META               CLI#<cliente> / <fecha>   -
#                    (SAGA: compensacion de "facturar"; guarda factura_id origen)
# Idempotencia       IDEMP#<clave>     META               -                         -
#                    (atributos: huella_solicitud, respuesta, estado, vence_epoch)
# Outbox             SALIDA#<idEvento> META               -                         -
#                    (atributos: tipo_evento, agregado_id, carga, creado_en, vence_epoch)
#
# Consultas:
#   - Factura completa:            Query PK = FACT#<id>
#   - Facturas de un cliente:      Query GSI1 con GSI1PK = CLI#<cliente>
#   - Facturas vencidas/por estado: Query GSI2 con GSI2PK = ESTADO#<estado>
#
# Escritura: factura + outbox + idempotencia SIEMPRE en una TransactWriteItems.
# Outbox: un relay lee DynamoDB Streams (INSERT con PK que empieza en SALIDA#)
#         y publica en RabbitMQ (entrega al menos una vez).
# ============================================================================
set -euo pipefail

TABLE="AdOrbitFacturacion"
REGION="${AWS_REGION:-us-east-1}"
# Para DynamoDB local: export ENDPOINT="--endpoint-url http://localhost:8000"
ENDPOINT="${ENDPOINT:-}"

aws dynamodb create-table $ENDPOINT --region "$REGION" \
  --table-name "$TABLE" \
  --billing-mode PAY_PER_REQUEST \
  --attribute-definitions \
      AttributeName=PK,AttributeType=S \
      AttributeName=SK,AttributeType=S \
      AttributeName=GSI1PK,AttributeType=S \
      AttributeName=GSI1SK,AttributeType=S \
      AttributeName=GSI2PK,AttributeType=S \
      AttributeName=GSI2SK,AttributeType=S \
  --key-schema \
      AttributeName=PK,KeyType=HASH \
      AttributeName=SK,KeyType=RANGE \
  --global-secondary-indexes '[
    {
      "IndexName": "GSI1-ClienteFecha",
      "KeySchema": [
        {"AttributeName": "GSI1PK", "KeyType": "HASH"},
        {"AttributeName": "GSI1SK", "KeyType": "RANGE"}
      ],
      "Projection": {"ProjectionType": "ALL"}
    },
    {
      "IndexName": "GSI2-EstadoVencimiento",
      "KeySchema": [
        {"AttributeName": "GSI2PK", "KeyType": "HASH"},
        {"AttributeName": "GSI2SK", "KeyType": "RANGE"}
      ],
      "Projection": {"ProjectionType": "ALL"}
    }
  ]' \
  --stream-specification StreamEnabled=true,StreamViewType=NEW_IMAGE \
  --sse-specification Enabled=true

aws dynamodb wait table-exists $ENDPOINT --region "$REGION" --table-name "$TABLE"

# TTL: limpia claves de idempotencia (7-30 dias) y eventos de la bandeja de salida ya publicados
aws dynamodb update-time-to-live $ENDPOINT --region "$REGION" \
  --table-name "$TABLE" \
  --time-to-live-specification "Enabled=true,AttributeName=vence_epoch"

# Proteccion ante borrado accidental (omitir en DynamoDB local)
# aws dynamodb update-table --region "$REGION" --table-name "$TABLE" --deletion-protection-enabled

echo "Tabla $TABLE lista (Streams NEW_IMAGE + TTL vence_epoch)."

# ----------------------------------------------------------------------------
# Datos de ejemplo (borrar si no se quieren) - muestra el patron de claves
# ----------------------------------------------------------------------------
# aws dynamodb transact-write-items $ENDPOINT --region "$REGION" --transact-items '[
#  {"Put":{"TableName":"AdOrbitFacturacion","ConditionExpression":"attribute_not_exists(PK)","Item":{
#    "PK":{"S":"FACT#a91b"},"SK":{"S":"META"},
#    "cliente_id":{"S":"11111111-1111-1111-1111-111111111111"},
#    "campana_id":{"S":"22222222-2222-2222-2222-222222222222"},
#    "estado":{"S":"EMITIDA"},"total":{"N":"12500"},"moneda":{"S":"BOB"},
#    "fecha_emision":{"S":"2026-10-31"},"fecha_vencimiento":{"S":"2026-11-30"},
#    "version":{"N":"1"},
#    "GSI1PK":{"S":"CLI#11111111-1111-1111-1111-111111111111"},"GSI1SK":{"S":"2026-10-31"},
#    "GSI2PK":{"S":"ESTADO#EMITIDA"},"GSI2SK":{"S":"2026-11-30"}}}},
#  {"Put":{"TableName":"AdOrbitFacturacion","Item":{
#    "PK":{"S":"SALIDA#7c1f"},"SK":{"S":"META"},
#    "tipo_evento":{"S":"FacturaEmitida"},"agregado_id":{"S":"FACT#a91b"},
#    "carga":{"S":"{\"id_evento\":\"7c1f\",\"factura_id\":\"a91b\",\"total\":12500}"},
#    "creado_en":{"S":"2026-10-31T21:50:00Z"},"vence_epoch":{"N":"1793500000"}}}},
#  {"Put":{"TableName":"AdOrbitFacturacion","ConditionExpression":"attribute_not_exists(PK) OR #t < :ahora",
#    "ExpressionAttributeNames":{"#t":"vence_epoch"},"ExpressionAttributeValues":{":ahora":{"N":"1793000000"}},
#    "Item":{"PK":{"S":"IDEMP#clave-123"},"SK":{"S":"META"},
#    "huella_solicitud":{"S":"sha256..."},"estado":{"S":"COMPLETADO"},
#    "respuesta":{"S":"{\"factura_id\":\"a91b\"}"},"vence_epoch":{"N":"1795600000"}}}}
# ]'
