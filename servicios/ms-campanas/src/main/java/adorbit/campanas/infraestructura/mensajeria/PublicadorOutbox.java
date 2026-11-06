package adorbit.campanas.infraestructura.mensajeria;

import adorbit.campanas.dominio.modelo.BandejaSalidaEvento;
import adorbit.campanas.dominio.repositorio.BandejaSalidaRepositorio;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Component
@EnableScheduling
@org.springframework.context.annotation.Profile("!test")
public class PublicadorOutbox {

    private static final Logger log = LoggerFactory.getLogger(PublicadorOutbox.class);

    private final BandejaSalidaRepositorio outboxRepositorio;
    private final RabbitTemplate rabbitTemplate;

    public PublicadorOutbox(BandejaSalidaRepositorio outboxRepositorio, RabbitTemplate rabbitTemplate) {
        this.outboxRepositorio = outboxRepositorio;
        this.rabbitTemplate = rabbitTemplate;
    }

    @Scheduled(fixedDelay = 2000)
    @Transactional
    public void procesarEventosPendientes() {
        List<BandejaSalidaEvento> pendientes = outboxRepositorio.findEventosPendientes();
        if (pendientes.isEmpty()) {
            return;
        }

        for (BandejaSalidaEvento evento : pendientes) {
            try {
                String exchange;
                String routingKey;

                if ("SagaComando".equals(evento.getTipoAgregado())) {
                    exchange = ConfiguracionRabbitMQ.EXCHANGE_SAGA;
                    routingKey = "saga.comando." + evento.getTipoEvento().toLowerCase();
                } else {
                    exchange = ConfiguracionRabbitMQ.EXCHANGE_EVENTOS;
                    routingKey = evento.getTipoEvento().toLowerCase();
                }

                rabbitTemplate.convertAndSend(exchange, routingKey, evento.getCarga());
                evento.marcarPublicado();
                outboxRepositorio.save(evento);
                log.info("Evento outbox publicado a RabbitMQ: id={}, tipo={}, exchange={}",
                        evento.getId(), evento.getTipoEvento(), exchange);
            } catch (Exception e) {
                log.warn("No se pudo publicar evento outbox id={} a RabbitMQ (se reintentará en el siguiente ciclo): {}",
                        evento.getId(), e.getMessage());
                break; // No continuar con la secuencia si el broker no responde
            }
        }
    }
}
