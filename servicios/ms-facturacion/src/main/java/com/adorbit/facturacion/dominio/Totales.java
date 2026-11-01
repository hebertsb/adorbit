package com.adorbit.facturacion.dominio;

import java.math.BigDecimal;
import java.util.List;

/** Subtotal, impuestos y total calculados siempre en el servidor, nunca tomados del cliente. */
public record Totales(Dinero subtotal, Dinero impuestos, Dinero total) {

    public static final int MAXIMO_ITEMS = 200;

    public static Totales calcular(List<ItemFactura> items, Moneda moneda, BigDecimal tasaImpuesto) {
        if (items == null || items.isEmpty() || items.size() > MAXIMO_ITEMS) {
            throw new ExcepcionDominio("items_invalidos", "Debe haber entre 1 y " + MAXIMO_ITEMS + " items");
        }
        if (tasaImpuesto == null || tasaImpuesto.signum() < 0) {
            throw new ExcepcionDominio("impuesto_invalido", "La tasa de impuesto no puede ser negativa");
        }
        Dinero subtotal = Dinero.cero(moneda);
        for (ItemFactura item : items) {
            subtotal = subtotal.sumar(item.subtotal());
        }
        Dinero impuestos = subtotal.porTasa(tasaImpuesto);
        return new Totales(subtotal, impuestos, subtotal.sumar(impuestos));
    }
}
