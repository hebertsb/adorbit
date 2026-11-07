#!/usr/bin/env bash
# Levanta, apaga y revisa el sistema AdOrbit completo en local (frontends, servicios, broker e identidad).
# Uso:  herramientas/sistema.sh <comando> [opciones] [servicio...]
#
#   levantar [--equipo] [--construir] [servicio...]   enciende y espera a que respondan
#   apagar   [servicio...]                            apaga los indicados (o todo si no se indica ninguno)
#   reiniciar [servicio...]                           apaga y vuelve a encender
#   estado                                            tabla con el estado y la direccion de cada pieza
#   urls                                              direcciones para abrir en el navegador
#   registros <servicio> [-f]                         ultimas lineas (con -f, en vivo)
#   token [rol]                                       token de prueba del Keycloak simulado (por defecto gerente)
#   demo                                              emite una factura de prueba y espera el correo en Mailpit
#   ayuda
#
# Grupos: "nucleo" (parte del Integrante B) y "equipo" (ms-campanas, ms-creatividades, ms-ia, pasarela).
#   levantar              -> nucleo
#   levantar --equipo     -> nucleo + equipo
#   apagar ms-ia n8n      -> solo esos
# Requisitos: Docker Desktop abierto y infraestructura/.env completo (ver infraestructura/.env.ejemplo).
set -euo pipefail

RAIZ="$(cd "$(dirname "$0")/.." && pwd)"
INFRA="$RAIZ/infraestructura"
COMPOSE=(docker compose -f "$INFRA/docker-compose.completo.yml" --profile equipo)

NUCLEO=(rabbitmq keycloak mailpit ms-facturacion ms-clientes-crm portal-cliente panel-inteligencia n8n)
EQUIPO=(ms-campanas ms-creatividades ms-ia pasarela)
CLIENTE_DEMO="${CLIENTE_DEMO:-0555d3fa-3ceb-4359-82b2-3c4d00902550}"

# nombre | direccion para el navegador | direccion de comprobacion (vacia: solo se mira el contenedor)
PIEZAS=(
  "keycloak|http://localhost:8180|http://localhost:8180/realms/adorbit/protocol/openid-connect/certs"
  "rabbitmq|http://localhost:15672  (guest / guest)|http://localhost:15672"
  "mailpit|http://localhost:8025|http://localhost:8025"
  "ms-facturacion|http://localhost:8082|http://localhost:8082/salud"
  "ms-clientes-crm|http://localhost:8084|http://localhost:8084/api/salud"
  "portal-cliente|http://localhost:4173|http://localhost:4173/salud"
  "panel-inteligencia|http://localhost:4174|http://localhost:4174/salud"
  "n8n|http://localhost:5678|http://localhost:5678/healthz"
  "ms-campanas|http://localhost:8081|http://localhost:8081/salud"
  "ms-creatividades|http://localhost:8083|http://localhost:8083/salud"
  "ms-ia|http://localhost:8085|http://localhost:8085/salud"
  "pasarela|http://localhost:8000  (GraphQL en /graphql)|http://localhost:8000/salud"
)

verde() { printf '\033[32m%-14s\033[0m' "$1"; }
rojo() { printf '\033[31m%-14s\033[0m' "$1"; }
amarillo() { printf '\033[33m%-14s\033[0m' "$1"; }
campo() { echo "$1" | cut -d'|' -f"$2"; }

exigir_docker() {
  docker info >/dev/null 2>&1 || { echo "Docker no esta corriendo. Abre Docker Desktop y vuelve a intentar." >&2; exit 1; }
}

exigir_env() {
  if [ ! -f "$INFRA/.env" ]; then
    cp "$INFRA/.env.ejemplo" "$INFRA/.env"
    echo "Falta infraestructura/.env: se creo desde .env.ejemplo. Completa los secretos (AWS, Mongo, Supabase) y repite." >&2
    exit 1
  fi
  for v in AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY CRM_APP_KEY CRM_MONGO_DSN; do
    grep -Eq "^$v=.+" "$INFRA/.env" || { echo "infraestructura/.env no tiene $v." >&2; exit 1; }
  done
}

direccion_de() {  # servicio -> direccion de comprobacion
  local p
  for p in "${PIEZAS[@]}"; do
    [ "$(campo "$p" 1)" = "$1" ] && { campo "$p" 3; return; }
  done
}

responde() {  # url -> 0 si responde con 2xx/3xx
  [ -n "$1" ] || return 0
  local codigo
  codigo=$(curl -s -o /dev/null -m 3 -w '%{http_code}' "$1" || true)
  [ "${codigo:-000}" -ge 200 ] 2>/dev/null && [ "${codigo:-000}" -lt 400 ]
}

esperar() {  # servicios... -> espera hasta 3 minutos a que respondan
  local limite=$((SECONDS + 180)) s pendientes
  echo "Esperando a que respondan..."
  while :; do
    pendientes=()
    for s in "$@"; do
      responde "$(direccion_de "$s")" || pendientes+=("$s")
    done
    [ "${#pendientes[@]}" -eq 0 ] && { echo "Todo respondiendo."; return 0; }
    if [ "$SECONDS" -ge "$limite" ]; then
      echo "No respondieron a tiempo: ${pendientes[*]}  (revisa con: $0 registros <servicio>)" >&2
      return 1
    fi
    sleep 3
  done
}

servicios_pedidos() {  # imprime los servicios pedidos (argumentos) o el grupo por defecto
  if [ "$#" -gt 0 ]; then printf '%s\n' "$@"; else printf '%s\n' "${NUCLEO[@]}"; fi
}

