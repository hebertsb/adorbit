# ms-facturacion

> Java 21 · Spring Boot · **Hexagonal** · DynamoDB (tabla única) · Responsable: Integrante B

## Alcance
- Cotizaciones, facturas, ítems, cobros
- Notas de crédito (compensación de SAGA)
- Impuestos
- Idempotencia + outbox en la misma `TransactWriteItems`
- Relay: DynamoDB Streams → RabbitMQ

## Estructura de código (obligatoria)
```
src/main/java/.../facturacion
  domain/            # Factura, Cobro, NotaCredito, reglas (sin dependencias externas)
  application/
    port/in/         # casos de uso (EmitirFactura, RegistrarCobro, EmitirNotaCredito)
    port/out/        # FacturaRepositoryPort, EventPublisherPort, IdempotencyPort
  adapter/
    in/rest, in/messaging   # controllers REST y consumidor de comandos SAGA
    out/dynamodb, out/rabbit # adaptadores
```
El dominio no importa DynamoDB ni RabbitMQ.

## API
`/facturas`, `/facturas/{id}`, `/facturas/{id}/cobros`, `/cotizaciones` (ver `documentacion/03-contratos.md`).

## Eventos
Publica: `FacturaEmitida`, `FacturaPagada`, `NotaCreditoEmitida`, `FacturacionFallida`. Consume: `EmitirFactura`, `EmitirNotaCredito`.

## Base de datos
`base_de_datos/ms-facturacion.dynamodb.sh` — claves: `FACT#id` (META/ITEM#n/COBRO#id), `NC#id`, `IDEMP#clave`, `SALIDA#id`; GSI1 cliente/fecha, GSI2 estado/vencimiento; Streams NEW_IMAGE; TTL `vence_epoch`.

Seguridad: JWT de Keycloak, idempotencia en toda escritura, outbox para eventos (ver `AGENTS.md`).

## Tareas (en orden)
1. [ ] Esqueleto + JWT + `/salud` + tabla creada
2. [ ] Dominio y puertos (dominio hecho: Factura, Cobro, NotaCredito, Dinero); adaptador DynamoDB
3. [ ] `TransactWriteItems` (factura + OUTBOX + IDEMP; si la clave existe, comparar hash y devolver respuesta)
4. [ ] Relay de Streams a RabbitMQ (filtrar `SALIDA#`)
5. [ ] Consumidor de comandos SAGA (+ nota de crédito)
6. [ ] Consultas por GSI1/GSI2; tests de idempotencia

## Definición de terminado
Caso feliz + idempotencia probados · contrato y BD al día en los `.md` · demostrable en la defensa.
