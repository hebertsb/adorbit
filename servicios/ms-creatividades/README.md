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
`/briefs`, `/briefs/{id}/piezas`, `/piezas/{id}`, `/piezas/{id}/aprobar`, `/piezas/{id}/validaciones`, `/piezas/{id}/archivo`.

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

Pendiente antes de la demo (necesita infraestructura real, no se pudo probar en esta
maquina — Docker Desktop no estaba disponible): levantar Mongo/RabbitMQ (locales o
Atlas/CloudAMQP), completar `.env` a partir de `.env.ejemplo`, crear el bucket real de
Supabase Storage, y correr los 5 casos de prueba de `documentacion/02-saga.md` contra el
orquestador real de ms-campanas.

## Definición de terminado
Caso feliz + idempotencia probados · contrato y BD al día en los `.md` · demostrable en la defensa.
