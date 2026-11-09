package adorbit.campanas.infraestructura;

import adorbit.campanas.dominio.modelo.BandejaSalidaEvento;
import adorbit.campanas.dominio.repositorio.BandejaSalidaRepositorio;
import adorbit.campanas.infraestructura.mensajeria.ConfiguracionRabbitMQ;
import adorbit.campanas.infraestructura.mensajeria.PublicadorOutbox;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.amqp.rabbit.connection.CorrelationData;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import java.util.List;
import java.util.UUID;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class PublicadorOutboxTest {
    private BandejaSalidaRepositorio repositorio;
    private RabbitTemplate rabbit;
    private PublicadorOutbox publicador;

    @BeforeEach
    void preparar() {
        repositorio = mock(BandejaSalidaRepositorio.class);
        rabbit = mock(RabbitTemplate.class);
        doAnswer(invocacion -> {
            CorrelationData correlacion = invocacion.getArgument(3);
            correlacion.getFuture().complete(new CorrelationData.Confirm(true, null));
            return null;
        }).when(rabbit).convertAndSend(anyString(), anyString(), any(Object.class), any(CorrelationData.class));
        publicador = new PublicadorOutbox(repositorio, rabbit);
    }

    private void comprobarRuta(String agregado, String tipo, String exchange, String ruta) {
        BandejaSalidaEvento evento = mock(BandejaSalidaEvento.class);
        UUID id = UUID.randomUUID();
        when(evento.getId()).thenReturn(id);
        when(evento.getAgregadoId()).thenReturn(UUID.randomUUID());
        when(evento.getTipoAgregado()).thenReturn(agregado);
        when(evento.getTipoEvento()).thenReturn(tipo);
        when(evento.getCarga()).thenReturn("{}");
        when(repositorio.findEventosPendientes()).thenReturn(List.of(evento));
        publicador.procesarEventosPendientes();
        var captor = org.mockito.ArgumentCaptor.forClass(CorrelationData.class);
        verify(rabbit).convertAndSend(eq(exchange), eq(ruta), eq("{}"), captor.capture());
        assertEquals(id.toString(), captor.getValue().getId());
        verify(evento).marcarPublicado();
        verify(repositorio).save(evento);
    }

    @Test void debePublicarBloquearPiezasACreatividades() {
        comprobarRuta("SagaComando", "BloquearPiezas", ConfiguracionRabbitMQ.EXCHANGE_SAGA, "saga.creatividades");
    }
    @Test void debePublicarReservarCreditoACrm() {
        comprobarRuta("SagaComando", "ReservarCredito", ConfiguracionRabbitMQ.EXCHANGE_SAGA, "saga.crm");
    }
    @Test void debePublicarEmitirFacturaAFacturacion() {
        comprobarRuta("SagaComando", "EmitirFactura", ConfiguracionRabbitMQ.EXCHANGE_SAGA, "saga.facturacion");
    }
    @Test void debePublicarEventoDominioAExchangeEventos() {
        comprobarRuta("Campana", "CampanaCreada", ConfiguracionRabbitMQ.EXCHANGE_EVENTOS, "campana.creada");
    }
}
