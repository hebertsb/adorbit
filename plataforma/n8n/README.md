# n8n — automatización de AdOrbit

Responsable: Integrante B. Flujos exportados (JSON importable) en `flujos/`. Se generan y se prueban contra los
servicios reales (ms-facturacion, ms-clientes-crm), RabbitMQ y un Keycloak simulado.

## Flujos

| # | Flujo | Disparador | Qué hace | Estado |
|---|---|---|---|---|
| 01 | Factura emitida → notificar al cliente | Evento `FacturaEmitida` (cola `n8n.factura-emitida`) | Busca el contacto de facturación en el CRM y le envía el correo. Deduplica por `id_evento` | Probado |
| 02 | Cobranza diaria | Cron 8:00 (y manual) | Marca facturas vencidas (`POST /facturas/vencimientos`), recuerda las vencidas y las que vencen en 3 días (una vez por día) y resume a gerencia. **Solo envía recordatorios: no cambia estados de cobro** | Probado |
| 03 | Reporte semanal | Cron lunes 8:00 (y manual) | Resume facturación por estado y moneda y lo envía a gerencia | Probado |
| 04 | Programar reunión | `POST /webhook/reunion` | Valida, busca el contacto y envía la invitación con adjunto `.ics` | Probado |
| 05 | Pedido → cotización → notificar | `POST /webhook/pedido` | Cotiza en ms-facturacion y envía la cotización. Los reintentos del mismo pedido no reenvían el correo | Probado (crear la campaña en ms-campanas queda **desactivado**, ver pendientes) |

### Contratos de los webhooks
Ambos exigen el encabezado `X-Webhook-Token` (variable `ADORBIT_N8N_WEBHOOK_TOKEN`) y rechazan campos desconocidos.
Errores con la forma `{ codigo, mensaje, detalle }` (400 inválido, 401 sin token, 404 cliente inexistente, 422 sin contacto).

```bash
# reunión: inicio futuro (ISO-8601), duracion_min 15..480 (por defecto 60), notas opcional
curl -H "X-Webhook-Token: $TOKEN" -H 'Content-Type: application/json' localhost:5678/webhook/reunion \
  -d '{"cliente_id":"<uuid>","titulo":"Revisión de campaña","inicio":"2026-11-10T15:00:00Z","duracion_min":45}'

# pedido: 1 a 90 ítems; dinero siempre como texto decimal
curl -H "X-Webhook-Token: $TOKEN" -H 'Content-Type: application/json' localhost:5678/webhook/pedido \
  -d '{"cliente_id":"<uuid>","nombre_campana":"Verano 2027","moneda":"BOB","items":[{"descripcion":"Banner","cantidad":3,"precio_unitario":"500.00"}]}'
```

## Cómo se autentica
Cada flujo pide un token a Keycloak con `client_credentials` (cliente `n8n`) y lo manda como `Bearer`. La cuenta de
servicio necesita el rol **gerente** y las audiencias `ms-facturacion` y `ms-clientes-crm`. Hasta que exista el realm
real (`plataforma/keycloak`) se usa `herramientas/keycloak-simulado.mjs`.

## Variables (las lee n8n con `$env`)
`ADORBIT_KEYCLOAK_TOKEN_URL` · `ADORBIT_N8N_CLIENT_ID` · `ADORBIT_N8N_CLIENT_SECRET` · `ADORBIT_N8N_WEBHOOK_TOKEN` ·
`ADORBIT_FACTURACION_URL` · `ADORBIT_CRM_URL` · `ADORBIT_CAMPANAS_URL` · `ADORBIT_CORREO_REMITENTE` ·
`ADORBIT_CORREO_GERENCIA`. Valores por defecto de desarrollo en `docker-compose.local.yml`; **en producción cambiar los
secretos** y `N8N_ENCRYPTION_KEY`. Las credenciales de n8n (SMTP y RabbitMQ) están en `credenciales.ejemplo.json`.

## Levantarlo en local
```bash
# 1. Servicios (ver el README de cada uno): Mongo+RabbitMQ del CRM, DynamoDB de facturación, y ambos servicios.
node herramientas/keycloak-simulado.mjs &                  # Keycloak simulado en :8180
# (los servicios deben apuntar su JWKS/emisor a http://localhost:8180/realms/adorbit)

# 2. n8n + Mailpit (ver correos en http://localhost:8025)
cd plataforma/n8n
./preparar-rabbitmq.sh                                      # cola n8n.factura-emitida
docker compose -f docker-compose.local.yml run --rm --no-deps --entrypoint n8n n8n import:credentials --input=/credenciales/credenciales.json
docker compose -f docker-compose.local.yml run --rm --no-deps --entrypoint n8n n8n import:workflow --separate --input=/flujos
for id in adorbit-01 adorbit-04 adorbit-05; do   # los de cron (02, 03) se activan solos al publicarlos
  docker compose -f docker-compose.local.yml run --rm --no-deps --entrypoint n8n n8n publish:workflow --id=$id; done
docker compose -f docker-compose.local.yml up -d

# 3. Prueba de humo (13 comprobaciones)
./probar.sh
```
La primera vez que se abre `http://localhost:5678` n8n pide crear la cuenta de propietario (es de la instancia local).
Los flujos 02 y 03 se pueden ejecutar a mano desde el editor (nodo «Ejecutar a mano») o por consola:
`docker compose -f docker-compose.local.yml run --rm --no-deps --entrypoint n8n n8n execute --id=adorbit-02`.

Los flujos se generan con un script a partir de una descripción en Python; para cambiarlos se edita el JSON exportado
desde el editor de n8n (`n8n export:workflow --separate --output=/flujos`) o se regenera. Tras cambiar un flujo hay
que volver a importarlo y publicarlo.

## Decisiones y límites
- **Entrega «al menos una vez»**: el flujo 01 recuerda los últimos 500 `id_evento` y el trigger procesa un mensaje a la
  vez (`parallelMessages: 1`) para que dos copias simultáneas no se salten la deduplicación.
- La memoria entre ejecuciones se guarda como **texto JSON** (los objetos anidados de `staticData` fallan en n8n 2.x).
- Los nodos Code no pueden usar `require('crypto')`: se usa un hash propio de JavaScript solo para claves/UID.
- Los listados toman hasta **100 facturas por estado** (sin paginar); suficiente para la demo.
- `N8N_BLOCK_ENV_ACCESS_IN_NODE=false` es necesario para leer `$env` en los nodos.

## Pendiente (depende de otros integrantes)
| Qué | De quién | Detalle |
|---|---|---|
| Crear la campaña desde el pedido | A (ms-campanas) | El nodo «Crear campana en ms-campanas» del flujo 05 está desactivado hasta que exista `POST /campanas` |
| Avisar `CampanaContratada` / `CampanaRechazada` | A | Cola `n8n.campana-*` y búsqueda del cliente en ms-campanas |
| Tarea programada: liberar bloqueos de piezas vencidos | C (ms-creatividades) | Falta el endpoint que la dispare |
| Tarea programada: compensar SAGAs colgadas | A | Falta el endpoint del orquestador |
| Importar métricas de anuncios | A / C | Falta decidir la fuente (API de anuncios) y dónde se guardan |
| Reporte generativo | C (ms-ia) | Hoy el reporte semanal sale de ms-facturacion; ms-ia podrá enriquecerlo |
