package com.adorbit.facturacion.aplicacion.servicio;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.adorbit.facturacion.aplicacion.puerto.entrada.EmitirFacturaCasoDeUso.ComandoEmitirFactura;
import com.adorbit.facturacion.aplicacion.puerto.entrada.EmitirFacturaCasoDeUso.LineaComando;
import com.adorbit.facturacion.aplicacion.puerto.salida.ClaveIdempotenciaDuplicadaException;
import com.adorbit.facturacion.aplicacion.puerto.salida.EventoSalida;
import com.adorbit.facturacion.aplicacion.puerto.salida.FacturaRepositorioPuerto;
import com.adorbit.facturacion.aplicacion.puerto.salida.IdempotenciaPuerto;
import com.adorbit.facturacion.aplicacion.puerto.salida.RegistroIdempotencia;
import com.adorbit.facturacion.dominio.ExcepcionDominio;
import com.adorbit.facturacion.dominio.Factura;
import com.adorbit.facturacion.dominio.Moneda;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class ServicioEmitirFacturaTest {

    /** Doble en memoria de ambos puertos de salida. */
    static class Memoria implements FacturaRepositorioPuerto, IdempotenciaPuerto {
        final Map<UUID, Factura> facturas = new HashMap<>();
        final Map<String, RegistroIdempotencia> claves = new HashMap<>();
        final List<EventoSalida> eventos = new ArrayList<>();

        @Override
        public void guardarEmision(Factura f, RegistroIdempotencia r, EventoSalida e) {
            if (claves.containsKey(r.clave())) {
                throw new ClaveIdempotenciaDuplicadaException(r.clave());
            }
            facturas.put(f.id(), f);
            claves.put(r.clave(), r);
            eventos.add(e);
        }

        @Override
        public Optional<Factura> buscarPorId(UUID id) {
            return Optional.ofNullable(facturas.get(id));
        }

        @Override
        public Optional<RegistroIdempotencia> buscar(String clave) {
            return Optional.ofNullable(claves.get(clave));
        }
    }

    private Memoria memoria;
    private ServicioEmitirFactura servicio;

    @BeforeEach
    void preparar() {
        memoria = new Memoria();
        servicio = new ServicioEmitirFactura(
                memoria,
                memoria,
                Clock.fixed(Instant.parse("2026-11-05T14:00:00Z"), ZoneOffset.UTC),
                UUID::randomUUID,
                new BigDecimal("0.13"),
                30);
    }

    private ComandoEmitirFactura comando(String clave, String precio) {
        return new ComandoEmitirFactura(
                clave,
                UUID.fromString("11111111-1111-1111-1111-111111111111"),
                UUID.fromString("22222222-2222-2222-2222-222222222222"),
                UUID.fromString("33333333-3333-3333-3333-333333333333"),
                Moneda.BOB,
                List.of(new LineaComando("Spot de radio", 2, new BigDecimal(precio))),
                null,
                null);
    }

    @Test
    void casoFelizEmiteFacturaYEncolaEvento() {
        var resultado = servicio.emitir(comando("clave-0001", "1000.00"));

        assertThat(resultado.repetida()).isFalse();
        assertThat(resultado.factura().totales().total().monto()).isEqualByComparingTo("2260.00");
        assertThat(resultado.factura().fechaVencimiento().toString()).isEqualTo("2026-12-05");
        assertThat(memoria.eventos).hasSize(1);
        assertThat(memoria.eventos.get(0).tipoEvento()).isEqualTo("FacturaEmitida");
        assertThat(memoria.eventos.get(0).carga()).containsEntry("total", "2260.00");
    }

    @Test
    void repetirLaMismaSolicitudNoDuplicaFacturaNiEvento() {
        var primera = servicio.emitir(comando("clave-0001", "1000.00"));
        var segunda = servicio.emitir(comando("clave-0001", "1000.00"));

        assertThat(segunda.repetida()).isTrue();
        assertThat(segunda.factura().id()).isEqualTo(primera.factura().id());
        assertThat(memoria.facturas).hasSize(1);
        assertThat(memoria.eventos).hasSize(1);
    }

    @Test
    void mismaClaveConOtraSolicitudEsConflicto() {
        servicio.emitir(comando("clave-0001", "1000.00"));
        assertThatThrownBy(() -> servicio.emitir(comando("clave-0001", "999.00")))
                .isInstanceOf(ExcepcionDominio.class)
                .extracting("codigo")
                .isEqualTo("idempotencia_conflicto");
        assertThat(memoria.facturas).hasSize(1);
    }

    @Test
    void claveInvalidaSeRechaza() {
        assertThatThrownBy(() -> servicio.emitir(comando("corta", "1.00")))
                .extracting("codigo")
                .isEqualTo("clave_idempotencia_invalida");
    }

    @Test
    void totalEsperadoIncorrectoNoGuardaNada() {
        var c = comando("clave-0002", "1000.00");
        var malo = new ComandoEmitirFactura(
                c.clave(),
                c.sagaId(),
                c.clienteId(),
                c.campanaId(),
                c.moneda(),
                c.items(),
                new BigDecimal("1.00"),
                null);
        assertThatThrownBy(() -> servicio.emitir(malo)).extracting("codigo").isEqualTo("total_no_coincide");
        assertThat(memoria.facturas).isEmpty();
        assertThat(memoria.claves).isEmpty();
    }
}
