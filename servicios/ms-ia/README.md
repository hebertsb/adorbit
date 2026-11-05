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
`/reportes`, `/reportes/{id}/exportar`, `/vision/analizar`, `/agentes`, `/agentes/{id}/ejecutar`, `/mcp/auditoria`.

## Eventos
Consume: todos los eventos de dominio (`CampanaCreada`, `ClienteCreado`, `FacturaEmitida`, `PiezaSubida`, ...). Publica: `AlertaCampana`, `PiezaAnalizada`.

## Base de datos
`base_de_datos/ms-ia.postgres.sql` — reporte_campanas/clientes/facturacion, eventos_procesados, agentes, ejecuciones_agente, modelos_aprendizaje, auditoria_mcp, vision_resultados, vistas `vista_mcp_*`, rol `lector_mcp`.

Seguridad: JWT de Keycloak, idempotencia en toda escritura, outbox para eventos (ver `AGENTS.md`).

## Tareas (en orden)
1. [x] Esqueleto FastAPI + JWT + `/salud` + `/listo` (con ping real a Postgres)
2. [x] Consumidor de eventos con dedupe y read model
3. [x] MCP: herramientas parametrizadas, rol `lector_mcp`, auditoría (incluye bloqueadas) + prueba de intento de inyección
4. [ ] Reportes NL → MCP → tabla/gráfico → PDF/Excel
5. [ ] Agentes (monitor y cobranza primero) y disparadores n8n
6. [ ] ML (ROI/impago, K-Means, Isolation Forest) y visión YOLO; registrar en `modelos_aprendizaje`

Tareas 4-6 bloqueadas por una decisión de producto/costo que todavía no se tomó: **qué
proveedor de LLM usar** para los reportes en lenguaje natural y los agentes LangGraph —
no hay ninguno elegido en ningún doc del proyecto, ni variable de entorno, ni decisión
registrada. La tarea 6 ademas necesita datos de entrenamiento reales que no existen
todavia. Se retoman en una pasada aparte una vez resuelto el proveedor.

Pendiente antes de la demo (necesita infraestructura real, no se pudo probar en esta
maquina — Docker Desktop no estaba disponible): levantar Postgres/RabbitMQ reales (o
confirmar que Supabase/CloudAMQP ya alcanzan), crear el usuario `LOGIN` con
`GRANT lector_mcp` en Supabase (ver `.env.ejemplo`), y completar `ADORBIT_IA_JWKS_URI`/
`ADORBIT_IA_RABBITMQ_URL` cuando Roly tenga Keycloak y las colas listas.

## Definición de terminado
Caso feliz + idempotencia probados · contrato y BD al día en los `.md` · demostrable en la defensa.
