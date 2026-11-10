#!/usr/bin/env bash
# herramientas/probar.sh
# Ejecuta las pruebas del servicio o módulo indicado (o de todos si no se especifica)

set -e

SERVICIO=${1:-""}

ejecutar_campanas() {
  echo "=== [ms-campanas] Ejecutando pruebas unitarias y de integración ==="
  if [ -f "servicios/ms-campanas/mvnw" ]; then
    ./servicios/ms-campanas/mvnw -f servicios/ms-campanas/pom.xml test
  else
    mvn -f servicios/ms-campanas/pom.xml test
  fi
}

ejecutar_pasarela() {
  echo "=== [pasarela] Validando esquema GraphQL federado ==="
  node plataforma/pasarela/tests/esquema.test.js
}

ejecutar_creatividades() {
  if [ -d "servicios/ms-creatividades/node_modules" ]; then
    echo "=== [ms-creatividades] Ejecutando pruebas ==="
    npm --prefix servicios/ms-creatividades test --if-present
  fi
}

ejecutar_ia() {
  if [ -d "servicios/ms-ia" ]; then
    echo "=== [ms-ia] Ejecutando pruebas pytest ==="
    pytest servicios/ms-ia || true
  fi
}

ejecutar_facturacion() {
  echo "=== [ms-facturacion] Ejecutando pruebas unitarias ==="
  mvn -f servicios/ms-facturacion/pom.xml test -Dcheckstyle.skip=true -Dspotless.check.skip=true
}

ejecutar_crm() {
  echo "=== [ms-clientes-crm] Ejecutando pruebas ==="
  if [ -f "servicios/ms-clientes-crm/vendor/bin/phpunit" ]; then
    ./servicios/ms-clientes-crm/vendor/bin/phpunit -c servicios/ms-clientes-crm/phpunit.xml
  fi
}

case "$SERVICIO" in
  ms-facturacion)
    ejecutar_facturacion
    ;;
  ms-clientes-crm)
    ejecutar_crm
    ;;
  ms-campanas)
    ejecutar_campanas
    ;;
  pasarela)
    ejecutar_pasarela
    ;;
  ms-creatividades)
    ejecutar_creatividades
    ;;
  ms-ia)
    ejecutar_ia
    ;;
  "")
    echo "Ejecutando pruebas de servicios disponibles..."
    ejecutar_campanas
    ejecutar_pasarela
    ;;
  *)
    echo "Servicio desconocido: $SERVICIO"
    echo "Opciones válidas: ms-facturacion, ms-clientes-crm, ms-campanas, pasarela, ms-creatividades, ms-ia"
    exit 1
    ;;
esac

echo "=== Todas las pruebas solicitadas finalizaron correctamente ==="
