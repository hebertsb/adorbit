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

sed "s/__KEYCLOAK_SEED_PASSWORD__/$KEYCLOAK_SEED_PASSWORD/g" \
  /opt/keycloak/data/import/dominio.json.template \
  > /opt/keycloak/data/import/dominio.json

exec /opt/keycloak/bin/kc.sh start-dev --import-realm
