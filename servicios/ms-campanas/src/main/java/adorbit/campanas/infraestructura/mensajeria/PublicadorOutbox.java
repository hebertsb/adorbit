package adorbit.campanas.infraestructura.mensajeria;

import adorbit.campanas.dominio.modelo.BandejaSalidaEvento;
import adorbit.campanas.dominio.repositorio.BandejaSalidaRepositorio;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.amqp.rabbit.connection.CorrelationData;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

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
        this.rabbitTemplate.setMandatory(true);
    }

    @Scheduled(fixedDelay = 2000)
    @Transactional
    public void procesarEventosPendientes() {
        List<BandejaSalidaEvento> pendientes = outboxRepositorio.findEventosPendientes();
        if (pendientes.isEmpty()) {
            return;
        }

        Set<UUID> agregadosBloqueados = new HashSet<>();
        for (BandejaSalidaEvento evento : pendientes) {
            if (agregadosBloqueados.contains(evento.getAgregadoId())) {
                continue;
            }
            try {
                String exchange;
                String routingKey;

                if ("SagaComando".equals(evento.getTipoAgregado())) {
                    exchange = ConfiguracionRabbitMQ.EXCHANGE_SAGA;
                    routingKey = switch (evento.getTipoEvento()) {
                        case "ReservarCredito", "LiberarCredito" -> "saga.crm";
                        case "BloquearPiezas", "DesbloquearPiezas" -> "saga.creatividades";
                        case "EmitirFactura", "EmitirNotaCredito" -> "saga.facturacion";
                        default -> throw new IllegalStateException("Comando SAGA sin destino mapeado: " + evento.getTipoEvento());
                    };
                } else {
                    exchange = ConfiguracionRabbitMQ.EXCHANGE_EVENTOS;
                    routingKey = switch (evento.getTipoEvento()) {
                        case "CampanaCreada" -> "campana.creada";
                        case "CampanaActualizada" -> "campana.actualizada";
                        case "CampanaContratada" -> "campana.contratada";
                        case "CampanaRechazada" -> "campana.rechazada";
                        default -> throw new IllegalStateException("Evento sin ruta mapeada: " + evento.getTipoEvento());
                    };
                }

                CorrelationData correlacion = new CorrelationData(evento.getId().toString());
                rabbitTemplate.convertAndSend(exchange, routingKey, evento.getCarga(), correlacion);
                CorrelationData.Confirm confirmacion = correlacion.getFuture().get(10, TimeUnit.SECONDS);
                if (!confirmacion.isAck() || correlacion.getReturned() != null) {
                    throw new IllegalStateException("Publicacion rechazada o sin ruta para " + evento.getTipoEvento());
                }
                evento.marcarPublicado();
                outboxRepositorio.save(evento);
                log.info("Evento outbox publicado a RabbitMQ: id={}, tipo={}, exchange={}, routingKey={}",
                        evento.getId(), evento.getTipoEvento(), exchange, routingKey);
            } catch (Exception e) {
                log.warn("No se pudo publicar evento outbox id={} a RabbitMQ (se reintentará en el siguiente ciclo): {}",
                        evento.getId(), e.getMessage());
                agregadosBloqueados.add(evento.getAgregadoId());
            }
        }
    }
}
