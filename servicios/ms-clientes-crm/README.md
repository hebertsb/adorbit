# ms-clientes-crm

> PHP 8 · Laravel · MVC por capas · MongoDB Atlas · Responsable: Integrante B

## Alcance
- Clientes, contactos, contratos
- **Línea de crédito** y **reservas de crédito** (SAGA)
- Idempotencia + outbox

## Estructura de código (obligatoria)
```
app/
  Http/Controllers  Http/Requests  Http/Resources   # capa de presentación
  Services/         # CreditoService (transacción atómica), ClienteService
  Repositories/     # acceso a Mongo
  Models/           # Cliente, Contrato, ReservaCredito
  Jobs/             # relay de outbox, consumidor de comandos SAGA
```
(Es la arquitectura clásica de Laravel; las 3 arquitecturas evaluadas están en los otros servicios.)

## API
`/clientes`, `/clientes/{id}/contactos`, `/contratos`, `/clientes/{id}/credito`.

## Eventos
Publica: `ClienteCreado/Actualizado`, `CreditoReservado/Rechazado/Liberado`. Consume: `ReservarCredito`, `LiberarCredito`.

## Base de datos
`base_de_datos/ms-clientes-crm.mongo.js` — colecciones: clientes (con `linea_credito`), contratos, reservas_credito, claves_idempotencia, bandeja_salida_eventos.

Seguridad: JWT de Keycloak, idempotencia en toda escritura, outbox para eventos (ver `AGENTS.md`).

## Tareas (en orden)
1. [ ] Esqueleto Laravel + JWT + `/api/salud` (driver MongoDB)
2. [ ] CRUD clientes/contratos con validación
3. [ ] Reserva atómica de crédito en transacción Mongo (cliente + reserva + outbox)
4. [ ] Liberación idempotente y consumo
5. [ ] Consumidor de comandos SAGA y relay de outbox
6. [ ] Tests: crédito insuficiente, reintento del mismo comando

## Definición de terminado
Caso feliz + idempotencia probados · contrato y BD al día en los `.md` · demostrable en la defensa.
