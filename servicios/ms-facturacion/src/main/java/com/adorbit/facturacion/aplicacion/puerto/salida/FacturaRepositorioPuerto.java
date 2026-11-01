package com.adorbit.facturacion.aplicacion.puerto.salida;

import com.adorbit.facturacion.dominio.Cobro;
import com.adorbit.facturacion.dominio.EstadoFactura;
import com.adorbit.facturacion.dominio.Factura;
import java.util.List;
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

    /**
     * Guarda en UNA transaccion: el cobro, la factura actualizada (saldo, estado, version), la clave de
     * idempotencia y los eventos. La version persistida debe ser {@code factura.version() - 1}.
     *
     * @throws ClaveIdempotenciaDuplicadaException si la clave ya existia
     * @throws ConflictoVersionException si otra operacion modifico la factura antes
     */
    void guardarCobro(Factura factura, Cobro cobro, RegistroIdempotencia idempotencia, List<EventoSalida> eventos);

    /** Facturas de un cliente (indice GSI1), con filtro opcional por estado. */
    Pagina<Factura> listarPorCliente(UUID clienteId, EstadoFactura estado, int page, int size);

    /** Facturas por estado (indice GSI2). */
    Pagina<Factura> listarPorEstado(EstadoFactura estado, int page, int size);
}
