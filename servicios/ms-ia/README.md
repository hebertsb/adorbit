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
`/reportes`, `/reportes/{id}`, `/reportes/{id}/exportar`, `/agentes`, `/agentes/{id}/ejecutar`, `/mcp/auditoria`, `/ml/riesgo-cliente/{id}`, `/ml/segmentacion-campanas`, `/vision/analizar`.

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
6. [x] ML (ROI/impago, K-Means, Isolation Forest) y visión YOLO; registrados en `modelos_aprendizaje` — ver D19/D20

La tarea 5 queda con la lógica y el endpoint completos y probados contra Supabase real
(ver D16); lo único que falta y no depende de ms-ia es que Roly configure el nodo cron
de n8n que llama `POST /agentes/{id}/ejecutar` y el binding de la cola que consume
`AlertaCampana` (su propio fix de rutas SAGA ya está mergeado).

La tarea 6 usa `herramientas/entrenar_modelos_ml.py` (scikit-learn + XGBoost, datos
**sintéticos** — no hay datos reales de producción todavía, ver D19) para `roi_xgboost`
(riesgo de impago), `kmeans_campanas` (segmentación) e `isolation_forest_campanas`
(anomalías de gasto); los 3 quedan registrados en `modelos_aprendizaje` contra el
Supabase real y expuestos en `/ml/riesgo-cliente/{id}` y `/ml/segmentacion-campanas`.
`/vision/analizar` usa YOLOv8n **pre-entrenado** (COCO-80, sin afinar — ver D20) para
detección de objetos real; `detecta_logo`/`detecta_texto` quedan en `null` a propósito
porque COCO no tiene esas clases. Correr `python herramientas/entrenar_modelos_ml.py`
para regenerar/registrar los 4 modelos (los artefactos `.joblib`/`.pt` no se versionan,
ver `.gitignore`).

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
Roly todavía no tiene el Keycloak real (`plataforma/keycloak`) corriendo, pero los
endpoints protegidos (`/reportes`, `/agentes`, `/mcp`) exigen JWT igual. Se usa el
simulador compartido de todo el proyecto, `herramientas/keycloak-simulado.mjs` (de
Luis — ya lo usan n8n, portal-cliente y panel-inteligencia; `ms-creatividades` y
`app-movil` también). Genera un JWKS real + tokens RS256 válidos, verificados con el
mismo código real (no es un bypass). En `.env` (temporalmente, mientras pruebas local):
```
ADORBIT_IA_JWKS_URI=http://localhost:8180/realms/adorbit/protocol/openid-connect/certs
ADORBIT_IA_EMISOR=http://localhost:8180/realms/adorbit
```
Luego, desde la raíz del repo, `node herramientas/keycloak-simulado.mjs` (deja la
terminal abierta; por defecto ya incluye `ms-ia` en las audiencias) y pide un token con
`GET http://localhost:8180/emitir?roles=ejecutivo` (atajo de desarrollo, sin login).

## Definición de terminado
Caso feliz + idempotencia probados · contrato y BD al día en los `.md` · demostrable en la defensa.
