#!/usr/bin/env bash
# Carga un cliente de demostracion con contactos, contratos y facturas en todos los estados (solo desarrollo local).
# Requiere: Keycloak simulado, ms-facturacion y ms-clientes-crm levantados; para la factura "vencida" tambien Docker
# (se envejece una factura en DynamoDB Local y se llama a /facturas/vencimientos, como haria la tarea diaria de n8n).
# Uso: herramientas/datos-demo.sh            -> imprime el cliente_id y el JSON de USUARIOS para el Keycloak simulado
set -euo pipefail

KC="${KC:-http://localhost:8180}"; FACT="${FACT:-http://localhost:8082}"; CRM="${CRM:-http://localhost:8084}"
DYNAMO="${DYNAMO:-http://host.docker.internal:8000}"; TABLA="${TABLA:-AdOrbitFacturacion}"
MONGO_CONTENEDOR="${MONGO_CONTENEDOR:-$(docker ps --filter name=ms-clientes-crm-mongo --format '{{.Names}}' | head -1)}"

uuid() { python3 -c 'import uuid;print(uuid.uuid4())'; }
fecha_mas() { python3 -c "import datetime as d,sys;print((d.date.today()+d.timedelta(days=int(sys.argv[1]))).isoformat())" "$1"; }
json() { python3 -c "import sys,json;print(json.load(sys.stdin)$1)"; }

TOKEN=$(curl -fsS "$KC/emitir?roles=gerente" | json "['access_token']"); AUTH="Authorization: Bearer $TOKEN"
enviar() {  # metodo url cuerpo  -> imprime la respuesta
  curl -fsS -X "$1" "$2" -H "$AUTH" -H 'Content-Type: application/json' -H "Idempotency-Key: demo-$(uuid)" -d "$3"
}

echo "Creando cliente…" >&2
CLI=$(enviar POST "$CRM/api/v1/clientes" '{"razon_social":"Distribuidora Sol SRL","nit":"'$RANDOM$RANDOM'","limite_credito":"50000.00","moneda":"BOB"}' | json "['id']")
enviar POST "$CRM/api/v1/clientes/$CLI/contactos" '{"nombre":"Ana Rojas","email":"ana.rojas@sol.bo","telefono":"+59170012345","rol":"facturacion"}' >/dev/null
enviar POST "$CRM/api/v1/clientes/$CLI/contactos" '{"nombre":"Luis Vargas","email":"luis.vargas@sol.bo","rol":"direccion"}' >/dev/null

echo "Contratos…" >&2
enviar POST "$CRM/api/v1/contratos" '{"cliente_id":"'$CLI'","fecha_inicio":"'$(fecha_mas -30)'","fecha_fin":"'$(fecha_mas 335)'","monto":"120000.00","moneda":"BOB"}' >/dev/null
VIEJO=$(enviar POST "$CRM/api/v1/contratos" '{"cliente_id":"'$CLI'","fecha_inicio":"'$(fecha_mas -400)'","fecha_fin":"'$(fecha_mas -35)'","monto":"30000.00","moneda":"BOB"}' | json "['id']")
enviar PUT "$CRM/api/v1/contratos/$VIEJO" '{"fecha_inicio":"'$(fecha_mas -400)'","fecha_fin":"'$(fecha_mas -35)'","monto":"30000.00","moneda":"BOB","version":1,"estado":"vencido"}' >/dev/null

