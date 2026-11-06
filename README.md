# AdOrbit (Grupo 23 · Ingeniería de Software 2 · 2do Parcial)

Plataforma para una agencia publicitaria: campañas, clientes, creatividades, facturación y
analítica con IA. 5 microservicios, micro frontends, SAGA, MCP y modo offline.

**Empieza por [`CLAUDE.md`](./CLAUDE.md)** (reglas obligatorias, validaciones y restricciones) y
luego [`AGENTS.md`](./AGENTS.md) (mapa de documentos, stack y convenciones). La carpeta
`documentacion/` es la fuente de verdad: si algo cambia, se cambia ahí en el mismo PR.

## Estado actual
`ms-creatividades` (completo) y `ms-ia` (tareas 1-4/6) implementados; `app-movil` (Flutter) con
cámara y sincronización en curso; `portal-cliente`/`panel-inteligencia` (React) en la rama de
Luis. Ver el checklist de cada servicio en `servicios/<servicio>/README.md`. Fases, fechas y
reparto por integrante en
[`documentacion/04-reparto-equipo.md`](./documentacion/04-reparto-equipo.md).

## Documentación
| Archivo | Contenido |
|---|---|
| `CLAUDE.md` | Reglas obligatorias, validaciones, restricciones y flujo de trabajo |
| `AGENTS.md` | Mapa de documentos, stack y convenciones |
| `documentacion/01-arquitectura.md` | Servicios, BD, patrones, IA, n8n |
| `documentacion/02-saga.md` | Transacción "aprobar y contratar campaña" |
| `documentacion/03-contratos.md` | Eventos RabbitMQ y endpoints |
| `documentacion/04-reparto-equipo.md` | Quién hace qué y fases hasta la entrega |
| `documentacion/05-decisiones-y-pendientes.md` | Decisiones, preguntas abiertas, riesgos |
| `documentacion/06-monorepo-y-estandares.md` | Estructura del monorepo, estándares, CI/CD, nubes |
| `servicios/<ms>/README.md` | Ficha de cada microservicio (alcance, capas, tareas) |
| `base_de_datos/` | Scripts de BD de cada servicio (única fuente del esquema) |

## Estructura del repositorio
```
CLAUDE.md  AGENTS.md  README.md  .editorconfig  .gitignore  .gitattributes  Makefile
.github/                 CODEOWNERS, plantilla de pull request, workflows/
documentacion/           01..06
contratos/               openapi/ · eventos/ · graphql/ (datos compartidos, no código)
base_de_datos/           script de esquema por servicio
servicios/               ms-campanas · ms-facturacion · ms-creatividades · ms-clientes-crm · ms-ia
aplicaciones/            portal-gestion · modulo-campanas · portal-cliente · panel-inteligencia · app-movil
plataforma/              pasarela · keycloak · rabbitmq · n8n
herramientas/            scripts de apoyo (probar.sh, revisar.sh)
infraestructura/         docker-compose.yml · despliegue/{aws,azure,servidor}
```
Detalle completo en la sección "Estructura del repositorio" de `CLAUDE.md`.

## Cómo trabajar en una tarea
1. Identifica el servicio en `servicios/<ms>/README.md` y trabaja solo dentro de ese servicio.
2. Antes de tocar BD, lee `base_de_datos/<ms>.*`; antes de tocar un contrato, actualiza
   `documentacion/03-contratos.md` y avisa a los demás.
3. Al terminar: tests del caso feliz + idempotencia, marcar `[x]` en el README del servicio, PR con
   revisión de otro integrante.

## Entorno local
```
make levantar          # docker compose up (RabbitMQ, Keycloak, BD locales, servicios)
make bajar             # docker compose down
make probar S=<ms>     # pruebas del servicio
make revisar S=<ms>    # formato y análisis estático
```

## Crear las bases de datos
- PostgreSQL: `psql "$DATABASE_URL" -f base_de_datos/ms-campanas.postgres.sql` (idem `ms-ia.postgres.sql`, otro proyecto Supabase).
- MongoDB: `mongosh "$ATLAS_URI" --file base_de_datos/ms-creatividades.mongo.js` (idem `ms-clientes-crm.mongo.js`).
- DynamoDB: `bash base_de_datos/ms-facturacion.dynamodb.sh` (AWS CLI configurado; `ENDPOINT` para DynamoDB local).

## Equipo
3 integrantes, cada uno dueño de servicios completos (contrato + BD + pruebas). Reparto detallado,
dependencias y definición de "terminado" en `documentacion/04-reparto-equipo.md`.
