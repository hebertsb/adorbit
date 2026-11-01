# 01 · Arquitectura

## Visión
AdOrbit integra campañas, clientes, creatividades, facturación y analítica de una agencia
publicitaria, con IA (agentes, ML/DL, MCP) y automatización (n8n). Un solo inicio de sesión (SSO).
Referencia de producto: monday.com (MCP, GraphQL, modo offline parcial). AdOrbit mejora con
detección de conflictos offline, IA en el dispositivo y auditoría de vallas con visión.

## Aplicaciones (frontends)
| App | Usuarios | Tecnología | API que consume |
|---|---|---|---|
| Portal de gestión (**shell**) | ejecutivos, administración | Angular + Module Federation, PWA | **GraphQL** (gateway federado) |
| Remote campañas/creatividades | ejecutivos, creativos | Angular | GraphQL |
| Remote BI / reportes | gerencia | React | REST (ms-ia) |
| Portal del cliente | clientes | React, PWA | REST |
| App móvil de campo | creativos, vendedores | Flutter (Dart) + SQLite | REST |

IA local: web con Transformers.js / WebLLM (WebGPU/WASM); móvil con `tflite_flutter` / ML Kit.

## Microservicios
| Servicio | Responsabilidad | Publica eventos | Consume eventos |
|---|---|---|---|
| **ms-campanas** | Campañas, presupuestos, calendario de medios, **orquestador SAGA** | `CampanaCreada`, `CampanaContratada`, `CampanaRechazada`, `PresupuestoReservado` | respuestas de la SAGA |
| **ms-facturacion** | Cotizaciones, facturas, cobros, notas de crédito, impuestos | `FacturaEmitida`, `FacturaPagada`, `NotaCreditoEmitida` | comandos de la SAGA |
| **ms-creatividades** | Briefs, piezas versionadas, aprobaciones, bloqueo para SAGA | `BriefRecibido`, `PiezaSubida`, `PiezaAprobada`, `PiezaBloqueada` | comandos de la SAGA |
| **ms-clientes-crm** | Clientes, contactos, contratos, línea y reservas de crédito | `ClienteCreado`, `CreditoReservado`, `CreditoLiberado` | comandos de la SAGA |
| **ms-ia** | Agentes (LangGraph), MCP, reportes NL, ML/DL, visión | `AlertaCampana`, `PiezaAnalizada` | todos los eventos de dominio (read model) |

Comunicación: **REST** síncrono entre frontends y servicios (vía gateway); **RabbitMQ** asíncrono entre
servicios. Un **API Gateway** valida el JWT y enruta; el gateway GraphQL (Apollo Federation) solo
atiende al portal de gestión y delega en los servicios.

## Bases de datos (3 motores)
- **PostgreSQL / Supabase** (2 proyectos): ms-campanas y ms-ia. Plan gratuito = 2 proyectos activos.
- **MongoDB / Atlas** (1 clúster, 2 BD): ms-creatividades y ms-clientes-crm.
- **DynamoDB**: ms-facturacion (tabla única `AdOrbitFacturacion`, Streams + TTL).
- **Archivos** (fotos, video, piezas): Supabase Storage o S3. Las BD guardan solo la ruta.
- Esquemas completos en `base_de_datos/`.

## Patrones transversales
### Idempotencia
Tabla/colección `claves_idempotencia` **en cada servicio** (en DynamoDB, ítems `IDEMP#<clave>`).
Flujo de una escritura: leer clave → si existe y `huella_solicitud` coincide ⇒ devolver la respuesta
guardada; si existe con otro hash ⇒ 422; si no existe ⇒ ejecutar la operación **y** guardar clave +
respuesta + evento outbox **en la misma transacción**. Vence a los 14 días (7–30).
### Outbox
Postgres/Mongo: tabla `bandeja_salida_eventos`; un *relay* publica pendientes en RabbitMQ y marca `publicado`.
DynamoDB: ítem `SALIDA#<id>` escrito en la misma `TransactWriteItems`; **DynamoDB Streams** → relay.
### Consumo de eventos
Deduplicar por `id_evento` (ms-ia: tabla `eventos_procesados`); ignorar eventos con versión antigua.
### Offline y conflictos
Cada registro lleva `version`. Móvil: SQLite + tabla `bandeja_salida_local` (clave_idempotencia, tipo, carga,
estado, intentos); `connectivity_plus` detecta red, `workmanager` envía con reintentos exponenciales.
Si el servidor responde 409 (versión más nueva) se avisa al usuario en vez de sobrescribir.
Web: service worker + IndexedDB + Background Sync.
### Seguridad (SSO)
Keycloak (OIDC/OAuth2), roles `ejecutivo|creativo|cliente|gerente`; el gateway valida el JWT y cada
servicio vuelve a validar firma/rol. Un login sirve para todos los portales.

## IA
- **Agentes (ms-ia, LangGraph):** monitor de campañas (cada hora), creativo (al llegar un brief),
  cobranza (diario 8:00, vía n8n), marca (cuando una pieza pasa a "en revisión").
- **ML:** XGBoost/scikit-learn (conversión/ROI, riesgo de impago); K-Means e Isolation Forest
  (segmentación, gasto anómalo). **DL:** YOLO/PyTorch (logos, texto, manual de marca, vallas).
- **MCP:** única vía de acceso de agentes y reportes a los datos (ver regla 8 de `AGENTS.md`).
- **Reportes generativos:** texto/voz → ms-ia interpreta → consulta vía MCP → tabla/gráfico → PDF/Excel.

## n8n (automatización)
Flujo principal: pedido/brief → crear campaña (ms-campanas) → cotización (ms-facturacion) → factura →
notificar cliente. Otros: recordatorios de cobro y reporte semanal; programar reuniones (calendario);
importar métricas de anuncios; job que libera bloqueos de piezas vencidos y compensa SAGAs colgadas.

## Metodología
ICONIX: casos de uso → modelo de dominio → análisis de robustez (frontera/control/entidad) →
diagramas de secuencia. Casos principales: aprobar y contratar campaña; reporte por voz; revisar pieza con IA.
