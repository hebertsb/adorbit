package adorbit.campanas.infraestructura.mensajeria;

import org.springframework.amqp.core.*;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
@org.springframework.context.annotation.Profile("!test")
public class ConfiguracionRabbitMQ {

    public static final String EXCHANGE_EVENTOS = "adorbit.eventos";
    public static final String EXCHANGE_SAGA = "adorbit.saga";
    public static final String COLA_SAGA_CAMPANAS = "saga.campanas";

    @Bean
    public TopicExchange exchangeEventos() {
        return new TopicExchange(EXCHANGE_EVENTOS, true, false);
    }

    // direct: asi esta declarado en el broker compartido (plataforma/rabbitmq/definiciones.json);
    // las claves de comando son exactas, no hay comodines. RabbitMQ rechaza redeclarar un exchange
    // existente con otro tipo (406 PRECONDITION_FAILED) -- mismo fix que aplico Luis en ms-facturacion.
    @Bean
    public DirectExchange exchangeSaga() {
        return new DirectExchange(EXCHANGE_SAGA, true, false);
    }

    @Bean
    public Queue colaSagaCampanas() {
        return QueueBuilder.durable(COLA_SAGA_CAMPANAS).build();
    }

    @Bean
    public Binding bindingSagaCampanas(Queue colaSagaCampanas, DirectExchange exchangeSaga) {
        return BindingBuilder.bind(colaSagaCampanas).to(exchangeSaga).with(COLA_SAGA_CAMPANAS);
    }
}
