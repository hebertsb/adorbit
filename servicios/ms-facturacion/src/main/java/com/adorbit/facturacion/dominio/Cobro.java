package com.adorbit.facturacion.dominio;

import java.time.LocalDate;
import java.util.UUID;

/** Pago aplicado a una factura. */
public record Cobro(UUID id, UUID facturaId, Dinero monto, LocalDate fecha, String referencia) {}
