#!/usr/bin/env bash
# Crea las colas de n8n y sus bindings en adorbit.eventos (via API de administracion de RabbitMQ).
# Uso: ./preparar-rabbitmq.sh [url_admin] [usuario:clave]   (por defecto http://localhost:15672 guest:guest)
set -euo pipefail
ADMIN="${1:-http://localhost:15672}"
CRED="${2:-guest:guest}"

api() { curl -fsS -u "$CRED" -H 'content-type: application/json' "$@"; }

# El exchange lo declaran los servicios al arrancar; se asegura aqui con los mismos argumentos.
api -X PUT "$ADMIN/api/exchanges/%2F/adorbit.eventos" \
  -d '{"type":"topic","durable":true,"auto_delete":false,"internal":false,"arguments":{}}' >/dev/null

declarar() {  # cola  clave_enrutamiento
  api -X PUT "$ADMIN/api/queues/%2F/$1" -d '{"durable":true,"auto_delete":false,"arguments":{}}' >/dev/null
  api -X POST "$ADMIN/api/bindings/%2F/e/adorbit.eventos/q/$1" -d "{\"routing_key\":\"$2\"}" >/dev/null
  echo "cola $1  <-  adorbit.eventos [$2]"
}

declarar n8n.factura-emitida factura.emitida
