# AdOrbit — Documentación del proyecto (Grupo 23 · SW2 · 2do Parcial)

Plataforma para una agencia publicitaria con 5 microservicios, micro frontends, IA, SAGA y offline.

**Empieza por `CLAUDE.md`** (reglas, validaciones y restricciones) y luego `AGENTS.md` (mapa y stack). Este repositorio de documentación es la fuente de verdad:
si algo cambia, se cambia aquí en el mismo PR.

```
CLAUDE.md                      reglas obligatorias, validaciones, restricciones y flujo de trabajo (Claude Code lo lee solo)
AGENTS.md                      mapa de documentos, stack y convenciones
documentacion/01-arquitectura.md        servicios, BD, patrones, IA, n8n
documentacion/02-saga.md                transacción aprobar y contratar campaña
documentacion/03-contratos.md           eventos RabbitMQ y endpoints
documentacion/04-reparto-equipo.md      quién hace qué y fases hasta la entrega
documentacion/05-decisiones-y-pendientes.md   decisiones, preguntas abiertas, riesgos
documentacion/06-monorepo-y-estandares.md     estructura del monorepo, estándares, CI/CD, nubes
servicios/<ms>/README.md        ficha de cada microservicio (alcance, capas, tareas)
base_de_datos/                      scripts de BD de cada servicio (única fuente del esquema)
```

## Cómo usarlo con un agente
1. Crea el repositorio vacío y copia esta carpeta a su raíz. Abre Claude Code ahí y pídele:
   *"Ejecuta el Bootstrap del repositorio de CLAUDE.md."*
2. Dile al agente: *"Lee CLAUDE.md, AGENTS.md y servicios/<ms>/README.md; implementa la siguiente tarea sin marcar."*
3. Al terminar una tarea: marcar `[x]` en el README del servicio y actualizar contratos/BD si cambiaron.

## Crear las bases de datos
- PostgreSQL: `psql "$DATABASE_URL" -f base_de_datos/ms-campanas.postgres.sql` (idem `ms-ia.postgres.sql`, otro proyecto Supabase).
- MongoDB: `mongosh "$ATLAS_URI" --file base_de_datos/ms-creatividades.mongo.js` (idem `ms-clientes-crm.mongo.js`).
- DynamoDB: `bash base_de_datos/ms-facturacion.dynamodb.sh` (AWS CLI configurado; `ENDPOINT` para DynamoDB local).