cmd_levantar() {
  local con_equipo=0 construir=() pedidos=() a
  for a in "$@"; do
    case "$a" in
      --equipo) con_equipo=1 ;;
      --construir) construir=(--build) ;;
      *) pedidos+=("$a") ;;
    esac
  done
  exigir_docker; exigir_env
  local objetivo=()
  if [ "${#pedidos[@]}" -gt 0 ]; then
    objetivo=("${pedidos[@]}")
  else
    objetivo=("${NUCLEO[@]}")
    [ "$con_equipo" -eq 1 ] && objetivo+=("${EQUIPO[@]}")
  fi
  echo "Levantando: ${objetivo[*]}"
  "${COMPOSE[@]}" up -d ${construir[@]+"${construir[@]}"} "${objetivo[@]}"
  esperar "${objetivo[@]}" || true
  cmd_urls
}

cmd_apagar() {
  exigir_docker
  if [ "$#" -gt 0 ]; then
    echo "Apagando: $*"
    "${COMPOSE[@]}" stop "$@"
  else
    echo "Apagando todo el sistema (los datos de AWS y Atlas no se tocan)..."
    "${COMPOSE[@]}" down
  fi
}

cmd_estado() {
  exigir_docker
  printf '%-20s %-14s %s\n' PIEZA ESTADO DIRECCION
  local p nombre dir url corre
  for p in "${PIEZAS[@]}"; do
    nombre=$(campo "$p" 1); dir=$(campo "$p" 2); url=$(campo "$p" 3)
    if docker ps --format '{{.Names}}' | grep -q "^adorbit-$nombre"; then
      corre=$(verde "encendido")
      responde "$url" || corre=$(amarillo "sin respuesta")
    else
      corre=$(rojo "apagado")
    fi
    printf '%-20s %s %s\n' "$nombre" "$corre" "$dir"
  done
}

cmd_urls() {
  echo
  echo "Para abrir en el navegador:"
  echo "  Portal del cliente      http://localhost:4173   (login: rol cliente + cliente_id $CLIENTE_DEMO)"
  echo "  Panel de inteligencia   http://localhost:4174   (login: rol gerente)"
  echo "  n8n                     http://localhost:5678   (la primera vez pide crear tu usuario)"
  echo "  Correos de prueba       http://localhost:8025"
  echo "  RabbitMQ                http://localhost:15672  (guest / guest)"
}

cmd_registros() {
  exigir_docker
  [ "$#" -ge 1 ] || { echo "Uso: $0 registros <servicio> [-f]" >&2; exit 1; }
  local servicio="$1"; shift
  if [ "${1:-}" = "-f" ]; then "${COMPOSE[@]}" logs -f --tail 50 "$servicio"; else "${COMPOSE[@]}" logs --tail 80 "$servicio"; fi
}

cmd_token() {
  curl -s "http://localhost:8180/emitir?roles=${1:-gerente}" | python3 -c "import sys,json;print(json.load(sys.stdin)['access_token'])"
}

cmd_demo() {
  local token total_antes total_despues campana
  token=$(cmd_token gerente)
  campana=$(python3 -c 'import uuid;print(uuid.uuid4())')
  total_antes=$(curl -s localhost:8025/api/v1/messages | python3 -c "import sys,json;print(json.load(sys.stdin)['total'])")
  echo "Emitiendo una factura de prueba para el cliente $CLIENTE_DEMO ..."
  curl -s -X POST localhost:8082/api/v1/facturas -H "Authorization: Bearer $token" -H "Content-Type: application/json" \
    -H "Idempotency-Key: demo-$RANDOM$RANDOM" \
    -d "{\"cliente_id\":\"$CLIENTE_DEMO\",\"campana_id\":\"$campana\",\"moneda\":\"BOB\",\"items\":[{\"descripcion\":\"Spot de radio\",\"cantidad\":2,\"precio_unitario\":\"1500.00\"}]}" \
    | python3 -c "import sys,json;d=json.load(sys.stdin);print('Factura',d.get('id'),'total',d.get('total'),d.get('moneda'))"
  echo "Esperando el correo de n8n en Mailpit (hasta 90 s)..."
  local i
  for i in $(seq 1 30); do
    total_despues=$(curl -s localhost:8025/api/v1/messages | python3 -c "import sys,json;print(json.load(sys.stdin)['total'])")
    if [ "$total_despues" -gt "$total_antes" ]; then echo "Llego el correo. Miralo en http://localhost:8025"; return 0; fi
    sleep 3
  done
  echo "No llego el correo todavia. Revisa: $0 registros n8n" >&2
  return 1
}

cmd_ayuda() { sed -n '2,19p' "$0" | sed 's/^# \{0,1\}//'; }

comando="${1:-ayuda}"; [ "$#" -gt 0 ] && shift
case "$comando" in
  levantar|subir|up) cmd_levantar "$@" ;;
  apagar|bajar|down|parar) cmd_apagar "$@" ;;
  reiniciar) cmd_apagar "$@"; cmd_levantar "$@" ;;
  estado|status) cmd_estado ;;
  urls) cmd_urls ;;
  registros|logs) cmd_registros "$@" ;;
  token) cmd_token "$@" ;;
  demo) cmd_demo ;;
  ayuda|-h|--help) cmd_ayuda ;;
  *) echo "Comando desconocido: $comando" >&2; cmd_ayuda >&2; exit 1 ;;
esac
