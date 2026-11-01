# 07 · Plan de implementación del Integrante B (Luis)

> Alcance: ms-facturacion, ms-clientes-crm, flujos n8n, portal del cliente y módulo remoto de BI.
> Principio: **contrato primero**. Lo que otro integrante necesita para conectarse (esquemas de
> eventos/comandos y OpenAPI) se publica en `contratos/` **antes** de implementar, para que A y C
> puedan trabajar contra él desde el día 1 sin esperar mi código.

## Qué dejo listo para los demás (y cuándo)

| Para | Qué recibe de B | Dónde | Etapa |
|---|---|---|---|
| A (ms-campanas / orquestador) | Esquemas de `EmitirFactura`, `EmitirNotaCredito`, `ReservarCredito`, `LiberarCredito` y de sus respuestas (`FacturaEmitida`, `FacturacionFallida`, `NotaCreditoEmitida`, `CreditoReservado`, `CreditoRechazado`, `CreditoLiberado`) | `contratos/eventos/` | 1 |
| A (pasarela, GraphQL) | OpenAPI de ms-facturacion y ms-clientes-crm | `contratos/openapi/` | 1 |
| C (ms-ia) | Esquemas de `FacturaEmitida`, `FacturaPagada`, `ClienteCreado`, `ClienteActualizado` para el modelo de lectura | `contratos/eventos/` | 1 |
| C (MCP) | Campos de factura/cliente que ms-ia podrá leer (vía eventos, nunca mis BD) | `contratos/eventos/` | 1 |
| A / C (local) | Servicios que arrancan con `/salud` y validan JWT; colas y routing keys documentadas | `servicios/*` | 2 |

Los comandos de la SAGA son del orquestador (A): los dejo como **propuesta** alineada a
`documentacion/02-saga.md`; si A cambia algo, se edita el esquema en el mismo PR.

## Etapas (en orden)

| # | Etapa | Entrega | Hecho cuando |
|---|---|---|---|
| 1 | **Contratos** | Esquemas de eventos y comandos, OpenAPI de facturación y CRM, registro en `05` | A y C pueden leer el contrato y construir sus clientes |
| 2 | **Esqueleto ms-facturacion** (hecho) + verificar con DynamoDB Local | `/salud`, `/listo`, JWT | Servicio arranca contra tabla real |
| 3 | **Dominio de facturación** | `Factura`, ítems, `Cobro`, `NotaCredito`, impuestos, total recalculado | Pruebas unitarias del dominio |
| 4 | **Persistencia con idempotencia** | `TransactWriteItems` (factura + `SALIDA#` + `IDEMP#`); misma clave = misma respuesta; huella distinta = 422 | Prueba de idempotencia contra DynamoDB Local |
| 5 | **API REST de facturación** | `/facturas`, `/cobros`, `/cotizaciones`, consultas GSI1/GSI2 | Contrato OpenAPI cumplido por tests |
| 6 | **Publicador de Streams → RabbitMQ** | Lee `SALIDA#` y publica en `adorbit.eventos` | Evento llega a la cola |
| 7 | **Consumidor SAGA de facturación** | `EmitirFactura` / `EmitirNotaCredito` con clave `sagaId:orden:tipo` | Reenvío no duplica factura |
| 8 | **ms-clientes-crm** | Esqueleto Laravel + JWT + `/api/salud`; CRUD clientes/contactos/contratos | Tarea 1–2 del README del servicio |
| 9 | **Crédito atómico** | `ReservarCredito` / `LiberarCredito` en transacción Mongo + outbox + idempotencia | Casos: crédito insuficiente y reintento |
| 10 | **n8n** | Flujos pedido→factura→notificación, cobranza, reuniones, métricas, tareas | Flujos exportados a `plataforma/n8n/` |
| 11 | **Portal del cliente (React, PWA)** | Facturas, cobros, estado de campañas; responsive 360–1920 px | Probado en celular y escritorio |
| 12 | **Módulo remoto de BI** | Reportes consumiendo ms-ia (REST) | Se carga en el contenedor de A |
| 13 | **Integración y defensa** | 5 casos de la SAGA, datos de demo | Guion ensayado |

## Dependencias que NO controlo

- Keycloak, RabbitMQ y pasarela (A): hasta que existan, pruebo con un JWT de prueba y RabbitMQ local.
- Orquestador (A): hasta que emita comandos reales, pruebo publicando comandos a mano.
- Eventos de C: n/a para facturación; C solo los consume.

## Convenciones propias que fijo en los contratos

- **Dinero en JSON como texto decimal** (`"1250.50"`), nunca número, para no perder precisión
  (regla de `CLAUDE.md`: nunca `float`). Moneda `BOB` | `USD`.
- Estados de factura: `emitida`, `pagada_parcial`, `pagada`, `vencida`, `anulada`.
- Routing key = `tipo_evento` en minúsculas con puntos (`factura.emitida`).
