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

revisar_facturacion() {
  echo "=== [ms-facturacion] Verificando compilación Maven ==="
  mvn -f servicios/ms-facturacion/pom.xml compile -DskipTests -Dspotless.check.skip=true -Dcheckstyle.skip=true
}

revisar_crm() {
  echo "=== [ms-clientes-crm] Verificando sintaxis PHP y Laravel ==="
  php -l servicios/ms-clientes-crm/config/crm.php
  php -l servicios/ms-clientes-crm/app/Mensajeria/ConexionRabbit.php
}

case "$SERVICIO" in
  ms-facturacion)
    revisar_facturacion
    ;;
  ms-clientes-crm)
    revisar_crm
    ;;
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
