package adorbit.campanas.infraestructura;

import adorbit.campanas.aplicacion.servicios.SagaOrquestadorServicio;
import adorbit.campanas.dominio.modelo.BandejaSalidaEvento;
import adorbit.campanas.dominio.repositorio.BandejaSalidaRepositorio;
import adorbit.campanas.infraestructura.mensajeria.ConsumidorRespuestasSaga;
import adorbit.campanas.infraestructura.mensajeria.PublicadorOutbox;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.amqp.AmqpRejectAndDontRequeueException;
import org.springframework.amqp.rabbit.connection.CorrelationData;
import org.springframework.amqp.rabbit.core.RabbitTemplate;

import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class MensajeriaSagaTest {
    @Test
    void respuestaSinIdentificadorSeRechaza() {
        var consumidor = new ConsumidorRespuestasSaga(mock(SagaOrquestadorServicio.class), new ObjectMapper());
        assertThrows(AmqpRejectAndDontRequeueException.class,
                () -> consumidor.procesarMensaje("{\"tipo_evento\":\"FacturaEmitida\",\"carga\":{}}"));
    }

    @Test
    void eventoSinRutaNoBloqueaComandoPosterior() {
        var repositorio = mock(BandejaSalidaRepositorio.class);
        var rabbit = mock(RabbitTemplate.class);
        var evento = mock(BandejaSalidaEvento.class);
        var comando = mock(BandejaSalidaEvento.class);
        when(evento.getId()).thenReturn(UUID.randomUUID());
        when(evento.getAgregadoId()).thenReturn(UUID.randomUUID());
        when(comando.getAgregadoId()).thenReturn(UUID.randomUUID());
        when(evento.getTipoAgregado()).thenReturn("Campana");
        when(evento.getTipoEvento()).thenReturn("CampanaContratada");
        when(evento.getCarga()).thenReturn("{}");
        when(comando.getId()).thenReturn(UUID.randomUUID());
        when(comando.getTipoAgregado()).thenReturn("SagaComando");
        when(comando.getTipoEvento()).thenReturn("EmitirFactura");
        when(comando.getCarga()).thenReturn("{}");
        when(repositorio.findEventosPendientes()).thenReturn(List.of(evento, comando));
        doAnswer(invocacion -> {
            CorrelationData correlacion = invocacion.getArgument(3);
            if ("campana.contratada".equals(invocacion.getArgument(1))) {
                correlacion.getFuture().complete(new CorrelationData.Confirm(false, "sin ruta"));
            } else {
                correlacion.getFuture().complete(new CorrelationData.Confirm(true, null));
            }
            return null;
        }).when(rabbit).convertAndSend(anyString(), anyString(), any(Object.class), any(CorrelationData.class));
        new PublicadorOutbox(repositorio, rabbit).procesarEventosPendientes();
        verify(rabbit).convertAndSend(eq("adorbit.eventos"), eq("campana.contratada"), any(Object.class), any(CorrelationData.class));
        verify(evento, never()).marcarPublicado();
        verify(comando).marcarPublicado();
        verify(repositorio).save(comando);
    }

    @Test
    void falloBloqueaSoloFilasPosterioresDelMismoAgregado() {
        var repositorio = mock(BandejaSalidaRepositorio.class);
        var rabbit = mock(RabbitTemplate.class);
        var accion = mock(BandejaSalidaEvento.class);
        var compensacion = mock(BandejaSalidaEvento.class);
        var otraSaga = mock(BandejaSalidaEvento.class);
        UUID sagaId = UUID.randomUUID();
        for (var evento : List.of(accion, compensacion, otraSaga)) {
            when(evento.getId()).thenReturn(UUID.randomUUID());
            when(evento.getTipoAgregado()).thenReturn("SagaComando");
            when(evento.getCarga()).thenReturn("{}");
        }
        when(accion.getAgregadoId()).thenReturn(sagaId);
        when(compensacion.getAgregadoId()).thenReturn(sagaId);
        when(otraSaga.getAgregadoId()).thenReturn(UUID.randomUUID());
        when(accion.getTipoEvento()).thenReturn("ReservarCredito");
        when(compensacion.getTipoEvento()).thenReturn("LiberarCredito");
        when(otraSaga.getTipoEvento()).thenReturn("EmitirFactura");
        when(repositorio.findEventosPendientes()).thenReturn(List.of(accion, compensacion, otraSaga));
        doAnswer(invocacion -> {
            CorrelationData correlacion = invocacion.getArgument(3);
            correlacion.getFuture().complete(new CorrelationData.Confirm(
                    !correlacion.getId().equals(accion.getId().toString()), null));
            return null;
        }).when(rabbit).convertAndSend(anyString(), anyString(), any(Object.class), any(CorrelationData.class));
        new PublicadorOutbox(repositorio, rabbit).procesarEventosPendientes();
        verify(compensacion, never()).marcarPublicado();
        verify(otraSaga).marcarPublicado();
        verify(rabbit, times(2)).convertAndSend(anyString(), anyString(), any(Object.class), any(CorrelationData.class));
    }

    @Test
    void confirmacionNegativaNoMarcaPublicado() {
        var repositorio = mock(BandejaSalidaRepositorio.class);
        var rabbit = mock(RabbitTemplate.class);
        var evento = new BandejaSalidaEvento("SagaComando", UUID.randomUUID(), "EmitirFactura", "{}");
        // La entidad genera su identificador al persistir; se simula la fila persistida.
        var persistido = mock(BandejaSalidaEvento.class);
        when(persistido.getId()).thenReturn(UUID.randomUUID());
        when(persistido.getTipoAgregado()).thenReturn("SagaComando");
        when(persistido.getTipoEvento()).thenReturn("EmitirFactura");
        when(persistido.getCarga()).thenReturn(evento.getCarga());
        when(repositorio.findEventosPendientes()).thenReturn(List.of(persistido));
        doAnswer(invocacion -> {
            CorrelationData correlacion = invocacion.getArgument(3);
            correlacion.getFuture().complete(new CorrelationData.Confirm(false, "rechazado"));
            return null;
        }).when(rabbit).convertAndSend(anyString(), anyString(), any(Object.class), any(CorrelationData.class));
        new PublicadorOutbox(repositorio, rabbit).procesarEventosPendientes();
        verify(persistido, never()).marcarPublicado();
        verify(repositorio, never()).save(any());
    }
}
