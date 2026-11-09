# 02 · SAGA "Aprobar y contratar campaña"

Orquestada por **ms-campanas** (tablas `saga_transacciones`, `saga_pasos`). Participan 4 servicios.
Mensajería: RabbitMQ + Outbox. Entrega al menos una vez ⇒ cada comando es **idempotente**.

## Disparo
`POST /api/v1/campanas/{id}/contratar` con header `Idempotency-Key`. Crea `saga_transacciones`
(`clave_idempotencia` única; solo una SAGA activa por campaña) y responde `202` con `saga_id`.
El cliente consulta `GET /api/v1/sagas/{saga_id}` (o recibe el evento final).

## Pasos y compensaciones
| # | Servicio | Acción (comando) | Estado SAGA | Compensación |
|---|---|---|---|---|
| 1 | ms-campanas | Reservar presupuesto; campaña → `pendiente` | `reservando_presupuesto` | Cancelar campaña, liberar presupuesto |
| 2 | ms-clientes-crm | `ReservarCredito` (atómico sobre `linea_credito`, inserta `reservas_credito`) | `reservando_credito` | `LiberarCredito` (idempotente, devuelve `usado`) |
| 3 | ms-creatividades | `BloquearPiezas` (bloqueo con `expira_at`) | `bloqueando_piezas` | `DesbloquearPiezas` (solo si `saga_id` coincide) |
| 4 | ms-facturacion | `EmitirFactura` (factura + outbox + idempotencia en 1 transacción) | `facturando` | `EmitirNotaCredito` que anula la factura |
| 5 | ms-campanas | Campaña → `activa`; presupuesto `consumido`; reserva → `consumido`; avisar por n8n | `completada` | — |

Fallo en el paso *k* ⇒ estado `compensando`; se ejecutan las compensaciones de *k−1 … 1* en orden
inverso; al terminar ⇒ `compensada` y campaña `rechazada`. Si falla una compensación tras N intentos ⇒
`fallida` (intervención manual). `rechazada` = rechazo de negocio en el paso 1–2 sin nada que deshacer.

## Reglas de implementación
- **Clave de comando:** `clave_comando = sagaId:orden:tipo` (`tipo` = `accion|compensacion`). El receptor la
  registra en su `claves_idempotencia`; si ya existe, **no reejecuta** y devuelve el mismo resultado.
- **Misma transacción:** cada cambio de estado de la SAGA + su fila de `bandeja_salida_eventos`.
- **Timeout:** `limite_en` (10 min). Un job busca SAGAs vencidas y las compensa.
- **Concurrencia del orquestador:** columna `version` (optimistic locking) en `saga_transacciones`.
- **Bloqueo de piezas:** `updateOne` atómico con filtro `estado: "aprobada"`; 0 modificados ⇒ el paso
  falla. El job de expiración libera bloqueos vencidos; el paso 5 debe fallar si el bloqueo ya no existe.
- **Crédito:** reservar con una sola actualización condicional + inserción de reserva + outbox en una
  transacción de Mongo (Atlas lo soporta, incluso M0).
- **Facturación:** `TransactWriteItems` = factura + ítem `SALIDA#` + ítem `IDEMP#`.

## Eventos de la SAGA (ver `documentacion/03-contratos.md`)
`SagaIniciada` → comandos `ReservarCredito`, `BloquearPiezas`, `EmitirFactura` → respuestas
`CreditoReservado|CreditoRechazado`, `PiezasBloqueadas|BloqueoFallido`, `FacturaEmitida|FacturacionFallida`
→ `CampanaContratada` | `CampanaRechazada`.

## Casos de prueba mínimos (por equipo)
1. Camino feliz: campaña queda `activa`, 1 factura, crédito `consumido`, piezas bloqueadas/confirmadas.
2. Falla crédito insuficiente (paso 2): campaña `rechazada`, presupuesto liberado, sin factura.
3. Falla facturación (paso 4): crédito liberado, piezas desbloqueadas, presupuesto liberado.
4. Reenvío del mismo comando: no duplica reserva, bloqueo ni factura.
5. Bloqueo expirado antes del paso 5: la SAGA compensa.

## Verificacion integrada (9 de noviembre de 2026)

Los cinco casos se ejecutaron contra los microservicios reales levantados con Docker Compose, RabbitMQ local y las bases configuradas:

1. Camino feliz: `completada`; credito reservado, pieza bloqueada y factura emitida.
2. Credito insuficiente: `rechazada` en el paso 2, sin bloqueo ni factura.
3. Fallo de facturacion (`total_no_coincide` controlado): `compensada`; credito liberado y pieza desbloqueada.
4. Reenvio con la misma `Idempotency-Key`: devolvio el mismo `saga_id` y no creo participantes duplicados.
5. Limite vencido despues del bloqueo y antes de completar: `compensada`; se emitio nota de credito, se libero el credito y se desbloqueo la pieza.

El ejecutor reproducible esta en `herramientas/probar-saga.ps1`. El plazo normal sigue siendo 600 segundos; `ADORBIT_CAMPANAS_SAGA_TIEMPO_LIMITE_SEGUNDOS` permite reducirlo de forma controlada para la prueba de expiracion.
