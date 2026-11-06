# Pasarela API y Gateway GraphQL · AdOrbit

Punto de entrada unificado para el portal de gestión y los clientes de AdOrbit.

## Funcionalidades

1. **Gateway GraphQL (Apollo Server)**:
   - Expuesto en `/graphql`.
   - Reúne consultas complejas de múltiples microservicios (Campaña + Presupuesto + Calendario + Cliente CRM + Facturas + Piezas).
   - Ejecuta mutaciones hacia el servicio dueño (`ms-campanas`).
2. **Proxy Inverso REST (`/api/v1/*`)**:
   - `/api/v1/campanas/*`, `/api/v1/sagas/*` -> `ms-campanas`
   - `/api/v1/clientes/*`, `/api/v1/contratos/*` -> `ms-clientes-crm`
   - `/api/v1/facturas/*`, `/api/v1/cotizaciones/*` -> `ms-facturacion`
   - `/api/v1/briefs/*`, `/api/v1/piezas/*` -> `ms-creatividades`
   - `/api/v1/reportes/*`, `/api/v1/agentes/*`, `/api/v1/vision/*`, `/api/v1/mcp/*` -> `ms-ia`
3. **Validación SSO OIDC / JWT**:
   - Valida la firma del token emitido por Keycloak contra el JWKS configurado (`/protocol/openid-connect/certs`).
   - Bloquea peticiones no autenticadas excepto endpoints públicos (`/salud`, `/listo`, `OPTIONS`).
4. **Verificación de Salud**:
   - `/salud`
   - `/listo`

## Variables de Entorno

| Variable | Descripción | Valor por Defecto |
|---|---|---|
| `PORT` | Puerto HTTP | `8000` |
| `ADORBIT_PASARELA_JWKS_URI` | URL de JWKS Keycloak | `http://localhost:8080/realms/adorbit/protocol/openid-connect/certs` |
| `ADORBIT_PASARELA_EMISOR` | Emisor OIDC válido | `http://localhost:8080/realms/adorbit` |
| `URL_MS_CAMPANAS` | Dirección de ms-campanas | `http://localhost:8081` |
| `URL_MS_CLIENTES_CRM` | Dirección de ms-clientes-crm | `http://localhost:8082` |
| `URL_MS_FACTURACION` | Dirección de ms-facturacion | `http://localhost:8083` |
| `URL_MS_CREATIVIDADES` | Dirección de ms-creatividades | `http://localhost:8084` |
| `URL_MS_IA` | Dirección de ms-ia | `http://localhost:8085` |

