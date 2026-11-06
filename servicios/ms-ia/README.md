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
`/reportes`, `/reportes/{id}`, `/reportes/{id}/exportar`, `/vision/analizar`, `/agentes`, `/agentes/{id}/ejecutar`, `/mcp/auditoria`.

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
5. [ ] Agentes (monitor y cobranza primero) y disparadores n8n
6. [ ] ML (ROI/impago, K-Means, Isolation Forest) y visión YOLO; registrar en `modelos_aprendizaje`

Tareas 5-6 quedan para una pasada aparte: la 5 reusa el mismo cliente Groq de la tarea 4
pero necesita los disparadores de n8n de Roly; la 6 además necesita datos de
entrenamiento reales que no existen todavía.

Pendiente antes de la demo: levantar RabbitMQ real (o confirmar que CloudAMQP ya
alcanza), crear el usuario `LOGIN` con `GRANT lector_mcp` en Supabase (ver
`.env.ejemplo`), y completar `ADORBIT_IA_JWKS_URI`/`ADORBIT_IA_RABBITMQ_URL` cuando
Roly tenga Keycloak y las colas listas. El Postgres de Supabase SÍ está disponible y
probado en vivo (incluida la tabla nueva `reportes_generados` de la tarea 4).

## Probar local sin Keycloak
Roly todavía no tiene Keycloak real corriendo, pero los endpoints protegidos
(`/reportes`, `/mcp`) exigen JWT igual. `herramientas/emisor_jwt_prueba.py` genera un
JWKS de juguete + un token firmado válido, usando el mismo código de verificación real
(no es un bypass). En `.env` (temporalmente, mientras pruebas local):
```
ADORBIT_IA_JWKS_URI=http://127.0.0.1:8099/certs
ADORBIT_IA_EMISOR=http://127.0.0.1:8099/prueba
```
Luego `python herramientas/emisor_jwt_prueba.py` (deja la terminal abierta) y usa el
`Authorization: Bearer ...` que imprime.

## Definición de terminado
Caso feliz + idempotencia probados · contrato y BD al día en los `.md` · demostrable en la defensa.
