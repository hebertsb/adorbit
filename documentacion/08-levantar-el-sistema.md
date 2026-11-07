# Cómo levantar y usar el sistema en local

Guía del script `herramientas/sistema.sh`, que enciende, apaga y revisa todo AdOrbit con Docker: frontends, servicios,
broker (RabbitMQ), identidad (Keycloak simulado), n8n y el buzón de correos de prueba.

## Antes de empezar
1. **Docker Desktop abierto.**
2. **Archivo `infraestructura/.env`** (no se versiona). Se crea desde la plantilla:
   ```bash
   cp infraestructura/.env.ejemplo infraestructura/.env
   ```
   y se completan, como mínimo, estos valores (se piden a quien administra cada recurso, por un canal fuera del repo):
   | Variable | Para qué |
   |---|---|
   | `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` | acceso a la tabla DynamoDB `AdOrbitFacturacion` |
   | `CRM_APP_KEY` | clave de Laravel (`php artisan key:generate --show`) |
   | `CRM_MONGO_DSN`, `CRM_MONGO_BD` | MongoDB Atlas del CRM |
   | `CREATIVIDADES_URL_BD`, `IA_URL_BD`, `CAMPANAS_URL_BD` | solo para el perfil `equipo` (Atlas y Supabase de Hebert y Roly) |
3. Si falta el `.env`, el script lo crea desde la plantilla y se detiene para que lo completes.

## Comandos
Se ejecutan desde la raíz del repositorio.

| Comando | Qué hace |
|---|---|
| `herramientas/sistema.sh levantar` | Enciende la parte del Integrante B, espera a que cada pieza responda e imprime las direcciones |
| `herramientas/sistema.sh levantar --equipo` | Lo anterior más ms-creatividades, ms-ia y la pasarela |
| `herramientas/sistema.sh levantar ms-ia n8n` | Enciende solo esos servicios (y lo que necesitan) |
| `herramientas/sistema.sh levantar --construir` | Reconstruye las imágenes antes de encender (usar tras cambiar código) |
| `herramientas/sistema.sh apagar` | Apaga todo el sistema; los datos de AWS y Atlas no se tocan |
| `herramientas/sistema.sh apagar ms-ia pasarela` | Apaga solo esos servicios |
| `herramientas/sistema.sh reiniciar n8n` | Apaga y vuelve a encender ese servicio |
| `herramientas/sistema.sh estado` | Tabla con el estado (encendido, apagado o sin respuesta) y la dirección de cada pieza |
| `herramientas/sistema.sh urls` | Direcciones para abrir en el navegador |
| `herramientas/sistema.sh registros ms-facturacion -f` | Registros del servicio; con `-f`, en vivo |
| `herramientas/sistema.sh token cliente` | Token de prueba del Keycloak simulado (`gerente` por defecto) |
| `herramientas/sistema.sh demo` | Emite una factura de prueba y espera el correo de n8n en Mailpit |
| `herramientas/sistema.sh ayuda` | Resumen de los comandos |

Grupos de servicios: **núcleo** = rabbitmq, keycloak, mailpit, ms-facturacion, ms-clientes-crm, portal-cliente,
panel-inteligencia, n8n. **equipo** = ms-creatividades, ms-ia, pasarela. ms-campanas no está incluido porque aún no se
puede levantar en local (falta su conexión a Supabase y su Dockerfile no construye en procesadores ARM).

## Qué abrir en el navegador
| Pieza | Dirección | Acceso |
|---|---|---|
| Portal del cliente | http://localhost:4173 | Keycloak simulado: usuario libre, rol `cliente` y un `cliente_id` (el de prueba es `0555d3fa-3ceb-4359-82b2-3c4d00902550`) |
| Panel de inteligencia | http://localhost:4174 | Rol `gerente`, sin `cliente_id`. Los reportes necesitan ms-ia con su base conectada |
| n8n | http://localhost:5678 | La primera vez pide crear tu usuario propietario (es solo de tu instancia local) |
| Correos de prueba (Mailpit) | http://localhost:8025 | Sin cuenta |
| RabbitMQ | http://localhost:15672 | `guest` / `guest` |
| Pasarela (REST y GraphQL) | http://localhost:8000 | Con `Authorization: Bearer <token>` |

El Keycloak simulado no valida contraseñas: es solo para desarrollo. El rol `cliente` solo ve los datos de su
`cliente_id`.

## Ver el sistema reaccionar
```bash
herramientas/sistema.sh levantar
herramientas/sistema.sh demo
```
Se emite una factura en ms-facturacion (DynamoDB), el relevo la publica en RabbitMQ, n8n la consume, busca el contacto en
el CRM y manda el correo, que aparece en http://localhost:8025 en unos 20 segundos.

## Problemas frecuentes
- **«Docker no está corriendo»**: abrir Docker Desktop.
- **Una pieza aparece «sin respuesta»**: `herramientas/sistema.sh registros <servicio>`. Si ms-ia muestra un error de
  contraseña, falta `IA_URL_BD` real en el `.env`.
- **Sesión caducada en un portal**: el token del simulador dura 5 minutos; volver a entrar.
- **Cambié código y no se nota**: `herramientas/sistema.sh levantar --construir <servicio>`.
- **Apagar todo y empezar limpio**: `herramientas/sistema.sh apagar` y luego `levantar`. Los datos de n8n (usuario y
  flujos) se conservan en un volumen de Docker.
