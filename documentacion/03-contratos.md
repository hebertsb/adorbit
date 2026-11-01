# 03 · Contratos (eventos y API)

> Documento vivo. Cambiar un contrato ⇒ editar aquí en el mismo PR y avisar a los demás.
> Los campos son una **propuesta inicial**; ajustar al implementar.

## Sobre de evento (RabbitMQ)
```json
{ "id_evento": "uuid", "tipo_evento": "FacturaEmitida", "version_esquema": 1,
  "ocurrido_en": "2026-11-05T14:00:00Z", "agregado_id": "uuid",
  "correlacion_id": "saga_id | request_id", "carga": { } }
```
Exchange `adorbit.eventos` (topic), routing key = `tipo_evento` en minúsculas con puntos
(`factura.emitida`). Comandos de SAGA: exchange `adorbit.saga`, cola por servicio (`saga.crm`, ...).

## Catálogo de eventos
| Evento | Publica | Carga mínimo | Consumen |
|---|---|---|---|
| `CampanaCreada` / `CampanaActualizada` | ms-campanas | campana_id, cliente_id, nombre, estado, presupuesto_total, fechas, version | ms-ia |
| `CampanaContratada` | ms-campanas | campana_id, saga_id | ms-ia, n8n |
| `CampanaRechazada` | ms-campanas | campana_id, saga_id, motivo | ms-ia, n8n |
| `ClienteCreado` / `ClienteActualizado` | ms-clientes-crm | cliente_id, razon_social, nit, estado, linea_credito | ms-ia |
| `CreditoReservado` / `CreditoRechazado` / `CreditoLiberado` | ms-clientes-crm | saga_id, cliente_id, campana_id, monto | ms-campanas |
| `BriefRecibido` | ms-creatividades | brief_id, campana_id, titulo | ms-ia (agente creativo) |
| `PiezaSubida` / `PiezaAprobada` | ms-creatividades | pieza_id, campana_id, archivo.ruta, huella_imagen | ms-ia (agente marca) |
| `PiezasBloqueadas` / `BloqueoFallido` / `PiezasDesbloqueadas` | ms-creatividades | saga_id, campana_id, pieza_ids | ms-campanas |
| `FacturaEmitida` / `FacturacionFallida` | ms-facturacion | saga_id, factura_id, cliente_id, campana_id, total, moneda, fecha_vencimiento | ms-campanas, ms-ia |
| `FacturaPagada` | ms-facturacion | factura_id, monto, fecha | ms-ia |
| `NotaCreditoEmitida` | ms-facturacion | saga_id, nota_id, factura_id | ms-campanas |
| `PiezaAnalizada` | ms-ia | pieza_id, manual_marca_ok, confianza | ms-creatividades |
| `AlertaCampana` | ms-ia | campana_id, tipo, detalle | n8n |

## Comandos de la SAGA (ms-campanas → participantes)
| Comando | Destino | Datos | Clave |
|---|---|---|---|
| `ReservarCredito` / `LiberarCredito` | ms-clientes-crm | cliente_id, campana_id, monto, moneda | `sagaId:2:accion\|compensacion` |
| `BloquearPiezas` / `DesbloquearPiezas` | ms-creatividades | campana_id, expira_at | `sagaId:3:...` |
| `EmitirFactura` / `EmitirNotaCredito` | ms-facturacion | cliente_id, campana_id, items[], total | `sagaId:4:...` |

## REST — convenciones
Prefijo `/api/v1`. Escrituras requieren `Idempotency-Key`. Actualizaciones llevan `version` en el cuerpo
(409 si hay conflicto). Paginación `?page=&size=`. Errores `{ "codigo", "mensaje", "detalle" }`.

## REST — endpoints principales (propuesta)
| Servicio | Endpoints |
|---|---|
| ms-campanas | `POST/GET/PUT /campanas`, `GET /campanas/{id}`, `POST /campanas/{id}/contratar`, `GET /sagas/{id}`, `POST/GET /campanas/{id}/presupuesto`, `CRUD /campanas/{id}/calendario` |
| ms-facturacion | `POST/GET /facturas`, `GET /facturas/{id}`, `POST /facturas/{id}/cobros`, `GET /facturas?cliente=&estado=`, `POST /cotizaciones` |
| ms-creatividades | `POST/GET /briefs`, `POST /briefs/{id}/piezas`, `GET /piezas/{id}`, `POST /piezas/{id}/aprobar`, `POST /piezas/{id}/validaciones`, `POST /piezas/{id}/archivo` (URL firmada) |
| ms-clientes-crm | `CRUD /clientes`, `CRUD /clientes/{id}/contactos`, `CRUD /contratos`, `GET /clientes/{id}/credito` |
| ms-ia | `POST /reportes` (lenguaje natural), `GET /reportes/{id}/exportar?formato=pdf\|xlsx`, `POST /vision/analizar`, `GET /agentes`, `POST /agentes/{id}/ejecutar`, `GET /mcp/auditoria` |
| Sincronización móvil | los mismos endpoints REST; cada escritura offline reenvía su `Idempotency-Key` |

## GraphQL (solo portal de gestión)
Gateway federado (Apollo Federation). Subgrafos: campañas, clientes, facturación, creatividades.
Una consulta del portal reúne: campaña + cliente + facturas + piezas. Mutaciones delegan en REST/comandos
del servicio dueño (el gateway **no** tiene lógica de negocio).

## MCP (ms-ia) — herramientas iniciales
`consultar_campanas(estado?, cliente_id?, desde?, hasta?)`, `facturas_por_vencer(dias)`,
`clientes_morosos()`, `resumen_gasto_campana(campana_id)`. Parámetros tipados, sin SQL libre; leen solo
`vista_mcp_*`; cada llamada → `auditoria_mcp` (incluidas las bloqueadas).

## Esquemas formales y OpenAPI
- Cada evento y comando tiene su esquema JSON en `contratos/eventos/<Tipo>.schema.json` (sobre + `carga`).
  Hoy están: `EmitirFactura`, `EmitirNotaCredito`, `FacturaEmitida`, `FacturacionFallida`, `FacturaPagada`,
  `NotaCreditoEmitida`, `ReservarCredito`, `LiberarCredito`, `CreditoReservado`, `CreditoRechazado`,
  `CreditoLiberado`, `ClienteCreado`, `ClienteActualizado`. Los demás se agregan por su dueño.
- OpenAPI en `contratos/openapi/<ms>.yaml` (hoy: `ms-facturacion`, `ms-clientes-crm`).
- **Dinero en JSON = texto decimal** (`"1250.50"`), moneda `BOB|USD`. Nunca número.
- Colas de comandos de la SAGA: `saga.facturacion` y `saga.crm` en el exchange `adorbit.saga`.
- `clave_comando` = `sagaId:orden:tipo` (`orden` 1–5, `tipo` `accion|compensacion`).
- Respuestas a la SAGA (`FacturaEmitida`, `CreditoReservado`, ...) llevan `saga_id` y se publican en
  `adorbit.eventos`; el orquestador correlaciona con `correlacion_id = saga_id`.
- En `FacturacionFallida.motivo` y `CreditoRechazado.motivo` los valores válidos están en el esquema.
