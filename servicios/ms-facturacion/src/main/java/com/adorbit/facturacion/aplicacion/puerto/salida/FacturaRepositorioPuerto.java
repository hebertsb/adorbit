package com.adorbit.facturacion.aplicacion.puerto.salida;

import com.adorbit.facturacion.dominio.Cobro;
import com.adorbit.facturacion.dominio.EstadoFactura;
import com.adorbit.facturacion.dominio.Factura;
import com.adorbit.facturacion.dominio.NotaCredito;
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

    /**
     * Guarda en UNA transaccion: la nota de credito, la factura anulada (version + estado), la clave de
     * idempotencia y el evento.
     *
     * @throws ClaveIdempotenciaDuplicadaException si la clave ya existia
     * @throws ConflictoVersionException si la factura cambio antes
     */
    void guardarNotaCredito(Factura factura, NotaCredito nota, RegistroIdempotencia idempotencia, EventoSalida evento);

    /** Registra en UNA transaccion un fallo de negocio de un comando: su clave de idempotencia y el evento. */
    void guardarFallo(RegistroIdempotencia idempotencia, EventoSalida evento);
}
