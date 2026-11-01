#!/usr/bin/env bash
# Prueba de humo de los flujos de n8n contra el entorno local (ver README.md). Falla con codigo != 0 si algo no cumple.
# Requiere: Keycloak simulado (:8180), ms-facturacion (:8082), ms-clientes-crm (:8084), RabbitMQ, n8n y Mailpit levantados.
set -euo pipefail

KC="${KC:-http://localhost:8180}"; FACT="${FACT:-http://localhost:8082}"; CRM="${CRM:-http://localhost:8084}"
N8N="${N8N:-http://localhost:5678}"; MAIL="${MAIL:-http://localhost:8025}"; RABBIT="${RABBIT:-http://localhost:15672}"
WEBHOOK_TOKEN="${ADORBIT_N8N_WEBHOOK_TOKEN:-token-webhook-local}"
fallos=0
ok()   { echo "  ✓ $1"; }
mal()  { echo "  ✗ $1"; fallos=$((fallos + 1)); }
espera() { sleep "${1:-4}"; }
correos() { curl -fsS "$MAIL/api/v1/messages" | python3 -c 'import sys,json;print(json.load(sys.stdin)["total"])'; }
vaciar() { curl -fsS -X DELETE "$MAIL/api/v1/messages" >/dev/null; }
esperado() { [ "$2" = "$3" ] && ok "$1: $2" || mal "$1: se esperaba $3 y hubo $2"; }
json() { python3 -c "import sys,json;print(json.load(sys.stdin)$1)"; }

TOKEN=$(curl -fsS "$KC/emitir?roles=ejecutivo" | json "['access_token']"); AUTH="Authorization: Bearer $TOKEN"
uuid() { python3 -c 'import uuid;print(uuid.uuid4())'; }
post() { curl -s -o /tmp/n8n_resp.json -w '%{http_code}' -H "X-Webhook-Token: $WEBHOOK_TOKEN" -H 'Content-Type: application/json' -d "$2" "$N8N/webhook/$1"; }

echo "Preparando un cliente con contacto de facturacion"
CLI=$(curl -fsS -X POST "$CRM/api/v1/clientes" -H "$AUTH" -H 'Content-Type: application/json' -H "Idempotency-Key: probar-$(uuid)" \
  -d '{"razon_social":"Cliente de prueba n8n","nit":"'$RANDOM$RANDOM'","limite_credito":"10000.00"}' | json "['id']")
curl -fsS -o /dev/null -X POST "$CRM/api/v1/clientes/$CLI/contactos" -H "$AUTH" -H 'Content-Type: application/json' -H "Idempotency-Key: probar-$(uuid)" \
  -d '{"nombre":"Contacto Prueba","email":"contacto.prueba@cliente.test","rol":"facturacion"}'

echo "01 · Factura emitida -> correo al cliente"
vaciar
curl -fsS -o /dev/null -X POST "$FACT/api/v1/facturas" -H "$AUTH" -H 'Content-Type: application/json' -H "Idempotency-Key: probar-$(uuid)" \
  -d '{"cliente_id":"'$CLI'","campana_id":"'$(uuid)'","moneda":"BOB","items":[{"descripcion":"Spot","cantidad":1,"precio_unitario":"100.00"}]}'
espera 8
esperado "correo de factura" "$(correos)" 1

echo "01 · El mismo evento entregado 3 veces envia un solo correo"
vaciar
EV='{"id_evento":"'$(uuid)'","tipo_evento":"FacturaEmitida","version_esquema":1,"ocurrido_en":"2026-11-01T20:00:00Z","agregado_id":"'$(uuid)'","correlacion_id":"x","carga":{"factura_id":"'$(uuid)'","cliente_id":"'$CLI'","campana_id":"'$(uuid)'","total":"50.00","moneda":"BOB","fecha_vencimiento":"2027-01-01"}}'
CUERPO=$(python3 -c "import json,sys;print(json.dumps({'properties':{'content_type':'application/json'},'routing_key':'factura.emitida','payload':sys.argv[1],'payload_encoding':'string'}))" "$EV")
for _ in 1 2 3; do curl -fsS -u guest:guest -H 'content-type: application/json' -X POST "$RABBIT/api/exchanges/%2F/adorbit.eventos/publish" -d "$CUERPO" >/dev/null; done
espera 7
esperado "correos por evento duplicado" "$(correos)" 1

echo "04 · Reunion -> invitacion con adjunto .ics"
vaciar
INICIO=$(python3 -c "import datetime as d;print((d.datetime.now(d.UTC)+d.timedelta(days=3)).strftime('%Y-%m-%dT15:00:00Z'))")
esperado "reunion valida (HTTP)" "$(post reunion '{"cliente_id":"'$CLI'","titulo":"Revision","inicio":"'$INICIO'","duracion_min":30}')" 200
espera 3
ADJ=$(curl -fsS "$MAIL/api/v1/messages" | json "['messages'][0]['Attachments']")
esperado "adjuntos de la invitacion" "$ADJ" 1
esperado "reunion con campos invalidos (HTTP)" "$(post reunion '{"cliente_id":"x","extra":1}')" 400
esperado "reunion con cliente inexistente (HTTP)" "$(post reunion '{"cliente_id":"'$(uuid)'","titulo":"X","inicio":"'$INICIO'"}')" 404
CODE=$(curl -s -o /dev/null -w '%{http_code}' -H 'X-Webhook-Token: incorrecto' -H 'Content-Type: application/json' -d '{}' "$N8N/webhook/reunion")
esperado "reunion con token incorrecto (HTTP)" "$CODE" 401

echo "05 · Pedido -> cotizacion"
vaciar
PED='{"cliente_id":"'$CLI'","nombre_campana":"Campana '$RANDOM'","moneda":"BOB","items":[{"descripcion":"Banner","cantidad":3,"precio_unitario":"500.00"}]}'
esperado "pedido valido (HTTP)" "$(post pedido "$PED")" 201
esperado "total de la cotizacion" "$(json "['cotizacion']['total']" < /tmp/n8n_resp.json)" 1695.00
espera 3
esperado "correo de cotizacion" "$(correos)" 1
vaciar
esperado "reintento del mismo pedido (HTTP)" "$(post pedido "$PED")" 201
espera 3
esperado "correos tras el reintento" "$(correos)" 0
esperado "pedido invalido (HTTP)" "$(post pedido '{"moneda":"EUR","items":[]}')" 400

echo
[ "$fallos" -eq 0 ] && echo "Todo bien." || { echo "$fallos comprobaciones fallaron."; exit 1; }
