# 04 · Reparto de implementación (3 integrantes)

> Asignación propuesta; cambiar los nombres por los reales. Criterio: cada uno es dueño de servicios
> completos (contrato + BD + pruebas) para no bloquearse; Java y TypeScript/PHP/Python se reparten
> según carga. **Fechas tentativas**: entrega estimada 12–13 nov 2026 (sin confirmar con el docente).

|                 | Integrante A Roly                                                   | Integrante B Luis                                                | Integrante C Hebert                                               |
| --------------- | ------------------------------------------------------------------- | ---------------------------------------------------------------- | ----------------------------------------------------------------- |
| **Servicios**   | **ms-campanas** (Java, DDD)                                         | **ms-facturacion** (Java, Hexagonal) + **ms-clientes-crm** (PHP) | **ms-creatividades** (Next.js, Clean) + **ms-ia** (Python, Clean) |
| **BD**          | Supabase #1                                                         | DynamoDB + Atlas (crm)                                           | Atlas (creatividades) + Supabase #2                               |
| **Transversal** | Orquestador SAGA, RabbitMQ, API Gateway, GraphQL federado, Keycloak | n8n (flujos y jobs), relay de DynamoDB Streams                   | MCP, agentes, ML/DL, IA local                                     |
| **Frontend**    | Portal de gestión (Angular shell) + remote campañas/creatividades   | Portal del cliente + remote BI (React)                           | App móvil Flutter (SQLite, offline, IA local)                     |

**Carga:** C es la más pesada (IA + móvil). Si hace falta equilibrar: mover la app Flutter o los
remotes React a A o B según quién termine antes. Decidirlo al cierre de la Fase 1.

## Fases

| Fase                        | Fechas    | Objetivo                                                                                   | Hecho cuando                                                       |
| --------------------------- | --------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------ |
| **0 · Base**                | 1–2 nov   | Repos, BD creadas con `base_de_datos/*`, RabbitMQ, Keycloak, esqueletos de servicio con CI | Cada servicio arranca, valida JWT y expone `/salud`                |
| **1 · Núcleo**              | 3–6 nov   | CRUD de cada servicio + idempotencia + outbox + eventos básicos                            | Evento publicado y consumido por ms-ia; repetir un POST no duplica |
| **2 · SAGA y front**        | 7–9 nov   | SAGA completa con compensaciones; portales; móvil offline                                  | Los 5 casos de prueba de `documentacion/02-saga.md` pasan          |
| **3 · IA y automatización** | 9–11 nov  | MCP + auditoría, reportes NL, agentes, visión, n8n, IA local                               | Demo: reporte por voz, pieza validada, flujo n8n completo          |
| **4 · Cierre**              | 11–12 nov | Ensayo de defensa, datos de demo, documento final, diagramas ICONIX                        | Guion de demo ensayado de punta a punta                            |

## Dependencias entre integrantes

- A publica primero los **contratos de comandos de la SAGA** (Fase 0) → B y C implementan participantes.
- B y C publican **eventos de dominio** (Fase 1) → C alimenta el read model de ms-ia.
- C necesita **Keycloak y gateway** de A desde la Fase 0 (acordar realm y roles el día 1).
- Los 3 revisan los PR de los otros dos (mínimo 1 aprobación).

## Tareas por integrante (resumen; detalle en `servicios/*/README.md`)

**A:** (1) DDD de ms-campanas: agregados Campaña, Presupuesto, calendario; (2) orquestador SAGA +
job de timeouts; (3) Gateway + GraphQL federado + Keycloak (realm, roles); (4) shell Angular + remote
campañas/creatividades (Module Federation, PWA); (5) RabbitMQ (exchanges, colas, DLQ).
**B:** (1) ms-facturacion hexagonal (puertos/adaptadores, `TransactWriteItems`, Streams→relay);
(2) ms-clientes-crm Laravel (clientes, contratos, crédito atómico, reservas); (3) flujos n8n (pedido→
factura→notificación, cobranza, reuniones, métricas, jobs); (4) portal cliente React + remote BI.
**C:** (1) ms-creatividades Clean (briefs, piezas, bloqueo, archivos a Storage); (2) ms-ia: read model,
agentes LangGraph, MCP seguro, reportes NL y exportación; (3) ML (XGBoost, K-Means, Isolation Forest)
y DL (YOLO) + endpoint de visión; (4) Flutter: SQLite, outbox local, sync, IA local; IA local web.

## Definición de "terminado" (por tarea)

Código en `main` por PR revisado · prueba del caso feliz · prueba de idempotencia · contrato y BD
actualizados en estos `.md` · demostrable en la defensa.
