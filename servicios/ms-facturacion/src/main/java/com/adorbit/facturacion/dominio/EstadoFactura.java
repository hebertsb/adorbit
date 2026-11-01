package com.adorbit.facturacion.dominio;

/** Estados posibles de una factura. Una factura emitida nunca se edita: se anula con nota de credito. */
public enum EstadoFactura {
    EMITIDA,
    PAGADA_PARCIAL,
    PAGADA,
    VENCIDA,
    ANULADA
}
