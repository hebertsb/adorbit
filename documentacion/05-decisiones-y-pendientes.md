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
| D13 | 1 nov | En JSON el dinero viaja como **texto decimal** (`"1250.50"`), nunca como número | Evitar pérdida de precisión; coherente con NUMERIC/Decimal128 |

## Preguntas abiertas (confirmar con el docente)
1. Fecha exacta de entrega y formato de la defensa.
2. ¿GraphQL solo en el portal de gestión es suficiente?
3. Alcance exigido de MCP / inyección SQL (¿demo de ataque bloqueado?).
4. "Mínimo 3 bases de datos": ¿3 motores distintos o 3 instancias? (hoy: 3 motores, 5 bases).
5. ¿Se acepta Python (FastAPI) como cuarto lenguaje para IA?
6. ¿App móvil nativa (Flutter) o basta la PWA en el móvil?
7. Nombre correcto del docente (¿Ronaldo o Rolando?) y datos de portada de la universidad.
8. Nombre comercial final (AdOrbit / AdSphere).

## Riesgos
- Carga del Integrante C (IA + móvil): revisar al cierre de la Fase 1.
- Límites de los planes gratuitos (Supabase pausa proyectos inactivos; Atlas M0 tiene tope de conexiones).
- Modelos de IA locales pesados: medir tamaño antes de decidir despliegue.
- Los scripts de `base_de_datos/` se reconstruyeron a partir de la revisión de los originales del compañero:
  **comparar con sus archivos antes de reemplazarlos** y conservar lo que el original tenga de más.

## Registro de cambios
- 1 nov · Hebert (C) · Provisionado el proyecto Supabase real `ms-ia` (schema `base_de_datos/ms-ia.postgres.sql`); se detectaron las vistas `vista_mcp_*` accesibles por `anon`/`authenticated` y se corrigió con `REVOKE` (ver D12) · `base_de_datos/ms-ia.postgres.sql`
- 1 nov · Luis (B) · Contratos iniciales: esquemas JSON de 13 eventos/comandos (facturación y CRM) y OpenAPI de ms-facturacion y ms-clientes-crm; dinero en JSON como texto decimal; plan del Integrante B (D13) · `contratos/eventos/*`, `contratos/openapi/ms-facturacion.yaml`, `contratos/openapi/ms-clientes-crm.yaml`, `documentacion/03`, `documentacion/07`
(Añadir arriba una fila por cambio: fecha · quién · qué · archivos tocados.)
