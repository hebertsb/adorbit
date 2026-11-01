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
1. [ ] Esqueleto FastAPI + JWT + `/salud`
2. [ ] Consumidor de eventos con dedupe y read model
3. [ ] MCP: herramientas parametrizadas, rol `lector_mcp`, auditoría (incluye bloqueadas) + prueba de intento de inyección
4. [ ] Reportes NL → MCP → tabla/gráfico → PDF/Excel
5. [ ] Agentes (monitor y cobranza primero) y disparadores n8n
6. [ ] ML (ROI/impago, K-Means, Isolation Forest) y visión YOLO; registrar en `modelos_aprendizaje`

## Definición de terminado
Caso feliz + idempotencia probados · contrato y BD al día en los `.md` · demostrable en la defensa.
