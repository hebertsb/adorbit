package adorbit.campanas.infraestructura;

import adorbit.campanas.dominio.modelo.BandejaSalidaEvento;
import adorbit.campanas.dominio.repositorio.BandejaSalidaRepositorio;
import adorbit.campanas.infraestructura.mensajeria.ConfiguracionRabbitMQ;
import adorbit.campanas.infraestructura.mensajeria.PublicadorOutbox;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.amqp.rabbit.core.RabbitTemplate;

import java.util.Collections;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class PublicadorOutboxTest {

    private BandejaSalidaRepositorio outboxRepositorio;
    private RabbitTemplate rabbitTemplate;
    private PublicadorOutbox publicador;

    @BeforeEach
    void setUp() {
        outboxRepositorio = mock(BandejaSalidaRepositorio.class);
        rabbitTemplate = mock(RabbitTemplate.class);
        publicador = new PublicadorOutbox(outboxRepositorio, rabbitTemplate);
    }

    @Test
    @DisplayName("Debe publicar BloquearPiezas al exchange adorbit.saga con routingKey saga.creatividades")
    void debePublicarBloquearPiezasACreatividades() {
        BandejaSalidaEvento evento = new BandejaSalidaEvento(
                "SagaComando",
                UUID.randomUUID(),
                "BloquearPiezas",
                "{\"campana_id\":\"111\"}"
        );

        when(outboxRepositorio.findEventosPendientes()).thenReturn(Collections.singletonList(evento));

        publicador.procesarEventosPendientes();

        ArgumentCaptor<String> exchangeCaptor = ArgumentCaptor.forClass(String.class);
        ArgumentCaptor<String> routingKeyCaptor = ArgumentCaptor.forClass(String.class);

        verify(rabbitTemplate, times(1)).convertAndSend(
                exchangeCaptor.capture(),
                routingKeyCaptor.capture(),
                eq(evento.getCarga())
        );

        assertEquals(ConfiguracionRabbitMQ.EXCHANGE_SAGA, exchangeCaptor.getValue());
        assertEquals("saga.creatividades", routingKeyCaptor.getValue());
        assertNotNull(evento.getPublicadoEn());
        verify(outboxRepositorio, times(1)).save(evento);
    }

    @Test
    @DisplayName("Debe publicar ReservarCredito al exchange adorbit.saga con routingKey saga.crm")
    void debePublicarReservarCreditoACrm() {
        BandejaSalidaEvento evento = new BandejaSalidaEvento(
                "SagaComando",
                UUID.randomUUID(),
                "ReservarCredito",
                "{\"monto\":5000}"
        );

        when(outboxRepositorio.findEventosPendientes()).thenReturn(Collections.singletonList(evento));

        publicador.procesarEventosPendientes();

        verify(rabbitTemplate, times(1)).convertAndSend(
                eq(ConfiguracionRabbitMQ.EXCHANGE_SAGA),
                eq("saga.crm"),
                eq(evento.getCarga())
        );
    }

    @Test
    @DisplayName("Debe publicar EmitirFactura al exchange adorbit.saga con routingKey saga.facturacion")
    void debePublicarEmitirFacturaAFacturacion() {
        BandejaSalidaEvento evento = new BandejaSalidaEvento(
                "SagaComando",
                UUID.randomUUID(),
                "EmitirFactura",
                "{\"total\":10000}"
        );

        when(outboxRepositorio.findEventosPendientes()).thenReturn(Collections.singletonList(evento));

        publicador.procesarEventosPendientes();

        verify(rabbitTemplate, times(1)).convertAndSend(
                eq(ConfiguracionRabbitMQ.EXCHANGE_SAGA),
                eq("saga.facturacion"),
                eq(evento.getCarga())
        );
    }

    @Test
    @DisplayName("Debe publicar eventos de dominio a adorbit.eventos con routingKey en minusculas")
    void debePublicarEventoDominioAExchangeEventos() {
        BandejaSalidaEvento evento = new BandejaSalidaEvento(
                "Campana",
                UUID.randomUUID(),
                "CampanaCreada",
                "{\"nombre\":\"Demo\"}"
        );

        when(outboxRepositorio.findEventosPendientes()).thenReturn(Collections.singletonList(evento));

        publicador.procesarEventosPendientes();

        verify(rabbitTemplate, times(1)).convertAndSend(
                eq(ConfiguracionRabbitMQ.EXCHANGE_EVENTOS),
                eq("campanacreada"),
                eq(evento.getCarga())
        );
    }
}
