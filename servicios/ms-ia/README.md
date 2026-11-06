# ms-ia

> Python 3.12 · FastAPI · **Clean Architecture** · PostgreSQL (Supabase #2) · Responsable: Integrante C

## Alcance
- Read model de reportes (alimentado por eventos, dedupe por `id_evento`)
- Agentes LangGraph (monitor, creativo, cobranza, marca)
- **Servidor MCP** seguro + auditoría
- Reportes por lenguaje natural + exportación PDF/Excel
- ML supervisado/no supervisado y DL de visión (YOLO)

## Estructura de código (obligatoria)
```
app/
  domain/        # entidades Agente, Reporte, ModeloML; puertos
  use_cases/     # GenerarReporte, EjecutarAgente, AnalizarPieza, ProcesarEvento
  adapters/      # repos Postgres, consumidor RabbitMQ, MCP server, modelos ML/DL, LLM
  api/           # routers FastAPI
```

## API
`/reportes`, `/reportes/{id}`, `/reportes/{id}/exportar`, `/agentes`, `/agentes/{id}/ejecutar`, `/mcp/auditoria`, `/vision/analizar` (tarea 6, pendiente).

## Eventos
Consume: todos los eventos de dominio (`CampanaCreada`, `ClienteCreado`, `FacturaEmitida`, `PiezaSubida`, ...). Publica: `AlertaCampana`, `PiezaAnalizada`.

## Base de datos
`base_de_datos/ms-ia.postgres.sql` — reporte_campanas/clientes/facturacion, eventos_procesados, agentes, ejecuciones_agente, modelos_aprendizaje, auditoria_mcp, vision_resultados, vistas `vista_mcp_*`, rol `lector_mcp`.

Seguridad: JWT de Keycloak, idempotencia en toda escritura, outbox para eventos (ver `AGENTS.md`).

## Tareas (en orden)
1. [x] Esqueleto FastAPI + JWT + `/salud` + `/listo` (con ping real a Postgres)
2. [x] Consumidor de eventos con dedupe y read model
3. [x] MCP: herramientas parametrizadas, rol `lector_mcp`, auditoría (incluye bloqueadas) + prueba de intento de inyección
4. [x] Reportes NL → MCP → tabla/gráfico → PDF/Excel (proveedor LLM: Groq, ver decisión D14)
5. [x] Agentes (`monitor_campanas`, `cobranza`) vía `POST /agentes/{id}/ejecutar`; ver decisión D16
6. [ ] ML (ROI/impago, K-Means, Isolation Forest) y visión YOLO; registrar en `modelos_aprendizaje`

La tarea 5 queda con la lógica y el endpoint completos y probados contra Supabase real
(ver D16); lo único que falta y no depende de ms-ia es que Roly configure el nodo cron
de n8n que llama `POST /agentes/{id}/ejecutar` y el binding de la cola que consume
`AlertaCampana`. La tarea 6 además necesita datos de entrenamiento reales que no existen
todavía.

Pendiente antes de la demo: levantar RabbitMQ real (o confirmar que CloudAMQP ya
alcanza) para que `RelevoBandejaSalida` tenga a quién publicarle `AlertaCampana`, y
completar `ADORBIT_IA_JWKS_URI`/`ADORBIT_IA_RABBITMQ_URL` cuando Roly tenga Keycloak y
las colas listas. El Postgres de Supabase SÍ está disponible y probado en vivo
(incluidas `reportes_generados` de la tarea 4 y `agentes`/`ejecuciones_agente`/
`bandeja_salida_eventos` de la tarea 5).

El usuario `LOGIN` real para el pool `lector_mcp` (rol `lector_mcp_app`, ver D12) ya
está creado en Supabase con `GRANT lector_mcp` + `statement_timeout = '5s'`, y
`ADORBIT_IA_URL_BD_LECTOR_MCP` en `.env` ya apunta a ese usuario (antes apuntaba, por
error, al mismo superusuario que `ADORBIT_IA_URL_BD`). Verificado en vivo: con ese
usuario SÍ se puede leer `vista_mcp_campanas` y NO se puede leer `reporte_campanas`
directo (`InsufficientPrivilegeError`) — la frontera de seguridad del servidor MCP ya
es real, no solo teórica.

## Probar local sin Keycloak
Roly todavía no tiene Keycloak real corriendo, pero los endpoints protegidos
(`/reportes`, `/agentes`, `/mcp`) exigen JWT igual. `herramientas/emisor_jwt_prueba.py`
genera un JWKS de juguete + un token firmado válido, usando el mismo código de
verificación real (no es un bypass). Es genérico para todo el proyecto (otros
servicios, como `ms-creatividades`, también lo usan — ver el parámetro `aud` de
`/emitir` y el README de `app-movil`). En `.env` (temporalmente, mientras pruebas local):
```
ADORBIT_IA_JWKS_URI=http://127.0.0.1:8099/certs
ADORBIT_IA_EMISOR=http://127.0.0.1:8099/prueba
```
Luego `python herramientas/emisor_jwt_prueba.py` (deja la terminal abierta) y usa el
`Authorization: Bearer ...` que imprime, o pide uno nuevo con
`GET /emitir?roles=...&aud=...` para otro servicio.

## Definición de terminado
Caso feliz + idempotencia probados · contrato y BD al día en los `.md` · demostrable en la defensa.
