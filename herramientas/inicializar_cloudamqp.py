"""Script para inicializar la topologia completa de RabbitMQ en CloudAMQP para AdOrbit
(Exchanges, Queues y Bindings requeridos para la SAGA y eventos)."""

import asyncio
import aio_pika

URL_CLOUDAMQP = "amqps://twrxyrzb:pKm6UQ6jImJCG-zUaMiLko7xTDj_yCuS@jaragua.lmq.cloudamqp.com/twrxyrzb"

async def inicializar():
    print(f"Conectando a CloudAMQP...")
    conexion = await aio_pika.connect_robust(URL_CLOUDAMQP)
    canal = await conexion.channel()
    print("Conexión establecida.")

    # 1. Exchanges
    ex_eventos = await canal.declare_exchange("adorbit.eventos", aio_pika.ExchangeType.TOPIC, durable=True)
    ex_saga = await canal.declare_exchange("adorbit.saga", aio_pika.ExchangeType.DIRECT, durable=True)
    ex_dlx = await canal.declare_exchange("adorbit.dlx", aio_pika.ExchangeType.FANOUT, durable=True)
    ex_saga_dlx = await canal.declare_exchange("adorbit.saga.dlx", aio_pika.ExchangeType.DIRECT, durable=True)
    ex_eventos_dlx = await canal.declare_exchange("adorbit.eventos.dlx", aio_pika.ExchangeType.DIRECT, durable=True)
    print("Exchanges creados: adorbit.eventos, adorbit.saga, adorbit.dlx, adorbit.saga.dlx, adorbit.eventos.dlx")

    # 2. Queues DLQ
    cola_muerta = await canal.declare_queue("cola.muerta", durable=True)
    await cola_muerta.bind(ex_dlx)
    
    cola_ia_dlq = await canal.declare_queue("eventos.ia.dlq", durable=True)
    await cola_ia_dlq.bind(ex_eventos_dlx, routing_key="eventos.ia")

    cola_facturacion_dlq = await canal.declare_queue("saga.facturacion.dlq", durable=True)
    await cola_facturacion_dlq.bind(ex_saga_dlx, routing_key="saga.facturacion")

    # Colas SAGA
    q_saga_campanas = await canal.declare_queue("saga.campanas", durable=True, arguments={
        "x-dead-letter-exchange": "adorbit.dlx",
        "x-dead-letter-routing-key": "saga.campanas.dlq"
    })
    q_saga_crm = await canal.declare_queue("saga.crm", durable=True, arguments={
        "x-dead-letter-exchange": "adorbit.dlx",
        "x-dead-letter-routing-key": "saga.crm.dlq"
    })
    q_saga_creatividades = await canal.declare_queue("saga.creatividades", durable=True, arguments={
        "x-dead-letter-exchange": "adorbit.dlx",
        "x-dead-letter-routing-key": "saga.creatividades.dlq"
    })

    # Si saga.facturacion ya existe, intentar declararla con sus argumentos exactos
    try:
        q_saga_facturacion = await canal.declare_queue("saga.facturacion", durable=True, arguments={
            "x-dead-letter-exchange": "adorbit.saga.dlx",
            "x-dead-letter-routing-key": "saga.facturacion"
        })
    except Exception as e:
        print(f"Aviso al declarar saga.facturacion: {e}")
        # Reabrir canal si fue cerrado por PRECONDITION_FAILED
        canal = await conexion.channel()
        q_saga_facturacion = await canal.declare_queue("saga.facturacion", passive=True)

    # Colas de Eventos
    q_eventos_n8n = await canal.declare_queue("eventos.n8n", durable=True, arguments={
        "x-dead-letter-exchange": "adorbit.dlx",
        "x-dead-letter-routing-key": "eventos.n8n.dlq"
    })
    q_n8n_factura = await canal.declare_queue("n8n.factura-emitida", durable=True)
    q_eventos_creatividades = await canal.declare_queue("eventos.creatividades", durable=True, arguments={
        "x-dead-letter-exchange": "adorbit.dlx",
        "x-dead-letter-routing-key": "eventos.creatividades.dlq"
    })
    q_eventos_ia = await canal.declare_queue("eventos.ia", durable=True, arguments={
        "x-dead-letter-exchange": "adorbit.eventos.dlx",
        "x-dead-letter-routing-key": "eventos.ia"
    })

    print("Colas creadas con éxito.")

    # 3. Bindings SAGA (Comandos)
    await q_saga_campanas.bind(ex_saga, routing_key="saga.campanas")
    await q_saga_crm.bind(ex_saga, routing_key="saga.crm")
    await q_saga_creatividades.bind(ex_saga, routing_key="saga.creatividades")
    await q_saga_facturacion.bind(ex_saga, routing_key="saga.facturacion")

    # Bindings SAGA (Respuestas y eventos hacia el Orquestador ms-campanas)
    respuestas_saga = [
        "credito.reservado",
        "credito.rechazado",
        "credito.liberado",
        "piezas.bloqueadas",
        "bloqueo.fallido",
        "piezas.desbloqueadas",
        "factura.emitida",
        "facturacion.fallida",
        "nota.credito.emitida"
    ]
    for rk in respuestas_saga:
        await q_saga_campanas.bind(ex_eventos, routing_key=rk)

    # Bindings n8n
    for rk in ["campana.#", "alerta.#", "factura.#"]:
        await q_eventos_n8n.bind(ex_eventos, routing_key=rk)
    await q_n8n_factura.bind(ex_eventos, routing_key="factura.emitida")

    # Bindings Creatividades e IA
    await q_eventos_creatividades.bind(ex_eventos, routing_key="pieza.analizada")
    for rk in ["campana.*", "cliente.*", "factura.*", "facturacion.*", "brief.*", "pieza.*"]:
        await q_eventos_ia.bind(ex_eventos, routing_key=rk)

    print("Todos los bindings vinculados exitosamente!")
    await conexion.close()
    print("¡Broker CloudAMQP aprovisionado al 100% y listo para producción multi-cloud!")

if __name__ == "__main__":
    asyncio.run(inicializar())