echo "Facturas…" >&2
factura() {  # moneda vencimiento_o_vacio items_json -> id
  local venc=""; [ -n "$2" ] && venc=',"fecha_vencimiento":"'$2'"'
  enviar POST "$FACT/api/v1/facturas" '{"cliente_id":"'$CLI'","campana_id":"'$(uuid)'","moneda":"'$1'"'"$venc"',"items":'"$3"'}' | json "['id']"
}
F_ABIERTA=$(factura BOB "" '[{"descripcion":"Campana de verano - spots de radio","cantidad":4,"precio_unitario":"1500.00"},{"descripcion":"Banner web","cantidad":2,"precio_unitario":"800.00"}]')
F_POR_VENCER=$(factura BOB "$(fecha_mas 3)" '[{"descripcion":"Gigantografia avenida","cantidad":1,"precio_unitario":"4200.00"}]')
F_PARCIAL=$(factura BOB "" '[{"descripcion":"Produccion de video institucional","cantidad":1,"precio_unitario":"9000.00"}]')
F_PAGADA=$(factura BOB "" '[{"descripcion":"Diseno de identidad visual","cantidad":1,"precio_unitario":"3500.00"}]')
F_VENCIDA=$(factura BOB "" '[{"descripcion":"Pauta en redes sociales","cantidad":3,"precio_unitario":"1200.00"}]')
factura USD "" '[{"descripcion":"Licencia de stock de imagenes","cantidad":1,"precio_unitario":"250.00"}]' >/dev/null

TOTAL_PARCIAL=$(enviar POST "$FACT/api/v1/cotizaciones" '{"cliente_id":"'$CLI'","moneda":"BOB","items":[{"descripcion":"x","cantidad":1,"precio_unitario":"9000.00"}]}' | json "['total']")
TOTAL_PAGADA=$(enviar POST "$FACT/api/v1/cotizaciones" '{"cliente_id":"'$CLI'","moneda":"BOB","items":[{"descripcion":"x","cantidad":1,"precio_unitario":"3500.00"}]}' | json "['total']")
enviar POST "$FACT/api/v1/facturas/$F_PARCIAL/cobros" '{"monto":"4000.00","fecha":"'$(fecha_mas -5)'","referencia":"Transferencia 77120"}' >/dev/null
enviar POST "$FACT/api/v1/facturas/$F_PAGADA/cobros" '{"monto":"'$TOTAL_PAGADA'","fecha":"'$(fecha_mas -10)'","referencia":"Deposito 55001"}' >/dev/null
: "$TOTAL_PARCIAL"

if docker info >/dev/null 2>&1; then
  VIEJA=$(fecha_mas -12)
  docker run --rm -e AWS_ACCESS_KEY_ID=local -e AWS_SECRET_ACCESS_KEY=local -e AWS_REGION=us-east-1 amazon/aws-cli \
    --endpoint-url "$DYNAMO" dynamodb update-item --table-name "$TABLA" --key '{"PK":{"S":"FACT#'$F_VENCIDA'"},"SK":{"S":"META"}}' \
    --condition-expression 'attribute_exists(PK)' --update-expression 'SET fecha_vencimiento = :v, GSI2SK = :g' \
    --expression-attribute-values '{":v":{"S":"'$VIEJA'"},":g":{"S":"'$VIEJA'#'$F_VENCIDA'"}}' >/dev/null
  curl -fsS -X POST "$FACT/api/v1/facturas/vencimientos" -H "$AUTH" -H "Idempotency-Key: demo-venc-$(uuid)" >/dev/null
else
  echo "(Docker no responde: la factura vencida queda emitida)" >&2
fi

if [ -n "$MONGO_CONTENEDOR" ]; then  # credito usado, solo para que la barra de la demo tenga datos
  docker exec "$MONGO_CONTENEDOR" mongosh --quiet --eval \
    'db.getSiblingDB("adorbit_crm").clientes.updateOne({id:"'$CLI'"},{$set:{"linea_credito.usado":NumberDecimal("12500.00")}})' >/dev/null
fi

echo "Listo." >&2
echo "cliente_id=$CLI"
echo "USUARIOS='[{\"usuario\":\"ana\",\"nombre\":\"Ana Rojas\",\"roles\":[\"cliente\"],\"cliente_id\":\"$CLI\"},{\"usuario\":\"gerente\",\"nombre\":\"Gerencia\",\"roles\":[\"gerente\"]}]'"
