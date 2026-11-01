#!/usr/bin/env bash
# Crea la tabla en DynamoDB Local usando el script oficial de base_de_datos/.
set -euo pipefail
export AWS_ACCESS_KEY_ID="${AWS_ACCESS_KEY_ID:-local}"
export AWS_SECRET_ACCESS_KEY="${AWS_SECRET_ACCESS_KEY:-local}"
export ENDPOINT="--endpoint-url http://localhost:8000"
bash "$(dirname "$0")/../../base_de_datos/ms-facturacion.dynamodb.sh"
