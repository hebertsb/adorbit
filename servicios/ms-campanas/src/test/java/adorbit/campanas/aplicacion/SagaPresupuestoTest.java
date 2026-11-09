package adorbit.campanas.aplicacion;

import adorbit.campanas.aplicacion.servicios.SagaOrquestadorServicio;
import adorbit.campanas.dominio.modelo.*;
import adorbit.campanas.dominio.repositorio.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import java.math.BigDecimal;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class SagaPresupuestoTest {
    private final SagaTransaccionRepositorio sagas = mock(SagaTransaccionRepositorio.class);
    private final SagaPasoRepositorio pasos = mock(SagaPasoRepositorio.class);
    private final CampanaRepositorio campanas = mock(CampanaRepositorio.class);
    private final PresupuestoRepositorio presupuestos = mock(PresupuestoRepositorio.class);
    private final BandejaSalidaRepositorio bandeja = mock(BandejaSalidaRepositorio.class);
    private final ObjectMapper json = new ObjectMapper();
    private final SagaOrquestadorServicio servicio = new SagaOrquestadorServicio(sagas, pasos, campanas, presupuestos, bandeja, json, BigDecimal.ZERO);
    private final UUID campanaId = UUID.randomUUID();
    private final UUID presupuestoId = UUID.randomUUID();
    private final UUID sagaId = UUID.randomUUID();
    private final Campana campana = mock(Campana.class);
    private final Presupuesto original = mock(Presupuesto.class);
    private final Presupuesto nuevo = mock(Presupuesto.class);

    private SagaTransaccion preparar(EstadoSaga estado) {
        SagaTransaccion saga = new SagaTransaccion(campanaId, "clave", "{\"presupuesto_id\":\"" + presupuestoId + "\",\"monto\":\"100.00\",\"moneda\":\"USD\"}");
        saga.setId(sagaId);
        saga.setEstado(estado);
        when(sagas.buscarParaTransicion(sagaId)).thenReturn(Optional.of(saga));
        when(campanas.findById(campanaId)).thenReturn(Optional.of(campana));
        when(campana.getId()).thenReturn(campanaId);
        when(campana.getClienteId()).thenReturn(UUID.randomUUID());
        when(presupuestos.findById(presupuestoId)).thenReturn(Optional.of(original));
        when(original.getCampanaId()).thenReturn(campanaId);
        when(presupuestos.findFirstByCampanaIdOrderByCreadoEnDesc(campanaId)).thenReturn(Optional.of(nuevo));
        return saga;
    }

    @Test
    void facturaUsaMontoYMonedaOriginalesAunqueExistaPresupuestoNuevo() throws Exception {
        preparar(EstadoSaga.bloqueando_piezas);
        SagaPaso paso = new SagaPaso(sagaId, 3, TipoPasoSaga.accion, "creatividades", "bloquear", "clave");
        when(pasos.findBySagaIdAndOrdenAndTipo(sagaId, 3, TipoPasoSaga.accion)).thenReturn(Optional.of(paso));
        servicio.procesarRespuestaPiezas(sagaId, true, null, Map.of());
        ArgumentCaptor<BandejaSalidaEvento> captor = ArgumentCaptor.forClass(BandejaSalidaEvento.class);
        verify(bandeja).save(captor.capture());
        var carga = json.readTree(captor.getValue().getCarga()).path("carga");
        assertEquals("100.00", carga.path("total").asText());
        assertEquals("USD", carga.path("moneda").asText());
        verifyNoInteractions(nuevo);
    }

    @Test
    void facturaExitosaConsumeSoloPresupuestoOriginal() {
        preparar(EstadoSaga.facturando);
        SagaPaso paso = new SagaPaso(sagaId, 4, TipoPasoSaga.accion, "facturacion", "facturar", "clave");
        when(pasos.findBySagaIdAndOrdenAndTipo(sagaId, 4, TipoPasoSaga.accion)).thenReturn(Optional.of(paso));
        servicio.procesarRespuestaFactura(sagaId, true, null, Map.of("factura_id", UUID.randomUUID().toString()));
        verify(original).setEstado(EstadoPresupuesto.consumido);
        verifyNoInteractions(nuevo);
    }

    @Test
    void compensacionLiberaSoloPresupuestoOriginal() {
        SagaTransaccion saga = preparar(EstadoSaga.reservando_credito);
        when(original.getEstado()).thenReturn(EstadoPresupuesto.reservado);
        servicio.ejecutarCompensacion(saga, "fallo");
        verify(original).setEstado(EstadoPresupuesto.borrador);
        verifyNoInteractions(nuevo);
    }

    @Test
    void presupuestoOriginalEliminadoImpideCompensacion() {
        SagaTransaccion saga = preparar(EstadoSaga.reservando_credito);
        when(presupuestos.findById(presupuestoId)).thenReturn(Optional.empty());
        assertThrows(IllegalStateException.class, () -> servicio.ejecutarCompensacion(saga, "fallo"));
        verifyNoInteractions(nuevo);
        verify(bandeja, never()).save(any());
    }
}
