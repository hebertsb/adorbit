# ms-campanas

> Java 21 · Spring Boot · **DDD** · PostgreSQL (Supabase #1) · Responsable: Integrante A

## Alcance
- Campañas (CRUD, estados, versionado)
- Presupuestos (reservar/liberar/consumir)
- Calendario de medios
- **Orquestador de la SAGA** (estado, comandos, compensaciones, timeouts)
- Outbox + relay a RabbitMQ

## Estructura de código (obligatoria)
```
src/main/java/.../campanas
  domain/        # Campana, Presupuesto, CalendarioMedios (agregados), VOs, eventos de dominio, repos (interfaces)
  application/   # casos de uso: CrearCampana, ContratarCampana, ReservarPresupuesto, SagaOrchestrator
  infrastructure/# JPA, RabbitMQ, outbox relay, REST controllers, config
```
Reglas DDD: agregados con invariantes (monto_gastado <= monto_total), IDs UUID, eventos de dominio → outbox.

## API
`/campanas`, `/campanas/{id}/contratar`, `/sagas/{id}`, `/campanas/{id}/presupuesto`, `/campanas/{id}/calendario` (ver `documentacion/03-contratos.md`).

## Eventos
Publica: `CampanaCreada/Actualizada/Contratada/Rechazada`, comandos de SAGA. Consume: respuestas de la SAGA.

## Base de datos
`base_de_datos/ms-campanas.postgres.sql` — tablas: campanas, presupuestos, calendario_medios, saga_transacciones, saga_pasos, claves_idempotencia, bandeja_salida_eventos.

Seguridad: JWT de Keycloak, idempotencia en toda escritura, outbox para eventos (ver `AGENTS.md`).

## Tareas (en orden)
1. [ ] Esqueleto Spring Boot + validación JWT + `/salud`
2. [ ] Dominio y casos de uso de Campaña/Presupuesto
3. [ ] Filtro de idempotencia (`Idempotency-Key`) con tabla `claves_idempotencia`
4. [ ] Outbox + relay RabbitMQ
5. [ ] Orquestador SAGA (5 pasos + compensaciones + job de timeouts)
6. [ ] Tests: camino feliz, fallos y reenvío (ver `documentacion/02-saga.md`)

## Definición de terminado
Caso feliz + idempotencia probados · contrato y BD al día en los `.md` · demostrable en la defensa.
