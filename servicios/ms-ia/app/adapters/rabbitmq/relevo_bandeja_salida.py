"""Relevo del outbox (tarea 5): lee bandeja_salida_eventos (publicado_en IS NULL),
publica en adorbit.eventos con publisher confirms, y SOLO marca publicado_en tras la
confirmacion del broker -- si RabbitMQ cae a mitad de camino la fila sigue pendiente y
se reintenta en la proxima vuelta (entrega al menos una vez; los consumidores dedupen
por id_evento, regla del proyecto). Puerto a Python de RelevoBandejaSalida.ts
(ms-creatividades/src/adapters/rabbitmq/), misma clave de enrutamiento
("AlertaCampana" -> "alerta.campana") para que el exchange sea interoperable entre
servicios.
"""

from __future__ import annotations

import asyncio
import contextlib
import json
import logging
import os
import re

import aio_pika
from aio_pika.abc import AbstractRobustConnection

from ..postgres.conexion import obtener_pool_principal

logger = logging.getLogger("ms_ia.relevo_bandeja_salida")

EXCHANGE_EVENTOS = "adorbit.eventos"
INTERVALO_SEGUNDOS = 2
TAMANO_LOTE = 20

_PATRON_CLAVE = re.compile(r"([a-z0-9])([A-Z])")


def clave_enrutamiento(tipo_evento: str) -> str:
    return _PATRON_CLAVE.sub(r"\1.\2", tipo_evento).lower()


class RelevoBandejaSalida:
    def __init__(self) -> None:
        self._conexion: AbstractRobustConnection | None = None
        self._tarea: asyncio.Task[None] | None = None

    async def iniciar(self) -> None:
        url = os.environ.get("ADORBIT_IA_RABBITMQ_URL")
        if not url:
            raise RuntimeError("Falta la variable de entorno ADORBIT_IA_RABBITMQ_URL")

        self._conexion = await aio_pika.connect_robust(url)
        self._tarea = asyncio.create_task(self._bucle())
        logger.info("Relevo de bandeja_salida_eventos arrancado")

    async def detener(self) -> None:
        if self._tarea is not None:
            self._tarea.cancel()
            with contextlib.suppress(asyncio.CancelledError):
                await self._tarea
        if self._conexion is not None:
            await self._conexion.close()

    async def _bucle(self) -> None:
        canal = await self._conexion.channel(publisher_confirms=True)  # type: ignore[union-attr]
        exchange = await canal.declare_exchange(EXCHANGE_EVENTOS, aio_pika.ExchangeType.TOPIC, durable=True)
        while True:
            try:
                await self.procesar_una_vuelta(exchange)
            except asyncio.CancelledError:
                raise
            except Exception:
                logger.exception("Fallo procesando una vuelta del relevo")
            await asyncio.sleep(INTERVALO_SEGUNDOS)

    async def procesar_una_vuelta(self, exchange: aio_pika.abc.AbstractExchange) -> int:
        pool = await obtener_pool_principal()
        async with pool.acquire() as conexion:
            pendientes = await conexion.fetch(
                """
                SELECT id, tipo_agregado, agregado_id, tipo_evento, carga, creado_en
                FROM bandeja_salida_eventos
                WHERE publicado_en IS NULL
                ORDER BY secuencia
                LIMIT $1
                """,
                TAMANO_LOTE,
            )

            publicados = 0
            for fila in pendientes:
                sobre = {
                    "id_evento": str(fila["id"]),
                    "tipo_evento": fila["tipo_evento"],
                    "version_esquema": 1,
                    "ocurrido_en": fila["creado_en"].isoformat(),
                    "agregado_id": str(fila["agregado_id"]),
                    "correlacion_id": str(fila["id"]),
                    "carga": json.loads(fila["carga"]),
                }
                mensaje = aio_pika.Message(
                    body=json.dumps(sobre, default=str).encode("utf-8"),
                    content_type="application/json",
                    message_id=sobre["id_evento"],
                    type=sobre["tipo_evento"],
                    delivery_mode=aio_pika.DeliveryMode.PERSISTENT,
                )
                await exchange.publish(mensaje, routing_key=clave_enrutamiento(fila["tipo_evento"]))
                await conexion.execute(
                    "UPDATE bandeja_salida_eventos SET publicado_en = now() WHERE id = $1", fila["id"]
                )
                publicados += 1
            return publicados
