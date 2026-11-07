package com.adorbit.facturacion.configuracion;

import com.adorbit.facturacion.adaptador.entrada.mensajeria.ConsumidorComandosSaga;
import com.adorbit.facturacion.adaptador.entrada.streams.RelevoBandejaSalida;
import com.adorbit.facturacion.adaptador.salida.rabbit.PublicadorEventosRabbit;
import com.adorbit.facturacion.aplicacion.puerto.entrada.EmitirFacturaCasoDeUso;
import com.adorbit.facturacion.aplicacion.puerto.entrada.EmitirNotaCreditoCasoDeUso;
import com.adorbit.facturacion.aplicacion.puerto.entrada.ProcesarComandoSagaCasoDeUso;
import com.adorbit.facturacion.aplicacion.puerto.entrada.PublicarEventoCasoDeUso;
import com.adorbit.facturacion.aplicacion.puerto.salida.FacturaRepositorioPuerto;
import com.adorbit.facturacion.aplicacion.puerto.salida.IdempotenciaPuerto;
import com.adorbit.facturacion.aplicacion.puerto.salida.PublicadorEventosPuerto;
import com.adorbit.facturacion.aplicacion.servicio.ServicioProcesarComandoSaga;
import com.adorbit.facturacion.aplicacion.servicio.ServicioPublicarEvento;
import java.net.URI;
import java.time.Clock;
import java.time.Duration;
import java.util.UUID;
import org.springframework.amqp.core.Binding;
import org.springframework.amqp.core.BindingBuilder;
import org.springframework.amqp.core.Declarables;
import org.springframework.amqp.core.DirectExchange;
import org.springframework.amqp.core.Queue;
import org.springframework.amqp.core.QueueBuilder;
import org.springframework.amqp.core.TopicExchange;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.dynamodb.DynamoDbClient;
import software.amazon.awssdk.services.dynamodb.streams.DynamoDbStreamsClient;
import software.amazon.awssdk.services.dynamodb.streams.DynamoDbStreamsClientBuilder;

/**
 * Mensajeria (RabbitMQ) y relevo de la bandeja de salida. Se desactiva con
 * {@code adorbit.facturacion.mensajeria.activa=false} (por ejemplo en pruebas sin broker).
 */
@Configuration
@ConditionalOnProperty(name = "adorbit.facturacion.mensajeria.activa", havingValue = "true", matchIfMissing = true)
public class MensajeriaConfiguracion {

    static final String EXCHANGE_SAGA = "adorbit.saga";
    static final String EXCHANGE_EVENTOS = "adorbit.eventos";
    static final String EXCHANGE_ERRORES = "adorbit.saga.dlx";

    /** Topologia propia de facturacion: exchanges, cola de comandos y cola de errores (DLQ). */
    @Bean
    Declarables topologiaFacturacion(@Value("${adorbit.facturacion.mensajeria.cola-comandos}") String colaComandos) {
        // direct: asi esta declarado en el broker compartido; las claves de comando son exactas (no hay comodines).
        DirectExchange saga = new DirectExchange(EXCHANGE_SAGA, true, false);
        TopicExchange eventos = new TopicExchange(EXCHANGE_EVENTOS, true, false);
        DirectExchange errores = new DirectExchange(EXCHANGE_ERRORES, true, false);
        Queue comandos = QueueBuilder.durable(colaComandos)
                .deadLetterExchange(EXCHANGE_ERRORES)
                .deadLetterRoutingKey(colaComandos)
                .build();
        Queue colaErrores = QueueBuilder.durable(colaComandos + ".dlq").build();
        Binding emitirFactura = BindingBuilder.bind(comandos).to(saga).with("emitir.factura");
        Binding emitirNota = BindingBuilder.bind(comandos).to(saga).with("emitir.nota.credito");
        Binding errorBinding = BindingBuilder.bind(colaErrores).to(errores).with(colaComandos);
        return new Declarables(saga, eventos, errores, comandos, colaErrores, emitirFactura, emitirNota, errorBinding);
    }

    @Bean
    DynamoDbStreamsClient clienteStreams(PropiedadesDynamoDb propiedades) {
        DynamoDbStreamsClientBuilder constructor =
                DynamoDbStreamsClient.builder().region(Region.of(propiedades.region()));
        if (propiedades.endpoint() != null && !propiedades.endpoint().isBlank()) {
            constructor.endpointOverride(URI.create(propiedades.endpoint()));
        }
        return constructor.build();
    }

    @Bean
    PublicadorEventosPuerto publicadorEventos(RabbitTemplate plantilla) {
        return new PublicadorEventosRabbit(plantilla);
    }

    @Bean
    PublicarEventoCasoDeUso publicarEvento(PublicadorEventosPuerto publicador) {
        return new ServicioPublicarEvento(publicador);
    }

    @Bean
    RelevoBandejaSalida relevoBandejaSalida(
            DynamoDbClient dynamo,
            DynamoDbStreamsClient streams,
            PropiedadesDynamoDb propiedades,
            PublicarEventoCasoDeUso publicar,
            @Value("${adorbit.facturacion.mensajeria.intervalo-relevo}") Duration intervalo) {
        return new RelevoBandejaSalida(dynamo, streams, propiedades.tabla(), publicar, intervalo);
    }

    @Bean
    ProcesarComandoSagaCasoDeUso procesarComandoSaga(
            EmitirFacturaCasoDeUso emitirFactura,
            EmitirNotaCreditoCasoDeUso emitirNotaCredito,
            FacturaRepositorioPuerto facturas,
            IdempotenciaPuerto idempotencia,
            Clock reloj) {
        return new ServicioProcesarComandoSaga(
                emitirFactura, emitirNotaCredito, facturas, idempotencia, reloj, UUID::randomUUID);
    }

    @Bean
    ConsumidorComandosSaga consumidorComandosSaga(ProcesarComandoSagaCasoDeUso procesar) {
        return new ConsumidorComandosSaga(procesar);
    }
}
