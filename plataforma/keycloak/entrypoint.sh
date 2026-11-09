#!/bin/sh
# Sustituye __KEYCLOAK_SEED_PASSWORD__ en la plantilla del realm por el valor real
# (variable de entorno KEYCLOAK_SEED_PASSWORD) antes de que Keycloak importe el
# archivo -- asi dominio.json.template puede vivir en git sin ninguna contrasena en
# texto plano (ver documentacion/05-decisiones-y-pendientes.md).
set -e

if [ -z "$KEYCLOAK_SEED_PASSWORD" ]; then
  echo "Falta la variable de entorno KEYCLOAK_SEED_PASSWORD" >&2
  exit 1
fi

if [ -z "$N8N_CLIENT_SECRET" ]; then
  echo "Falta la variable de entorno N8N_CLIENT_SECRET" >&2
  exit 1
fi
if [ -z "$KEYCLOAK_ADMIN_CLIENT_SECRET" ]; then
  echo "Falta la variable de entorno KEYCLOAK_ADMIN_CLIENT_SECRET" >&2
  exit 1
fi

sed -e "s/__KEYCLOAK_SEED_PASSWORD__/$KEYCLOAK_SEED_PASSWORD/g" \
  -e "s/__N8N_CLIENT_SECRET__/$N8N_CLIENT_SECRET/g" \
  -e "s/__KEYCLOAK_ADMIN_CLIENT_SECRET__/$KEYCLOAK_ADMIN_CLIENT_SECRET/g" \
  /opt/keycloak/data/import/dominio.json.template \
  > /opt/keycloak/data/import/dominio.json

exec /opt/keycloak/bin/kc.sh start-dev --import-realm
