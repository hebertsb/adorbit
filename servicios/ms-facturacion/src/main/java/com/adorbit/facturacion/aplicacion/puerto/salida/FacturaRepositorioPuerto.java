package com.adorbit.facturacion.aplicacion.puerto.salida;

import com.adorbit.facturacion.dominio.Factura;
import java.util.Optional;
import java.util.UUID;

/** Puerto de salida: persistencia de facturas. */
public interface FacturaRepositorioPuerto {

    /**
     * Guarda en UNA sola transaccion: la factura, su clave de idempotencia y el evento de la bandeja de salida.
     *
     * @throws ClaveIdempotenciaDuplicadaException si la clave ya existia
     */
    void guardarEmision(Factura factura, RegistroIdempotencia idempotencia, EventoSalida evento);

    Optional<Factura> buscarPorId(UUID id);
}
