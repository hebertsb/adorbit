"""Consumidor de eventos.ia — bindeado por patrones de agregado sobre adorbit.eventos.
Dedupe + read model via ProcesarEvento, en una sola transaccion de Postgres por
mensaje. Mismo patron de 2 niveles que el consumidor de ms-creatividades: forma/datos
invalidos -> DLQ sin reintento; error transitorio -> reintento acotado via x-death.
"""

from __future__ import annotations

import json
import logging
import os
from uuid import UUID

import aio_pika
from aio_pika.abc import AbstractIncomingMessage, AbstractRobustConnection

from ...domain.errores import ExcepcionDominio
from ...use_cases.procesar_evento import ProcesarEvento
from ..postgres.conexion import obtener_pool_principal

logger = logging.getLogger("ms_ia.consumidor")

EXCHANGE_EVENTOS = "adorbit.eventos"
EXCHANGE_DLX = "adorbit.eventos.dlx"
COLA = "eventos.ia"
COLA_DLQ = "eventos.ia.dlq"
PATRONES_ENLACE = ["campana.*", "cliente.*", "factura.*", "facturacion.*", "brief.*", "pieza.*"]
MAX_INTENTOS = 5


class ConsumidorEventos:
    def __init__(self, procesar_evento: ProcesarEvento) -> None:
        self._procesar_evento = procesar_evento
        self._conexion: AbstractRobustConnection | None = None

    async def iniciar(self) -> None:
        url = os.environ.get("ADORBIT_IA_RABBITMQ_URL")
        if not url:
            raise RuntimeError("Falta la variable de entorno ADORBIT_IA_RABBITMQ_URL")

        self._conexion = await aio_pika.connect_robust(url)
        canal = await self._conexion.channel()
        await canal.set_qos(prefetch_count=10)

        exchange = await canal.declare_exchange(EXCHANGE_EVENTOS, aio_pika.ExchangeType.TOPIC, durable=True)
        exchange_dlx = await canal.declare_exchange(EXCHANGE_DLX, aio_pika.ExchangeType.DIRECT, durable=True)
        cola_dlq = await canal.declare_queue(COLA_DLQ, durable=True)
        await cola_dlq.bind(exchange_dlx, routing_key=COLA)

        cola = await canal.declare_queue(
            COLA,
            durable=True,
            arguments={"x-dead-letter-exchange": EXCHANGE_DLX, "x-dead-letter-routing-key": COLA},
        )
        for patron in PATRONES_ENLACE:
            await cola.bind(exchange, routing_key=patron)

        await cola.consume(self._procesar_mensaje)
        logger.info("Consumidor de eventos.ia arrancado (%d patrones de enlace)", len(PATRONES_ENLACE))

    async def detener(self) -> None:
        if self._conexion is not None:
            await self._conexion.close()

    async def _procesar_mensaje(self, mensaje: AbstractIncomingMessage) -> None:
        async with mensaje.process(ignore_processed=True):
            try:
                sobre = json.loads(mensaje.body.decode("utf-8"))
                id_evento = UUID(sobre["id_evento"])
                tipo_evento = sobre["tipo_evento"]
                carga = sobre.get("carga", {})
            except Exception:
                logger.exception("Mensaje con forma invalida, va a la DLQ")
                await mensaje.reject(requeue=False)
                return

            try:
                pool = await obtener_pool_principal()
                async with pool.acquire() as conexion, conexion.transaction():
                    proceso = await self._procesar_evento.ejecutar(id_evento, tipo_evento, carga, conexion)
                if proceso:
                    logger.info("Evento %s (%s) procesado", tipo_evento, id_evento)
                else:
                    logger.debug("Evento %s (%s) ya estaba procesado, se ignora", tipo_evento, id_evento)
                await mensaje.ack()
            except ExcepcionDominio:
                logger.exception("Evento con datos invalidos, va a la DLQ")
                await mensaje.reject(requeue=False)
            except Exception:
                intentos = _contar_intentos_previos(mensaje)
                logger.exception("Error transitorio procesando evento (intento %d)", intentos + 1)
                await mensaje.nack(requeue=intentos < MAX_INTENTOS)


def _contar_intentos_previos(mensaje: AbstractIncomingMessage) -> int:
    cabeceras = mensaje.headers or {}
    muertes = cabeceras.get("x-death") if isinstance(cabeceras, dict) else None
    if not isinstance(muertes, list):
        return 0
    total = 0
    for muerte in muertes:
        if isinstance(muerte, dict):
            valor = muerte.get("count", 0)
            total += valor if isinstance(valor, int) else 0
    return total
