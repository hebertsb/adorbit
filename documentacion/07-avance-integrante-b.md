# Avance del Integrante B (Luis Angel) — estado al 7 de noviembre de 2026

Resumen de todo lo construido, probado y pendiente en la parte del Integrante B: **ms-facturacion**, **ms-clientes-crm**,
**n8n**, **portal-cliente** y **panel-inteligencia**, más la infraestructura para levantar el sistema completo.
El detalle de contratos está en `03-contratos.md`; las decisiones y limitaciones, en `05-decisiones-y-pendientes.md`.

## 1. Qué se construyó

### ms-facturacion (Java 21 · Spring Boot · Hexagonal · DynamoDB)
- Dominio: factura (emisión, cobros, vencimiento, anulación), cobro y **nota de crédito**; el total se recalcula en el
  servidor (impuesto 13 %) y una factura emitida no se edita ni se borra.
- API REST (`/api/v1/facturas`, cobros, cotizaciones, vencimientos) con roles, errores uniformes
  `{ codigo, mensaje, detalle }` y validación JWT (firma, emisor, audiencia y rol; el rol `cliente` solo ve lo suyo).
- Tabla única `AdOrbitFacturacion` (PK/SK, GSI1-ClienteFecha, GSI2-EstadoVencimiento, Streams `NEW_IMAGE`, TTL
  `vence_epoch`). La factura, su evento de salida (`SALIDA#`) y la clave de idempotencia (`IDEMP#`) se escriben en **una
  sola** `TransactWriteItems`.
- Relevo (Streams → RabbitMQ) con entrega al menos una vez, y consumidor de comandos SAGA `EmitirFactura` /
  `EmitirNotaCredito` (cola `saga.facturacion`, DLQ `saga.facturacion.dlq`, reintentos).
- Pruebas: 41 unitarias y de controlador, más pruebas de integración contra DynamoDB y RabbitMQ.

### ms-clientes-crm (PHP · Laravel · MVC por capas · MongoDB Atlas)
- Clientes, contactos, contratos, línea de crédito y reservas de crédito atómicas para la SAGA
  (reservar / liberar / consumir), idempotencia y bandeja de salida de eventos.
- Esquema en `base_de_datos/ms-clientes-crm.mongo.js` (validadores `$jsonSchema`, índices únicos y parciales).
- Pruebas: 52 (49 pasan, 3 omitidas), también contra Atlas.

### n8n (5 flujos, `plataforma/n8n/flujos`)
1. Factura emitida → correo al contacto de facturación (deduplica por `id_evento`).
2. Cobranza diaria (vencidas y por vencer; solo recordatorios).
3. Reporte semanal a gerencia.
4. Programar reunión (webhook, adjunto `.ics`).
5. Pedido → cotización → correo al cliente y creación de campaña en ms-campanas con `Idempotency-Key` (100% conectado).
Plantilla de correos unificada y responsive con diseño corporativo: tarjeta centrada, logotipo oficial SVG de AdOrbit, píldora de automatización, línea de gradiente de marca y pie institucional.

### portal-cliente y panel-inteligencia (React · PWA / módulo remoto)
- Portal del cliente: login OIDC con PKCE, facturas y CRM, caché sin conexión por usuario, renovación silenciosa de sesión.
- Panel de inteligencia: reportes por texto y voz, gráficos de barras y línea, exportación a PDF y Excel; modo
  independiente y remoto de Module Federation.

### Herramientas y contratos
- `herramientas/keycloak-simulado.mjs` (emite JWT con `aud` y `realm_access`, PKCE, refresh), `datos-demo.sh`, `probar.sh`.
- Esquemas de eventos y OpenAPI de facturación y CRM en `contratos/`.

## 2. Correcciones de la revisión de código (ms-facturacion)
- La nota de crédito revierte el **saldo pendiente**, no el total bruto.
- `EmitirNotaCredito` guarda y compara la huella de la solicitud (misma clave con otra factura → conflicto).
- `correlacion_id` acotado a 100 caracteres (SHA-256 si la clave es más larga).
- `adorbit.saga` pasa a **exchange direct**, igual que el broker compartido.
- Limitaciones conocidas documentadas en `05-decisiones-y-pendientes.md`.

## 3. Pruebas contra infraestructura real
| Qué | Contra qué | Resultado |
|---|---|---|
| ms-facturacion (REST, idempotencia, cobros) | DynamoDB en AWS (`us-east-1`) | Correcto |
| SAGA de ms-facturacion (5 comprobaciones) | CloudAMQP compartido + DynamoDB | 5/5 |
| ms-clientes-crm | MongoDB Atlas (base de pruebas aparte) | 52 pruebas sin fallos |
| Cadena completa | CRM → facturación → relevo → RabbitMQ → n8n → correo (Mailpit) | Correcto |

## 4. AWS
- Cuenta `006419716393`, región `us-east-1`; usuario IAM `adorbit-despliegue` (DynamoDB).
- Tabla `AdOrbitFacturacion` activa, facturación por uso. **No hay ningún servicio desplegado en AWS**: la base está en la
  nube y el servicio corre en local.

## 5. Sistema completo en local (`infraestructura/docker-compose.completo.yml`)
Levanta en una sola red: Keycloak simulado, RabbitMQ, ms-facturacion, ms-clientes-crm, portal-cliente,
panel-inteligencia, n8n y Mailpit; con `--profile equipo` agrega ms-campanas, ms-creatividades, ms-ia y la pasarela.
Los secretos van en `infraestructura/.env` (ver `infraestructura/.env.ejemplo`; el `.env` no se versiona).

Correcciones hechas a archivos compartidos al levantar el sistema:
- `plataforma/rabbitmq`: claves inválidas en `rabbitmq.conf`, hash inválido de `guest` y cola `saga.facturacion`
  declarada con argumentos distintos a los del servicio (error 406).
- `plataforma/pasarela`: el proxy perdía la ruta de cada petición (http-proxy-middleware v3 con `app.use`); ahora reenvía
  la URL original.
- `aplicaciones/*/seguridad.inc`: un comentario partido en dos líneas hacía fallar a nginx.
- `ms-facturacion`: el relevo de Streams se rendía en la primera página vacía; ahora recorre el fragmento, conserva el
  iterador y omite los fragmentos agotados.

## 6. Pendiente
- Keycloak real: el realm no emite `aud` por servicio ni tiene los clientes `portal-cliente`, `panel-inteligencia` y `n8n`.
- Probar el portal en Chrome (sin conexión y voz) y el panel contra ms-ia real.
- Dónde se despliega ms-facturacion en la entrega (`infraestructura/despliegue/aws/` sigue vacío).
- `mvn spotless:apply` con red antes de fusionar el PR, y su revisión por otro integrante.
- Consumidores (ms-ia) deben deduplicar por `id_evento`.

Completado el 9 de noviembre: perfil `equipo` levantado y cinco escenarios integrados de la SAGA aprobados, incluidos fallo de facturacion, compensaciones, reenvio idempotente y respuesta tardia con nota de credito.
