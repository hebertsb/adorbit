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

Seguridad: los endpoints de negocio requieren JWT de Keycloak validado con emisor, JWKS y audiencia; sin cualquiera de las tres configuraciones se rechazan los tokens. `/salud` y `/listo` siguen publicos. Configurar `SPRING_SECURITY_OAUTH2_RESOURCESERVER_JWT_ISSUER_URI`, `SPRING_SECURITY_OAUTH2_RESOURCESERVER_JWT_JWK_SET_URI` y `ADORBIT_CAMPANAS_AUDIENCIA_JWT`. La autenticacion se complementa con roles: ejecutivo/gerente pueden operar y cliente solo consultar. El rol cliente se limita al `cliente_id` del token en listados y consultas individuales; no se acepta usar un `clienteId` ajeno. Idempotencia en toda escritura y outbox para eventos (ver `AGENTS.md`).

## Tareas (en orden)
1. [x] Esqueleto Spring Boot + validación JWT + `/salud`
2. [x] Dominio y casos de uso de Campaña/Presupuesto
3. [x] Filtro de idempotencia (`Idempotency-Key`) con tabla `claves_idempotencia`
4. [x] Outbox + relay RabbitMQ
5. [x] Orquestador SAGA (5 pasos + compensaciones + job de timeouts)
6. [x] Tests: camino feliz, fallos y reenvío (ver `documentacion/02-saga.md`)
7. [x] Consulta interna de metadatos pendientes de bandeja (primera etapa; MCP de ms-ia pendiente). Configurar `SPRING_SECURITY_OAUTH2_RESOURCESERVER_JWT_ISSUER_URI`, `SPRING_SECURITY_OAUTH2_RESOURCESERVER_JWT_JWK_SET_URI` (JWKS interna) y `ADORBIT_CAMPANAS_AUDIENCIA_JWT`; si falta alguno, el acceso queda cerrado.

<!-- AUTO-GENERATED: limitaciones de idempotencia -->
**Implementación vigente:** las escrituras POST/PUT/PATCH/DELETE exigen `Idempotency-Key` y calculan huella con identidad, método, ruta, consulta y cuerpo. Las respuestas 2xx se guardan y se reproducen en reintentos con la misma clave; una huella distinta o solicitud concurrente responde 409. La reclamación, operación de negocio, bandeja de salida y finalización de la clave usan la misma transacción REQUIRED; las respuestas 2xx solo se copian después del commit. Las respuestas no exitosas hacen rollback de la reserva sin borrar manualmente la fila.
<!-- /AUTO-GENERATED: limitaciones de idempotencia -->

## SAGA: alcance y limites vigentes
Los comandos usan el sobre de `contratos/eventos/` sin campo `destino`; `infraestructura/mensajeria/PublicadorOutbox.java` selecciona la ruta RabbitMQ por tipo de comando. `ConsumidorRespuestasSaga.java` entrega la carga de `FacturaEmitida` al orquestador, que valida y guarda `factura_id` en `saga_pasos.detalle`; la compensacion lo recupera de ese paso y envia `EmitirNotaCredito`. Si falta o es invalido no se acepta el exito ni se publica una nota incompleta. Los pasos historicos sin ese dato requieren recuperacion manual; no se consulta la BD de facturacion.

El publicador usa `mandatory`, confirmaciones correlacionadas y retornos: solo marca publicada la fila tras confirmacion positiva sin retorno; un fallo o espera agotada deja la fila pendiente. Esto preserva entrega al menos una vez, no evita duplicados y no verifica procesamiento por el destinatario. Requiere que exista la ruta del broker; una fila fallida bloquea filas posteriores del mismo agregado durante ese ciclo, no las de otros agregados. Esto solo mantiene el orden dentro de una ejecucion del publicador: multiples instancias o ejecuciones concurrentes no estan coordinadas y pueden publicar duplicados o fuera de orden. No se garantiza orden global ni entre agregados.

Las respuestas tardias se compensan de forma idempotente: una factura confirmada despues de `limite_en` genera `EmitirNotaCredito`, y un bloqueo tardio genera `DesbloquearPiezas`. El plazo normal es 600 segundos y se configura con `ADORBIT_CAMPANAS_SAGA_TIEMPO_LIMITE_SEGUNDOS`; el valor corto solo se usa en pruebas. El consumidor arranca por defecto (desactivable con `ADORBIT_CAMPANAS_CONSUMIDOR_ACTIVO=false`), reintenta hasta cinco veces con espera exponencial y rechaza sin reencolar al agotarse; su entrega a cola muerta depende de la topologia configurada.

El 9 de noviembre de 2026 se probaron en vivo, con RabbitMQ local y las bases configuradas, los cinco escenarios obligatorios: camino feliz, credito insuficiente, fallo de facturacion con compensacion, reenvio idempotente y expiracion antes del paso 5. Los cinco finalizaron en el estado esperado.

## Definición de terminado
Caso feliz + idempotencia probados · contrato y BD al día en los `.md` · demostrable en la defensa.
