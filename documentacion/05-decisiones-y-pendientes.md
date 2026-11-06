# 05 · Decisiones y pendientes

## Decisiones tomadas
| # | Fecha | Decisión | Motivo |
|---|---|---|---|
| D1 | 14 oct | Caso de estudio único: agencia publicitaria (AdOrbit) | Pedido del docente |
| D2 | 14 oct | Sin Oracle; motores: PostgreSQL (Supabase), MongoDB (Atlas), DynamoDB | Planes gratuitos, ≥3 BD |
| D3 | 14 oct | GraphQL solo en el portal de gestión; el resto REST | Requisito del docente |
| D4 | 14 oct | App móvil en Flutter/Dart (no React Native) | El equipo domina Flutter |
| D5 | 14 oct | Se omite la 4.ª arquitectura (de despliegue) en el documento | Se verá según el peso del modelo local |
| D6 | 31 oct | **5 microservicios**; se elimina `ms-sync-idempotencia`; idempotencia en cada servicio | Menos carga y más seguro (misma transacción) |
| D7 | 31 oct | ms-facturacion pasa a **DynamoDB** (outbox + Streams) | Cubre DynamoDB y deja 2 proyectos Supabase |
| D8 | 31 oct | IDs entre servicios = UUID texto; Decimal128/NUMERIC para dinero | Evitar incompatibilidad ObjectId/UUID |
| D9 | 31 oct | Archivos en Supabase Storage o S3 | Atlas no guarda archivos |
| D10 | 31 oct | MCP con rol `lector_mcp`, vistas `vista_mcp_*` y auditoría de solo agregar | Defensa contra inyección SQL |
| D11 | 31 oct | Un solo **monorepo** (aplicaciones/, servicios/, contratos/, plataforma/, infraestructura/); sin librerías de runtime compartidas ni Kubernetes | Menos fricción para 3 personas; despliegue por imagen en nubes distintas |
| D12 | 1 nov | `base_de_datos/ms-ia.postgres.sql`: `REVOKE ALL ... FROM PUBLIC, anon, authenticated` sobre `vista_mcp_*` | Una vista corre con los permisos de su dueño (bypassa RLS); sin el REVOKE, Supabase deja esas vistas legibles con la anon key pública (detectado al provisionar el proyecto `ms-ia` real) |
| D13 | 5 nov | Prueba de "intento de inyección" del MCP de ms-ia = test automatizado (`tests/test_consultas_mcp.py`), no una demo en vivo | La pregunta abierta #3 nunca se confirmó con el docente; se interpretó la opción más simple y verificable: parámetros maliciosos (`'; DROP TABLE--`, etc.) se validan tipados *antes* de tocar `vista_mcp_*` y quedan registrados en `auditoria_mcp` con `bloqueado=true` |
| D14 | 5 nov | Proveedor de LLM para ms-ia (tareas 4-5) = **Groq**, modelo `openai/gpt-oss-120b` | Gratis, sin tarjeta, tool-calling real compatible con el formato de OpenAI (verificado con una llamada real), no entrena con los datos enviados — alternativas descartadas: Ollama (poco realista en el plan gratuito de despliegue), Gemini (sus términos gratuitos permiten entrenar/revisar el contenido enviado). El LLM nunca toca SQL: llama las mismas 4 herramientas de `ConsultasMcp` que ya usa el servidor MCP real (mismo código validado y auditado en `auditoria_mcp`), así que la regla "todo acceso de IA a datos pasa por MCP" se cumple sin abrir una sesión MCP cliente-servidor aparte dentro del mismo proceso. `llama-3.3-70b-versatile` (el modelo mencionado originalmente) ya no existe en el catálogo de Groq al momento de implementar — se confirmó la lista real de modelos disponibles antes de fijar el nombre |

## Preguntas abiertas (confirmar con el docente)
1. Fecha exacta de entrega y formato de la defensa.
2. ¿GraphQL solo en el portal de gestión es suficiente?
3. Alcance exigido de MCP / inyección SQL (¿demo de ataque bloqueado en vivo, o alcanza con la prueba automatizada ya implementada — ver D13?).
4. "Mínimo 3 bases de datos": ¿3 motores distintos o 3 instancias? (hoy: 3 motores, 5 bases).
5. ¿Se acepta Python (FastAPI) como cuarto lenguaje para IA? (se avanzó construyendo `ms-ia` en Python sin esperar la confirmación — riesgo asumido, no decisión del docente)
6. ¿App móvil nativa (Flutter) o basta la PWA en el móvil? (se avanzó construyendo `app-movil` en Flutter sin esperar la confirmación — mismo riesgo)
7. Nombre correcto del docente (¿Ronaldo o Rolando?) y datos de portada de la universidad.
8. Nombre comercial final (AdOrbit / AdSphere).

## Riesgos
- Carga del Integrante C (IA + móvil): revisar al cierre de la Fase 1.
- Límites de los planes gratuitos (Supabase pausa proyectos inactivos; Atlas M0 tiene tope de conexiones).
- Modelos de IA locales pesados: medir tamaño antes de decidir despliegue.
- Los scripts de `base_de_datos/` se reconstruyeron a partir de la revisión de los originales del compañero:
  **comparar con sus archivos antes de reemplazarlos** y conservar lo que el original tenga de más.

## Registro de cambios
- 5 nov · Hebert (C) · Tarea 4 de `ms-ia`: reportes en lenguaje natural con Groq (tool-calling sobre las mismas 4 herramientas MCP auditadas) + exportación PDF/Excel con gráfico cuando los datos lo permiten; primer endpoint de escritura del servicio, con idempotencia (`claves_idempotencia`, ya existente en el esquema) ver D14 · `servicios/ms-ia/app/{domain/reporte_generado.py,use_cases/generar_reporte.py,use_cases/exportar_reporte.py,use_cases/compartido/idempotencia.py,adapters/llm/,api/reportes.py}`, `base_de_datos/ms-ia.postgres.sql`, `contratos/openapi/ms-ia.yaml`
- 5 nov · Hebert (C) · Construidas las tareas 1-3 de `ms-ia` (esqueleto FastAPI+JWT, consumidor de eventos con read model, servidor MCP real con las 4 herramientas + auditoría + prueba de inyección automatizada, ver D13); tareas 4-6 quedan pendientes de elegir proveedor de LLM · `servicios/ms-ia/`, `contratos/openapi/ms-ia.yaml`, `contratos/eventos/AlertaCampana.schema.json`, `contratos/eventos/PiezaAnalizada.schema.json`
- 1 nov · Hebert (C) · Provisionado el proyecto Supabase real `ms-ia` (schema `base_de_datos/ms-ia.postgres.sql`); se detectaron las vistas `vista_mcp_*` accesibles por `anon`/`authenticated` y se corrigió con `REVOKE` (ver D12) · `base_de_datos/ms-ia.postgres.sql`
(Añadir arriba una fila por cambio: fecha · quién · qué · archivos tocados.)
