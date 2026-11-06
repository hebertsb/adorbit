# RabbitMQ · AdOrbit

Broker de mensajería transversal para eventos de dominio y orquestación SAGA de AdOrbit.

## Topología configurada

### Exchanges
1. `adorbit.eventos` (`topic`, durable): Publicación de eventos de dominio por parte de todos los microservicios.
2. `adorbit.saga` (`direct`, durable): Comunicación de comandos y respuestas entre el orquestador SAGA (`ms-campanas`) y los participantes (`ms-clientes-crm`, `ms-creatividades`, `ms-facturacion`).
3. `adorbit.dlx` (`fanout`, durable): Dead Letter Exchange para enrutar mensajes fallidos o venenosos.

### Colas y Enrutamiento

| Cola | Tipo | Dead Letter | Origen / Routing Key | Propósito |
|---|---|---|---|---|
| `saga.campanas` | Directa | `adorbit.dlx` | `adorbit.saga` -> `saga.campanas` | Respuestas de SAGA recibidas por `ms-campanas` |
| `saga.crm` | Directa | `adorbit.dlx` | `adorbit.saga` -> `saga.crm` | Comandos `ReservarCredito` / `LiberarCredito` para `ms-clientes-crm` |
| `saga.creatividades` | Directa | `adorbit.dlx` | `adorbit.saga` -> `saga.creatividades` | Comandos `BloquearPiezas` / `DesbloquearPiezas` para `ms-creatividades` |
| `saga.facturacion` | Directa | `adorbit.dlx` | `adorbit.saga` -> `saga.facturacion` | Comandos `EmitirFactura` / `EmitirNotaCredito` para `ms-facturacion` |
| `eventos.ia` | Topic | `adorbit.dlx` | `adorbit.eventos` -> `#` | Ingesta de todos los eventos para el read model de `ms-ia` |
| `eventos.n8n` | Topic | `adorbit.dlx` | `adorbit.eventos` -> `campana.#`, `alerta.#`, `factura.#` | Disparadores para automatizaciones en n8n |
| `eventos.creatividades` | Topic | `adorbit.dlx` | `adorbit.eventos` -> `pieza.analizada` | Recepción de análisis de marca para creatividades |
| `cola.muerta` | DLQ | N/A | `adorbit.dlx` | Acumulador de mensajes descartados con causas de error |

## Carga automática

Al arrancar la imagen oficial con `rabbitmq.conf` y `definiciones.json`, las colas, exchanges y enlaces se crean automáticamente al iniciar el contenedor.

## Conexión
- **AMQP**: `amqp://guest:guest@localhost:5672/`
- **Panel de control**: `http://localhost:15672` (usuario: `guest`, contraseña: `guest`)

