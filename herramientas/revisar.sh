#!/usr/bin/env bash
# herramientas/revisar.sh
# Análisis estático y verificación básica del servicio indicado

set -e

SERVICIO=${1:-""}

revisar_campanas() {
  echo "=== [ms-campanas] Verificando compilación y estructura Maven ==="
  if [ -f "servicios/ms-campanas/mvnw" ]; then
    ./servicios/ms-campanas/mvnw -f servicios/ms-campanas/pom.xml compile -DskipTests
  else
    mvn -f servicios/ms-campanas/pom.xml compile -DskipTests
  fi
}

revisar_pasarela() {
  echo "=== [pasarela] Verificando sintaxis del esquema GraphQL ==="
  node plataforma/pasarela/tests/esquema.test.js
}

case "$SERVICIO" in
  ms-campanas)
    revisar_campanas
    ;;
  pasarela)
    revisar_pasarela
    ;;
  "")
    echo "Revisando servicios..."
    revisar_campanas
    revisar_pasarela
    ;;
  *)
    echo "Servicio no configurado para revisión: $SERVICIO"
    ;;
esac

echo "=== Revisión finalizada exitosamente ==="
