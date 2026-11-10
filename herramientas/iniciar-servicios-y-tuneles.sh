#!/usr/bin/env bash
# ============================================================================
# Inicia ms-facturacion y ms-clientes-crm en local y genera túneles Cloudflare
# con URLs HTTPS públicas oficiales para conectar con Azure Gateway.
# ============================================================================
set -euo pipefail

RAIZ="/Users/larzekao/Desktop/Universidad/9 no Semestre/ingenieria de software 2/parcial 2/adorbit"
LOG_DIR="$RAIZ/herramientas/logs_ejecucion"
mkdir -p "$LOG_DIR"

echo "=========================================================="
echo "  Iniciando ms-facturacion (8082) y ms-clientes-crm (8084)"
echo "=========================================================="

# Matar instancias previas si existen
lsof -ti:8082 | xargs kill -9 2>/dev/null || true
lsof -ti:8084 | xargs kill -9 2>/dev/null || true
pkill -f "cloudflared tunnel.*8082" 2>/dev/null || true
pkill -f "cloudflared tunnel.*8084" 2>/dev/null || true
sleep 1

# 1. Iniciar ms-facturacion
echo "-> Levantando ms-facturacion..."
cd "$RAIZ/servicios/ms-facturacion"
export $(grep -v '^#' .env | xargs)
export JAVA_HOME="/Library/Java/JavaVirtualMachines/temurin-25.jdk/Contents/Home"
nohup "$JAVA_HOME/bin/java" -jar target/ms-facturacion.jar > "$LOG_DIR/ms-facturacion.log" 2>&1 &
PID_FACT=$!
echo "   PID Facturacion: $PID_FACT"

# 2. Iniciar ms-clientes-crm
echo "-> Levantando ms-clientes-crm..."
cd "$RAIZ/servicios/ms-clientes-crm"
nohup php -S 127.0.0.1:8084 -t public public/index.php > "$LOG_DIR/ms-crm.log" 2>&1 &
PID_CRM=$!
echo "   PID CRM: $PID_CRM"

# Esperar a que respondan /salud
echo "-> Verificando salud de los servicios..."
for i in {1..30}; do
    if curl -fsS http://127.0.0.1:8082/salud >/dev/null 2>&1 && curl -fsS http://127.0.0.1:8084/api/salud >/dev/null 2>&1; then
        echo "   ✅ Ambos microservicios están respondiendo HTTP 200!"
        break
    fi
    sleep 1
done

# 3. Iniciar túnel para ms-facturacion (8082)
echo "-> Creando túnel HTTPS para ms-facturacion..."
nohup cloudflared tunnel --url http://127.0.0.1:8082 > "$LOG_DIR/tunel-facturacion.log" 2>&1 &
PID_TUNEL_FACT=$!

# 4. Iniciar túnel para ms-clientes-crm (8084)
echo "-> Creando túnel HTTPS para ms-clientes-crm..."
nohup cloudflared tunnel --url http://127.0.0.1:8084 > "$LOG_DIR/tunel-crm.log" 2>&1 &
PID_TUNEL_CRM=$!

# Esperar y extraer las URLs generadas por Cloudflare
echo "-> Obteniendo URLs HTTPS públicas..."
URL_FACT=""
URL_CRM=""

for i in {1..30}; do
    if [ -z "$URL_FACT" ]; then
        URL_FACT=$(grep -o 'https://[-a-zA-Z0-9@:%._\+~#=]\+\.trycloudflare\.com' "$LOG_DIR/tunel-facturacion.log" | head -1 || true)
    fi
    if [ -z "$URL_CRM" ]; then
        URL_CRM=$(grep -o 'https://[-a-zA-Z0-9@:%._\+~#=]\+\.trycloudflare\.com' "$LOG_DIR/tunel-crm.log" | head -1 || true)
    fi
    if [ -n "$URL_FACT" ] && [ -n "$URL_CRM" ]; then
        break
    fi
    sleep 1
done

cat <<EOF > "$RAIZ/herramientas/urls-publicas.txt"
ms-facturacion:  $URL_FACT
ms-clientes-crm: $URL_CRM
EOF

echo ""
echo "=========================================================="
echo "  🎉  SERVICIOS Y TÚNELES ACTIVOS EN VIVO"
echo "=========================================================="
echo "  ms-facturacion  : $URL_FACT"
echo "  ms-clientes-crm : $URL_CRM"
echo "=========================================================="
