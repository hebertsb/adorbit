# ms-creatividades

> TypeScript · Next.js (API routes) · **Clean Architecture** · MongoDB Atlas · Responsable: Integrante C

## Alcance
- Briefs y piezas (versionadas por `version_numero`)
- Aprobación y validación de marca (manual/IA) con auditoría
- **Bloqueo/desbloqueo de piezas** para la SAGA
- Archivos: URL firmada a Supabase Storage/S3 (la BD guarda la ruta)
- Idempotencia + outbox

## Estructura de código (obligatoria)
```
src/
  domain/        # entidades Brief, Pieza; reglas de estado; puertos
  use-cases/     # CrearBrief, SubirPieza, AprobarPieza, BloquearPiezas, DesbloquearPiezas
  adapters/      # repos Mongo, publisher RabbitMQ, storage
  app/api/       # rutas Next.js (capa externa: solo HTTP)
```
Dependencias hacia adentro: los casos de uso no conocen Next.js ni Mongo.

## API
`/briefs`, `/briefs/{id}`, `/briefs/{id}/piezas` (GET lista + POST crea), `/piezas/{id}`, `/piezas/{id}/aprobar`, `/piezas/{id}/validaciones`, `/piezas/{id}/archivo`.

## Eventos
Publica: `BriefRecibido`, `PiezaSubida`, `PiezaAprobada`, `PiezasBloqueadas`, `BloqueoFallido`, `PiezasDesbloqueadas`. Consume: `BloquearPiezas`, `DesbloquearPiezas`, `PiezaAnalizada`.

## Base de datos
`base_de_datos/ms-creatividades.mongo.js` — colecciones: briefs, piezas (con `bloqueo_saga`), validaciones_auditoria, claves_idempotencia, bandeja_salida_eventos.

Seguridad: JWT de Keycloak, idempotencia en toda escritura, outbox para eventos (ver `AGENTS.md`).

## Tareas (en orden)
1. [x] Esqueleto Next.js + JWT + `/salud` + `/listo`
2. [x] Casos de uso de briefs/piezas y repos Mongo
3. [x] Idempotencia (colección + TTL `vence_en`)
4. [x] Bloqueo atómico y liberación con `saga_id`; job de expiración
5. [x] Outbox + relay RabbitMQ
6. [x] Subida de archivos (URL firmada) y evento `PiezaSubida` con `huella_imagen`

El Mongo Atlas real (`adorbit_creatividades`) YA está provisionado y probado en vivo
(6 nov): `GET/POST /briefs`, `GET /briefs/{id}`, `GET/POST /briefs/{id}/piezas`,
`POST /piezas/{id}/aprobar` e idempotencia (replay + conflicto 422), todo contra la
base real — ver decisión en `documentacion/05-decisiones-y-pendientes.md` sobre el bug
real que encontró esa prueba (`MongoClient` sin `ignoreUndefined`, ya corregido).

El consumidor del paso 3 de la SAGA (`BloquearPiezas`/`DesbloquearPiezas`,
`consumidorComandosSaga.ts`) ya está conectado a un RabbitMQ real (CloudAMQP, mismo
broker que usa `ms-ia`) y probado en vivo: publicar los comandos con la clave de
enrutamiento real (`saga.creatividades`, la que declara
`plataforma/rabbitmq/definiciones.json`) bloquea y desbloquea una pieza aprobada
correctamente. **Ojo:** el publicador de la SAGA en ms-campanas todavía arma esa clave
distinto a como la declaró su propio `definiciones.json` — ver
`documentacion/05-decisiones-y-pendientes.md`, "Preguntas abiertas con otros
integrantes" — así que un comando real desde ms-campanas no va a llegar aquí hasta que
eso se corrija del otro lado, aunque el consumidor en sí ya es correcto.

El bucket real de Supabase Storage (`piezas-creatividades`, mismo proyecto Supabase de
ms-ia) ya está creado y probado en vivo (6 nov): pedir la URL firmada
(`POST /piezas/{id}/archivo`), subir los bytes directo ahí, y que la pieza quede con
`archivo` completo — las 3 partes del flujo real, de punta a punta.

Pendiente: correr los 5 casos de prueba de `documentacion/02-saga.md` contra el
orquestador real de ms-campanas sigue bloqueado por el bug de enrutamiento del otro lado
(ver arriba).

## Probar local sin Keycloak
Mismo simulador compartido de todo el proyecto (`herramientas/keycloak-simulado.mjs`,
de Luis — ya lo usan n8n, ms-ia, portal-cliente, panel-inteligencia y app-movil). En
`.env`:
```
ADORBIT_CREATIVIDADES_JWKS_URI=http://localhost:8180/realms/adorbit/protocol/openid-connect/certs
ADORBIT_CREATIVIDADES_EMISOR=http://localhost:8180/realms/adorbit
```
`ms-creatividades` ya está en la lista de audiencias por defecto del simulador. Desde
la raíz del repo: `node herramientas/keycloak-simulado.mjs`, y pide un token con
`GET http://localhost:8180/emitir?roles=creativo` — verifica igual que uno real de Keycloak.

## Definición de terminado
Caso feliz + idempotencia probados · contrato y BD al día en los `.md` · demostrable en la defensa.
