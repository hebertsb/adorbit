package com.adorbit.facturacion.adaptador.salida.rabbit;

import com.adorbit.facturacion.aplicacion.puerto.salida.EventoPublicable;
import com.adorbit.facturacion.aplicacion.puerto.salida.PublicadorEventosPuerto;
import java.nio.charset.StandardCharsets;
import org.springframework.amqp.core.Message;
import org.springframework.amqp.core.MessageBuilder;
import org.springframework.amqp.core.MessageDeliveryMode;
import org.springframework.amqp.core.MessageProperties;
import org.springframework.amqp.rabbit.core.RabbitTemplate;

/** Publica en el exchange {@code adorbit.eventos} (topic) y espera la confirmacion del broker. */
public class PublicadorEventosRabbit implements PublicadorEventosPuerto {

    public static final String EXCHANGE_EVENTOS = "adorbit.eventos";
    private static final long ESPERA_CONFIRMACION_MS = 5_000;

    private final RabbitTemplate plantilla;

    public PublicadorEventosRabbit(RabbitTemplate plantilla) {
        this.plantilla = plantilla;
    }

    @Override
    public void publicar(EventoPublicable evento) {
        Message mensaje = MessageBuilder.withBody(evento.cuerpoJson().getBytes(StandardCharsets.UTF_8))
                .setContentType(MessageProperties.CONTENT_TYPE_JSON)
                .setContentEncoding("UTF-8")
                .setMessageId(evento.idEvento())
                .setType(evento.tipoEvento())
                .setDeliveryMode(MessageDeliveryMode.PERSISTENT)
                .build();
        plantilla.invoke(canal -> {
            canal.send(EXCHANGE_EVENTOS, evento.claveEnrutamiento(), mensaje);
            canal.waitForConfirmsOrDie(ESPERA_CONFIRMACION_MS);
            return null;
        });
    }
}
