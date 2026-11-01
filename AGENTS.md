# AGENTS.md — AdOrbit (Grupo 23, SW2, 2do Parcial)

> **Las reglas de comportamiento, validaciones y restricciones están en `CLAUDE.md`** (léelo primero).
> Este archivo es el mapa de documentos y el resumen técnico (stack, convenciones, fuera de alcance).
> Si el código y estos archivos se contradicen, **para y pregunta**; si cambias una decisión,
> **actualiza primero estos archivos**.

## Qué es
**AdOrbit**: plataforma para una **agencia publicitaria** (campañas, clientes, creatividades,
facturación, analítica con IA). Caso de estudio único. Detalle en `documentacion/01-arquitectura.md`.

## Mapa de documentos
| Archivo | Contenido |
|---|---|
| `documentacion/01-arquitectura.md` | Servicios, stack, convenciones transversales, frontends, SSO |
| `documentacion/02-saga.md` | Transacción "aprobar y contratar campaña" paso a paso |
| `documentacion/03-contratos.md` | Eventos RabbitMQ y endpoints REST/GraphQL principales |
| `documentacion/04-reparto-equipo.md` | Quién implementa qué y en qué orden |
| `documentacion/05-decisiones-y-pendientes.md` | Decisiones tomadas y preguntas abiertas |
| `documentacion/06-monorepo-y-estandares.md` | Estructura del monorepo, estándares, CODEOWNERS, CI/CD y despliegue por nube |
| `servicios/<ms>/README.md` | Ficha de cada microservicio (alcance, capas, tareas) |
| `base_de_datos/*` | Scripts de BD de cada servicio (**única fuente** del esquema) |

## Reglas innegociables
1. **5 microservicios, base de datos por servicio.** Nadie lee tablas/colecciones de otro servicio.
2. **GraphQL (Apollo Federation) solo para el portal de gestión.** Todo lo demás es **REST**.
3. **Idempotencia en cada servicio**, en su propia BD y en la misma transacción que la operación
   (`Idempotency-Key` + `huella_solicitud` + respuesta guardada, vence 7–30 días).
4. **Outbox transaccional** para publicar eventos (nunca publicar a RabbitMQ dentro de la transacción).
   Entrega *al menos una vez* ⇒ todo consumidor deduplica por `id_evento`.
5. **IDs compartidos entre servicios = UUID como texto.** `ObjectId` de Mongo es solo interno.
6. **Dinero:** `NUMERIC(14,2)` en Postgres, `Decimal128` en Mongo; moneda `BOB`/`USD`.
7. **SAGA orquestada desde ms-campanas.** Comandos con clave `sagaId:orden:tipo`; los participantes
   son idempotentes. Compensaciones obligatorias (ver `documentacion/02-saga.md`).
8. **MCP:** solo herramientas parametrizadas, rol `lector_mcp` de solo lectura, solo vistas `vista_mcp_*`,
   toda llamada (incluso bloqueada) se audita en `auditoria_mcp`. **Prohibido SQL libre.**
9. **Seguridad:** token JWT de Keycloak validado en el gateway **y** en cada servicio; roles
   `ejecutivo`, `creativo`, `cliente`, `gerente`. Ningún secreto en el repo (`.env` ignorado).
10. **RLS activado** en todas las tablas de Supabase.

## Stack por servicio
| Servicio | Lenguaje | Arquitectura | BD |
|---|---|---|---|
| ms-campanas | Java 21 + Spring Boot | **DDD** | PostgreSQL (Supabase #1) |
| ms-facturacion | Java 21 + Spring Boot | **Hexagonal** | DynamoDB (tabla única) |
| ms-creatividades | TypeScript + Next.js | **Clean** | MongoDB Atlas |
| ms-clientes-crm | PHP + Laravel | MVC por capas | MongoDB Atlas |
| ms-ia | Python + FastAPI | **Clean** | PostgreSQL (Supabase #2) |

Frontends: **Angular** (shell del portal de gestión + remote campañas/creatividades) y **React**
(portal del cliente + remote BI) con **Module Federation**; **Flutter** (móvil, SQLite). Web = PWA.
Infra: RabbitMQ, API Gateway, Keycloak, n8n.

## Convenciones de código
- **API REST:** `/api/v1/...`, JSON, `snake_case` en campos, errores `{ "codigo", "mensaje", "detalle" }`.
  Escrituras exigen header `Idempotency-Key`. Concurrencia con campo `version` (409 si no coincide).
- **Eventos:** `{ id_evento, tipo_evento, version_esquema, ocurrido_en, agregado_id, carga }`.
  Nombre en pasado y PascalCase: `CampanaContratada`, `FacturaEmitida`.
- **Fechas** ISO-8601 UTC. **Commits:** `tipo(servicio): mensaje` (`feat(ms-campanas): ...`).
- **Ramas:** `main` protegida, `feat/<servicio>-<tema>`; PR con revisión de otro integrante.
- **Estructura por arquitectura:** respetarla literalmente — el docente evalúa DDD / Hexagonal / Clean
  (carpetas esperadas en el README de cada servicio).

## Cómo trabajar (para el agente)
1. Identifica el servicio en `servicios/<ms>/README.md` y trabaja **solo dentro de ese servicio**.
2. Antes de tocar BD, lee `base_de_datos/<ms>.*`. Cambiar esquema = editar ese script en el mismo commit.
3. Antes de tocar un contrato (evento/endpoint), actualiza `documentacion/03-contratos.md` y avisa a los otros.
4. Cada tarea termina con: tests mínimos del caso feliz + idempotencia (repetir la petición no duplica).
5. Si falta información, **pregunta**; no inventes campos de otros servicios.

## Reglas de cambio de la documentación
Cambio de alcance, BD, contrato o reparto ⇒ editar el `.md` correspondiente **en el mismo PR** y
registrar la decisión en `documentacion/05-decisiones-y-pendientes.md`. Los `.md` mandan sobre la memoria de nadie.

## Fuera de alcance (no implementar)
Diseño/edición de piezas gráficas; compra de pauta en plataformas de anuncios (solo importar métricas);
contabilidad general; planillas/RR.HH.; integración con el sistema oficial de facturación tributaria.
