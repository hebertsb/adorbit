# Keycloak SSO · AdOrbit

Servidor de Identidad y Gestión de Accesos (IAM) con protocolo OpenID Connect (OIDC) y OAuth2 para AdOrbit.

## Dominio y Configuración (`dominio.json`)

- **Reino (Realm)**: `adorbit`
- **Emisor (Issuer)**: `http://localhost:8080/realms/adorbit`
- **JWKS URI**: `http://localhost:8080/realms/adorbit/protocol/openid-connect/certs`
- **Token Endpoint**: `http://localhost:8080/realms/adorbit/protocol/openid-connect/token`

## Roles de Reino

| Rol | Descripción | Acceso Principal |
|---|---|---|
| `ejecutivo` | Ejecutivo de cuentas | Campañas, cotizaciones, CRM, briefs |
| `creativo` | Diseñador creativo | Subida y revisión de piezas creativas |
| `cliente` | Cliente anunciante | Portal del cliente, aprobación de cotizaciones, consulta de facturas |
| `gerente` | Gerencia general | Reportes IA, auditoría MCP, métricas BI |

## Clientes Configurados

1. `adorbit-frontend` (Público): Usado por las aplicaciones web (`portal-gestion`, `portal-cliente`, `panel-inteligencia`) y la aplicación móvil Flutter.
2. `ms-campanas` (Bearer-Only): Validación de tokens en el servicio de campañas.
3. `ms-facturacion` (Bearer-Only): Validación de tokens en facturación.
4. `ms-creatividades` (Bearer-Only): Validación de tokens en creatividades.
5. `ms-clientes-crm` (Bearer-Only): Validación de tokens en CRM de clientes.
6. `ms-ia` (Bearer-Only): Validación de tokens en reportes IA y servidor MCP.
7. `pasarela-api` (Bearer-Only): Validación de tokens en el API Gateway y GraphQL.

## Usuarios Semilla para Pruebas Locales

Todos los usuarios tienen la contraseña: **`Adorbit2026!`**

| Usuario / Correo | Nombre | Rol Asignado |
|---|---|---|
| `ejecutivo@adorbit.com` | Roly Ejecutivo | `ejecutivo` |
| `creativo@adorbit.com` | Hebert Creativo | `creativo` |
| `cliente@adorbit.com` | Carlos Anunciante | `cliente` |
| `gerente@adorbit.com` | Luis Gerente | `gerente` |
| `admin@adorbit.com` | Administrador | Todos (`ejecutivo`, `creativo`, `cliente`, `gerente`) |

## Administración
- **Consola de administración**: `http://localhost:8080`
- **Credenciales master**: `admin` / `admin`

