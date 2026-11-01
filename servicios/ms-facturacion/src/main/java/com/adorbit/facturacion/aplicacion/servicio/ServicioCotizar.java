package com.adorbit.facturacion.aplicacion.servicio;

import com.adorbit.facturacion.aplicacion.puerto.entrada.CotizarCasoDeUso;
import com.adorbit.facturacion.dominio.ItemFactura;
import com.adorbit.facturacion.dominio.Moneda;
import com.adorbit.facturacion.dominio.Totales;
import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;
import java.util.function.Supplier;

public class ServicioCotizar implements CotizarCasoDeUso {

    private final BigDecimal tasaImpuesto;
    private final Supplier<UUID> generadorId;

    public ServicioCotizar(BigDecimal tasaImpuesto, Supplier<UUID> generadorId) {
        this.tasaImpuesto = tasaImpuesto;
        this.generadorId = generadorId;
    }

    @Override
    public Cotizacion cotizar(UUID clienteId, Moneda moneda, List<ItemFactura> items) {
        return new Cotizacion(
                generadorId.get(),
                clienteId,
                moneda,
                List.copyOf(items),
                Totales.calcular(items, moneda, tasaImpuesto));
    }
}
