package com.adorbit.facturacion.aplicacion.puerto.entrada;

import com.adorbit.facturacion.dominio.Cobro;
import com.adorbit.facturacion.dominio.Factura;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

/** Caso de uso de entrada: registrar un cobro sobre una factura, de forma idempotente. */
public interface RegistrarCobroCasoDeUso {

    ResultadoCobro registrar(ComandoRegistrarCobro comando);

    record ComandoRegistrarCobro(String clave, UUID facturaId, BigDecimal monto, LocalDate fecha, String referencia) {}

    /** {@code cobro} es el recien creado (o el original si {@code repetida}). */
    record ResultadoCobro(Factura factura, Cobro cobro, boolean repetida) {}
}
