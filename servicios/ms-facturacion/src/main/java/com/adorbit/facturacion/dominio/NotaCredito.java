package com.adorbit.facturacion.dominio;

import java.time.LocalDate;
import java.util.UUID;

/** Documento que anula una factura (compensacion de la SAGA). Guarda el total que revierte. */
public record NotaCredito(UUID id, UUID facturaId, UUID clienteId, Dinero total, String motivo, LocalDate fecha) {

    /** Emite la nota de credito y anula la factura en una sola operacion de dominio. */
    public static NotaCredito emitirPara(Factura factura, UUID id, String motivo, LocalDate fecha) {
        factura.anular();
        return new NotaCredito(
                id, factura.id(), factura.clienteId(), factura.totales().total(), motivo, fecha);
    }
}
