package adorbit.campanas.aplicacion;

import adorbit.campanas.aplicacion.servicios.SagaOrquestadorServicio;
import adorbit.campanas.dominio.modelo.*;
import adorbit.campanas.dominio.repositorio.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import org.mockito.ArgumentCaptor;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class SagaTardiaTest {
    @Test
    void piezasTardiasGeneranDesbloqueoUnaSolaVez() throws Exception {
        comprobarExitoTardio(3, "DesbloquearPiezas", Map.of());
    }

    @Test
    void facturaTardiaGeneraNotaCreditoConFacturaOriginalUnaSolaVez() throws Exception {
        comprobarExitoTardio(4, "EmitirNotaCredito", Map.of("factura_id", UUID.randomUUID().toString()));
    }

    private void comprobarExitoTardio(int orden, String comando, Map<String, Object> detalle) throws Exception {
        SagaTransaccionRepositorio sagas = mock(SagaTransaccionRepositorio.class);
        SagaPasoRepositorio pasos = mock(SagaPasoRepositorio.class);
        CampanaRepositorio campanas = mock(CampanaRepositorio.class);
        BandejaSalidaRepositorio bandeja = mock(BandejaSalidaRepositorio.class);
        ObjectMapper json = new ObjectMapper();
        SagaOrquestadorServicio servicio = new SagaOrquestadorServicio(sagas, pasos, campanas,
                mock(PresupuestoRepositorio.class), bandeja, json, BigDecimal.ZERO);
        UUID id = UUID.randomUUID();
        SagaTransaccion saga = new SagaTransaccion(UUID.randomUUID(), "clave", null);
        saga.setId(id);
        saga.setEstado(EstadoSaga.compensando);
        SagaPaso accion = new SagaPaso(id, orden, TipoPasoSaga.accion, "participante", "accion", id + ":" + orden + ":accion");
        accion.setEstado(EstadoPasoSaga.enviado);
        when(sagas.buscarParaTransicion(id)).thenReturn(Optional.of(saga));
        List<SagaPaso> almacen = new ArrayList<>(List.of(accion));
        when(pasos.save(any(SagaPaso.class))).thenAnswer(invocacion -> {
            SagaPaso paso = invocacion.getArgument(0);
            if (!almacen.contains(paso)) almacen.add(paso);
            return paso;
        });
        when(pasos.findBySagaIdAndOrdenAndTipo(eq(id), anyInt(), any(TipoPasoSaga.class)))
                .thenAnswer(invocacion -> almacen.stream().filter(p -> p.getOrden().equals(invocacion.getArgument(1))
                        && p.getTipo() == invocacion.getArgument(2)).findFirst());
        when(pasos.findBySagaIdOrderByOrdenAsc(id)).thenAnswer(invocacion -> new ArrayList<>(almacen));

        if (orden == 3) {
            servicio.procesarRespuestaPiezas(id, true, null, detalle);
            servicio.procesarRespuestaPiezas(id, true, null, detalle);
        } else {
            servicio.procesarRespuestaFactura(id, true, null, detalle);
            servicio.procesarRespuestaFactura(id, true, null, detalle);
        }

        assertEquals(EstadoPasoSaga.exitoso, accion.getEstado());
        assertEquals(EstadoSaga.compensando, saga.getEstado());
        SagaPaso compensacion = almacen.stream().filter(p -> p.getTipo() == TipoPasoSaga.compensacion).findFirst().orElseThrow();
        assertEquals(EstadoPasoSaga.enviado, compensacion.getEstado());
        servicio.procesarConfirmacionCompensacion(id, orden);
        assertEquals(EstadoPasoSaga.exitoso, compensacion.getEstado());
        assertEquals(EstadoSaga.compensada, saga.getEstado());
        ArgumentCaptor<BandejaSalidaEvento> evento = ArgumentCaptor.forClass(BandejaSalidaEvento.class);
        verify(bandeja, times(1)).save(evento.capture());
        assertEquals(comando, evento.getValue().getTipoEvento());
        var carga = json.readTree(evento.getValue().getCarga()).path("carga");
        assertEquals(id + ":" + orden + ":compensacion", carga.path("clave_comando").asText());
        if (orden == 4) assertEquals(detalle.get("factura_id"), carga.path("factura_id").asText());
        verify(campanas, never()).save(any());
    }

    @Test
    void rechazoTardioMarcaFalloSinCompensarAccionYFinaliza() {
        SagaTransaccionRepositorio sagas = mock(SagaTransaccionRepositorio.class);
        SagaPasoRepositorio pasos = mock(SagaPasoRepositorio.class);
        BandejaSalidaRepositorio bandeja = mock(BandejaSalidaRepositorio.class);
        SagaOrquestadorServicio servicio = new SagaOrquestadorServicio(sagas, pasos, mock(CampanaRepositorio.class),
                mock(PresupuestoRepositorio.class), bandeja, new ObjectMapper(), BigDecimal.ZERO);
        UUID id = UUID.randomUUID();
        SagaTransaccion saga = new SagaTransaccion(UUID.randomUUID(), "clave", null);
        saga.setId(id);
        saga.setEstado(EstadoSaga.compensando);
        SagaPaso accion = new SagaPaso(id, 3, TipoPasoSaga.accion, "creatividades", "bloquear", id + ":3:accion");
        accion.setEstado(EstadoPasoSaga.enviado);
        when(sagas.buscarParaTransicion(id)).thenReturn(Optional.of(saga));
        when(pasos.findBySagaIdAndOrdenAndTipo(id, 3, TipoPasoSaga.accion)).thenReturn(Optional.of(accion));
        when(pasos.findBySagaIdOrderByOrdenAsc(id)).thenReturn(List.of(accion));

        servicio.procesarRespuestaPiezas(id, false, "rechazado", Map.of());
        servicio.procesarRespuestaPiezas(id, false, "rechazado", Map.of());

        assertEquals(EstadoPasoSaga.fallido, accion.getEstado());
        assertTrue(accion.getDetalle().contains("rechazado"));
        assertEquals(EstadoSaga.rechazada, saga.getEstado());
        verify(bandeja, never()).save(any());
    }

    @Test
    void tiempoLimiteMantieneCompensacionMientrasAccionEstaPendiente() {
        SagaTransaccionRepositorio sagas = mock(SagaTransaccionRepositorio.class);
        SagaPasoRepositorio pasos = mock(SagaPasoRepositorio.class);
        BandejaSalidaRepositorio bandeja = mock(BandejaSalidaRepositorio.class);
        SagaOrquestadorServicio servicio = new SagaOrquestadorServicio(sagas, pasos, mock(CampanaRepositorio.class),
                mock(PresupuestoRepositorio.class), bandeja, new ObjectMapper(), BigDecimal.ZERO);
        UUID id = UUID.randomUUID();
        SagaTransaccion saga = new SagaTransaccion(UUID.randomUUID(), "clave", null);
        saga.setId(id);
        saga.setEstado(EstadoSaga.bloqueando_piezas);
        saga.setLimiteEn(OffsetDateTime.now().minusMinutes(1));
        SagaPaso accion = new SagaPaso(id, 3, TipoPasoSaga.accion, "creatividades", "bloquear", id + ":3:accion");
        accion.setEstado(EstadoPasoSaga.enviado);
        when(sagas.findSagasVencidas(any())).thenReturn(List.of(saga));
        when(pasos.findBySagaIdAndOrdenAndTipo(id, 3, TipoPasoSaga.accion)).thenReturn(Optional.of(accion));
        when(pasos.findBySagaIdOrderByOrdenAsc(id)).thenReturn(List.of(accion));

        assertThrows(IllegalStateException.class, servicio::procesarTimeouts);
        verify(bandeja, never()).save(any());
    }

    @Test
    void confirmacionNoFinalizaMientrasOtraAccionSigueEnviada() {
        SagaTransaccionRepositorio sagas = mock(SagaTransaccionRepositorio.class);
        SagaPasoRepositorio pasos = mock(SagaPasoRepositorio.class);
        SagaOrquestadorServicio servicio = new SagaOrquestadorServicio(sagas, pasos, mock(CampanaRepositorio.class),
                mock(PresupuestoRepositorio.class), mock(BandejaSalidaRepositorio.class), new ObjectMapper(), BigDecimal.ZERO);
        UUID id = UUID.randomUUID();
        SagaTransaccion saga = new SagaTransaccion(UUID.randomUUID(), "clave", null);
        saga.setId(id);
        saga.setEstado(EstadoSaga.compensando);
        SagaPaso compensacion = new SagaPaso(id, 2, TipoPasoSaga.compensacion, "crm", "liberar", id + ":2:compensacion");
        compensacion.setEstado(EstadoPasoSaga.enviado);
        SagaPaso pendiente = new SagaPaso(id, 3, TipoPasoSaga.accion, "creatividades", "bloquear", id + ":3:accion");
        pendiente.setEstado(EstadoPasoSaga.enviado);
        when(sagas.buscarParaTransicion(id)).thenReturn(Optional.of(saga));
        when(pasos.findBySagaIdAndOrdenAndTipo(id, 2, TipoPasoSaga.compensacion)).thenReturn(Optional.of(compensacion));
        when(pasos.findBySagaIdOrderByOrdenAsc(id)).thenReturn(List.of(compensacion, pendiente));

        servicio.procesarConfirmacionCompensacion(id, 2);

        assertEquals(EstadoPasoSaga.exitoso, compensacion.getEstado());
        assertEquals(EstadoPasoSaga.enviado, pendiente.getEstado());
        assertEquals(EstadoSaga.compensando, saga.getEstado());
    }

    @Test
    void exitoTardioDeSagaHistoricaCerradaDebeCompensarse() {
        SagaTransaccionRepositorio sagas = mock(SagaTransaccionRepositorio.class);
        SagaPasoRepositorio pasos = mock(SagaPasoRepositorio.class);
        BandejaSalidaRepositorio bandeja = mock(BandejaSalidaRepositorio.class);
        SagaOrquestadorServicio servicio = new SagaOrquestadorServicio(sagas, pasos, mock(CampanaRepositorio.class),
                mock(PresupuestoRepositorio.class), bandeja, new ObjectMapper(), BigDecimal.ZERO);
        UUID id = UUID.randomUUID();
        SagaTransaccion saga = new SagaTransaccion(UUID.randomUUID(), "clave", null);
        saga.setId(id);
        saga.setEstado(EstadoSaga.rechazada);
        SagaPaso accion = new SagaPaso(id, 3, TipoPasoSaga.accion, "creatividades", "bloquear", id + ":3:accion");
        accion.setEstado(EstadoPasoSaga.enviado);
        when(sagas.buscarParaTransicion(id)).thenReturn(Optional.of(saga));
        when(pasos.findBySagaIdAndOrdenAndTipo(id, 3, TipoPasoSaga.accion)).thenReturn(Optional.of(accion));
        when(pasos.findBySagaIdOrderByOrdenAsc(id)).thenReturn(List.of(accion));

        servicio.procesarRespuestaPiezas(id, true, null, Map.of());

        servicio.procesarRespuestaPiezas(id, true, null, Map.of());
        servicio.procesarConfirmacionCompensacion(id, 3);
        assertEquals(EstadoPasoSaga.exitoso, accion.getEstado(), "El exito tardio requiere compensacion aun si la saga historica esta cerrada");
        assertEquals(EstadoSaga.rechazada, saga.getEstado());
        verify(bandeja, times(1)).save(any());
        verify(sagas, never()).save(any());
    }

    @Test
    void rechazoTardioDeSagaCompensadaNoModificaCampanaNiPresupuesto() {
        SagaTransaccionRepositorio sagas = mock(SagaTransaccionRepositorio.class);
        SagaPasoRepositorio pasos = mock(SagaPasoRepositorio.class);
        CampanaRepositorio campanas = mock(CampanaRepositorio.class);
        PresupuestoRepositorio presupuestos = mock(PresupuestoRepositorio.class);
        BandejaSalidaRepositorio bandeja = mock(BandejaSalidaRepositorio.class);
        SagaOrquestadorServicio servicio = new SagaOrquestadorServicio(sagas, pasos, campanas, presupuestos, bandeja, new ObjectMapper(), BigDecimal.ZERO);
        UUID id = UUID.randomUUID();
        SagaTransaccion saga = new SagaTransaccion(UUID.randomUUID(), "clave", null);
        saga.setId(id);
        saga.setEstado(EstadoSaga.compensada);
        SagaPaso accion = new SagaPaso(id, 3, TipoPasoSaga.accion, "creatividades", "bloquear", id + ":3:accion");
        accion.setEstado(EstadoPasoSaga.enviado);
        when(sagas.buscarParaTransicion(id)).thenReturn(Optional.of(saga));
        when(pasos.findBySagaIdAndOrdenAndTipo(id, 3, TipoPasoSaga.accion)).thenReturn(Optional.of(accion));

        servicio.procesarRespuestaPiezas(id, false, "rechazado", Map.of());
        servicio.procesarRespuestaPiezas(id, false, "rechazado", Map.of());

        assertEquals(EstadoPasoSaga.fallido, accion.getEstado());
        assertEquals(EstadoSaga.compensada, saga.getEstado());
        verify(pasos, times(1)).save(accion);
        verify(bandeja, never()).save(any());
        verify(campanas, never()).save(any());
        verify(presupuestos, never()).save(any());
        verify(sagas, never()).save(any());
    }

    @Test
    void creditoTardioGeneraUnaCompensacionSinActivarCampana() {
        SagaTransaccionRepositorio sagas = mock(SagaTransaccionRepositorio.class);
        SagaPasoRepositorio pasos = mock(SagaPasoRepositorio.class);
        CampanaRepositorio campanas = mock(CampanaRepositorio.class);
        PresupuestoRepositorio presupuestos = mock(PresupuestoRepositorio.class);
        BandejaSalidaRepositorio bandeja = mock(BandejaSalidaRepositorio.class);
        SagaOrquestadorServicio servicio = new SagaOrquestadorServicio(sagas, pasos, campanas, presupuestos, bandeja, new ObjectMapper(), BigDecimal.ZERO);
        UUID id = UUID.randomUUID();
        UUID campanaId = UUID.randomUUID();
        UUID presupuestoId = UUID.randomUUID();
        SagaTransaccion saga = new SagaTransaccion(campanaId, "clave", "{\"presupuesto_id\":\"" + presupuestoId + "\",\"monto\":\"100.00\",\"moneda\":\"BOB\"}");
        Campana campana = mock(Campana.class);
        when(campana.getClienteId()).thenReturn(UUID.randomUUID());
        when(campanas.findById(campanaId)).thenReturn(Optional.of(campana));
        saga.setId(id);
        saga.setEstado(EstadoSaga.compensando);
        SagaPaso accion = new SagaPaso(id, 2, TipoPasoSaga.accion, "crm", "reservar", id + ":2:accion");
        accion.setEstado(EstadoPasoSaga.enviado);
        when(sagas.buscarParaTransicion(id)).thenReturn(Optional.of(saga));
        when(pasos.findBySagaIdAndOrdenAndTipo(id, 2, TipoPasoSaga.accion)).thenReturn(Optional.of(accion));
        when(pasos.findBySagaIdOrderByOrdenAsc(id)).thenReturn(List.of(accion));
        servicio.procesarRespuestaCredito(id, true, null, Map.of());
        servicio.procesarRespuestaCredito(id, true, null, Map.of());
        assertEquals(EstadoPasoSaga.exitoso, accion.getEstado());
        ArgumentCaptor<BandejaSalidaEvento> evento = ArgumentCaptor.forClass(BandejaSalidaEvento.class);
        verify(bandeja, times(1)).save(evento.capture());
        try {
            var carga = new ObjectMapper().readTree(evento.getValue().getCarga()).path("carga");
            assertEquals("100.00", carga.path("monto").asText());
            assertEquals("BOB", carga.path("moneda").asText());
        } catch (Exception e) { fail(e); }
        verify(presupuestos, never()).findFirstByCampanaIdOrderByCreadoEnDesc(any());
        verify(campanas, never()).save(any());
    }
}
