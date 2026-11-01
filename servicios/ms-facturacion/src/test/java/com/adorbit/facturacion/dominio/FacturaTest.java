package com.adorbit.facturacion.dominio;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class FacturaTest {

    private static final BigDecimal IVA = new BigDecimal("0.13");
    private static final LocalDate HOY = LocalDate.of(2026, 11, 5);

    private static Dinero bob(String monto) {
        return Dinero.de(monto, Moneda.BOB);
    }

    private static Factura nueva(Dinero totalEsperado) {
        List<ItemFactura> items = List.of(
                new ItemFactura(1, "Spot de radio", 2, bob("1000.00")),
                new ItemFactura(2, "Banner web", 1, bob("500.50")));
        return Factura.emitir(
                UUID.randomUUID(),
                UUID.randomUUID(),
                UUID.randomUUID(),
                Moneda.BOB,
                items,
                IVA,
                totalEsperado,
                HOY,
                HOY.plusDays(30));
    }

    @Test
    void recalculaSubtotalImpuestosYTotal() {
        Factura f = nueva(null);
        assertThat(f.totales().subtotal().monto()).isEqualByComparingTo("2500.50");
        assertThat(f.totales().impuestos().monto()).isEqualByComparingTo("325.07");
        assertThat(f.totales().total().monto()).isEqualByComparingTo("2825.57");
        assertThat(f.saldo()).isEqualTo(f.totales().total());
        assertThat(f.estado()).isEqualTo(EstadoFactura.EMITIDA);
    }

    @Test
    void rechazaUnTotalEsperadoQueNoCoincide() {
        assertThatThrownBy(() -> nueva(bob("1.00")))
                .isInstanceOf(ExcepcionDominio.class)
                .extracting("codigo")
                .isEqualTo("total_no_coincide");
    }

    @Test
    void aceptaUnTotalEsperadoCorrecto() {
        assertThat(nueva(bob("2825.57")).estado()).isEqualTo(EstadoFactura.EMITIDA);
    }

    @Test
    void rechazaVencimientoAnteriorALaEmision() {
        assertThatThrownBy(() -> Factura.emitir(
                        UUID.randomUUID(),
                        UUID.randomUUID(),
                        UUID.randomUUID(),
                        Moneda.BOB,
                        List.of(new ItemFactura(1, "x", 1, bob("1"))),
                        IVA,
                        null,
                        HOY,
                        HOY.minusDays(1)))
                .isInstanceOf(ExcepcionDominio.class)
                .extracting("codigo")
                .isEqualTo("fecha_invalida");
    }

    @Test
    void cobroParcialYLuegoTotalCambiaElEstado() {
        Factura f = nueva(null);
        f.registrarCobro(UUID.randomUUID(), bob("1000.00"), HOY, "tr-1");
        assertThat(f.estado()).isEqualTo(EstadoFactura.PAGADA_PARCIAL);
        assertThat(f.saldo().monto()).isEqualByComparingTo("1825.57");

        f.registrarCobro(UUID.randomUUID(), bob("1825.57"), HOY, "tr-2");
        assertThat(f.estado()).isEqualTo(EstadoFactura.PAGADA);
        assertThat(f.saldo().esCero()).isTrue();
        assertThat(f.cobros()).hasSize(2);
    }

    @Test
    void unCobroNoPuedeSuperarElSaldo() {
        Factura f = nueva(null);
        assertThatThrownBy(() -> f.registrarCobro(UUID.randomUUID(), bob("9999.00"), HOY, null))
                .isInstanceOf(ExcepcionDominio.class)
                .extracting("codigo")
                .isEqualTo("cobro_excede_saldo");
        assertThat(f.cobros()).isEmpty();
    }

    @Test
    void notaDeCreditoAnulaLaFacturaYNoSePuedeCobrarDespues() {
        Factura f = nueva(null);
        NotaCredito nc = NotaCredito.emitirPara(f, UUID.randomUUID(), "SAGA compensada", HOY);
        assertThat(f.estado()).isEqualTo(EstadoFactura.ANULADA);
        assertThat(nc.total()).isEqualTo(f.totales().total());
        assertThatThrownBy(() -> f.registrarCobro(UUID.randomUUID(), bob("1.00"), HOY, null))
                .extracting("codigo")
                .isEqualTo("factura_anulada");
        assertThatThrownBy(f::anular).extracting("codigo").isEqualTo("factura_anulada");
    }

    @Test
    void seMarcaVencidaSoloSiPasoElVencimientoYHaySaldo() {
        Factura f = nueva(null);
        assertThat(f.marcarVencidaSiCorresponde(HOY.plusDays(30))).isFalse();
        assertThat(f.marcarVencidaSiCorresponde(HOY.plusDays(31))).isTrue();
        assertThat(f.estado()).isEqualTo(EstadoFactura.VENCIDA);
    }

    @Test
    void noSeMezclanMonedas() {
        assertThatThrownBy(() -> bob("1.00").sumar(Dinero.de("1.00", Moneda.USD)))
                .extracting("codigo")
                .isEqualTo("moneda_no_coincide");
    }

    @Test
    void dineroNoAceptaNegativos() {
        assertThatThrownBy(() -> bob("1.00").restar(bob("2.00")))
                .extracting("codigo")
                .isEqualTo("dinero_invalido");
    }

    @Test
    void rechazaItemsInvalidos() {
        assertThatThrownBy(() -> new ItemFactura(1, " ", 1, bob("1.00"))).isInstanceOf(ExcepcionDominio.class);
        assertThatThrownBy(() -> new ItemFactura(1, "ok", 0, bob("1.00"))).isInstanceOf(ExcepcionDominio.class);
        assertThatThrownBy(() -> Totales.calcular(List.of(), Moneda.BOB, IVA)).isInstanceOf(ExcepcionDominio.class);
    }
}
