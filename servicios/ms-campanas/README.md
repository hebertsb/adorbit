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

Seguridad: los endpoints de negocio requieren JWT de Keycloak validado con emisor, JWKS y audiencia; sin cualquiera de las tres configuraciones se rechazan los tokens. `/salud` y `/listo` siguen publicos. Configurar `SPRING_SECURITY_OAUTH2_RESOURCESERVER_JWT_ISSUER_URI`, `SPRING_SECURITY_OAUTH2_RESOURCESERVER_JWT_JWK_SET_URI` y `ADORBIT_CAMPANAS_AUDIENCIA_JWT`. La autenticacion no sustituye la autorizacion por rol ni el aislamiento por cliente, aun pendientes para los endpoints de negocio. Idempotencia en toda escritura y outbox para eventos (ver `AGENTS.md`).

## Tareas (en orden)
1. [x] Esqueleto Spring Boot + validación JWT + `/salud`
2. [x] Dominio y casos de uso de Campaña/Presupuesto
3. [x] Filtro de idempotencia (`Idempotency-Key`) con tabla `claves_idempotencia`
4. [x] Outbox + relay RabbitMQ
5. [x] Orquestador SAGA (5 pasos + compensaciones + job de timeouts)
6. [x] Tests: camino feliz, fallos y reenvío (ver `documentacion/02-saga.md`)
7. [x] Consulta interna de metadatos pendientes de bandeja (primera etapa; MCP de ms-ia pendiente). Configurar `SPRING_SECURITY_OAUTH2_RESOURCESERVER_JWT_ISSUER_URI`, `SPRING_SECURITY_OAUTH2_RESOURCESERVER_JWT_JWK_SET_URI` (JWKS interna) y `ADORBIT_CAMPANAS_AUDIENCIA_JWT`; si falta alguno, el acceso queda cerrado.

<!-- AUTO-GENERATED: limitaciones de idempotencia -->
**Pendiente de cumplimiento:** el filtro actual solo procesa POST, PUT y DELETE con clave presente; no exige la cabecera ni cubre PATCH. Calcula la huella solo del cuerpo y, para una clave ya completada, responde `409 IDEMPOTENCIA_NO_VERIFICABLE` en vez de reproducir la respuesta, porque no puede verificar su propietario. La reserva y finalización de la clave se hacen desde el filtro, sin garantizar la misma transacción que la operación de negocio. La casilla del filtro indica existencia de una implementación parcial, no cumplimiento de la regla de idempotencia del proyecto.
<!-- /AUTO-GENERATED: limitaciones de idempotencia -->

## Definición de terminado
Caso feliz + idempotencia probados · contrato y BD al día en los `.md` · demostrable en la defensa.
