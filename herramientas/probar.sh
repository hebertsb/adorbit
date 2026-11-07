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

case "$SERVICIO" in
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
    echo "Opciones válidas: ms-campanas, pasarela, ms-creatividades, ms-ia"
    exit 1
    ;;
esac

echo "=== Todas las pruebas solicitadas finalizaron correctamente ==="
