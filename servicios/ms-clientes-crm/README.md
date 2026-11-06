# ms-clientes-crm

> PHP 8 · Laravel · MVC por capas · MongoDB Atlas · Responsable: Integrante B

## Alcance
- Clientes, contactos, contratos
- **Línea de crédito** y **reservas de crédito** (SAGA)
- Idempotencia + outbox

## Estructura de código (obligatoria)
```
app/
  Http/Controllers  Http/Requests  Http/Resources   # capa de presentación
  Services/         # CreditoService (transacción atómica), ClienteService
  Repositories/     # acceso a Mongo
  Models/           # Cliente, Contrato, ReservaCredito
  Jobs/             # relay de outbox, consumidor de comandos SAGA
```
(Es la arquitectura clásica de Laravel; las 3 arquitecturas evaluadas están en los otros servicios.)

## API
`/clientes`, `/clientes/{id}/contactos`, `/contratos`, `/clientes/{id}/credito`.

## Eventos
Publica: `ClienteCreado/Actualizado`, `CreditoReservado/Rechazado/Liberado`. Consume: `ReservarCredito`, `LiberarCredito`.

## Base de datos
`base_de_datos/ms-clientes-crm.mongo.js` — colecciones: clientes (con `linea_credito`), contratos, reservas_credito, claves_idempotencia, bandeja_salida_eventos.

Seguridad: JWT de Keycloak, idempotencia en toda escritura, outbox para eventos (ver `AGENTS.md`).

## Cómo correrlo en local
```bash
cd servicios/ms-clientes-crm
docker compose -f docker-compose.local.yml up -d     # Mongo (replica set, para transacciones) + RabbitMQ
./preparar-bd-local.sh adorbit_crm                    # aplica base_de_datos/ms-clientes-crm.mongo.js
composer install && cp .env.ejemplo .env && php artisan key:generate   # completar las variables ADORBIT_CRM_*
php artisan serve --port=8084                         # API
php artisan crm:consumir-comandos                     # consumidor de la SAGA (proceso aparte)
php artisan crm:publicar-bandeja                      # relevo de la bandeja de salida (proceso aparte)
```
Pruebas: `./preparar-bd-local.sh adorbit_crm_test && php artisan test` (usan Mongo y RabbitMQ locales; los de RabbitMQ se
omiten si no responde). Calidad: `vendor/bin/pint --test` y `vendor/bin/phpstan analyse`.
En producción es una sola imagen (FrankenPHP, un servidor de producción con hilos; no `php -S`) con tres comandos: API (por
defecto), `php artisan crm:consumir-comandos` y `php artisan crm:publicar-bandeja`. Los logs salen en JSON por stderr.
Las pruebas se niegan a correr si la base no termina en `_test` (vacían colecciones).

## Tareas (en orden)
1. [x] Esqueleto Laravel + JWT + `/api/salud` (driver MongoDB)
2. [x] CRUD clientes/contratos con validación
3. [x] Reserva atómica de crédito en transacción Mongo (cliente + reserva + outbox)
4. [x] Liberación idempotente y consumo
5. [x] Consumidor de comandos SAGA y relay de outbox
6. [x] Tests: crédito insuficiente, reintento del mismo comando

## Definición de terminado
Caso feliz + idempotencia probados · contrato y BD al día en los `.md` · demostrable en la defensa.
