#!/usr/bin/env bash
# Aplica base_de_datos/ms-clientes-crm.mongo.js en la Mongo local. Uso: ./preparar-bd-local.sh [nombre_bd]
# Sin argumento usa adorbit_crm; las pruebas usan adorbit_crm_test (el script oficial no se modifica).
set -euo pipefail
BD="${1:-adorbit_crm}"
RAIZ="$(cd "$(dirname "$0")/../.." && pwd)"
CONTENEDOR="$(docker compose -f "$(dirname "$0")/docker-compose.local.yml" ps -q mongo)"
sed "s/adorbit_crm/${BD}/g" "$RAIZ/base_de_datos/ms-clientes-crm.mongo.js" \
  | docker exec -i "$CONTENEDOR" mongosh --quiet --eval 'db = db.getSiblingDB("admin")' --file /dev/stdin
echo "Base ${BD} lista."
