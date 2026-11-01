package com.adorbit.facturacion.aplicacion.puerto.entrada;

import com.adorbit.facturacion.dominio.Factura;
import com.adorbit.facturacion.dominio.Moneda;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/** Caso de uso de entrada: emitir una factura de forma idempotente. */
public interface EmitirFacturaCasoDeUso {

    ResultadoEmision emitir(ComandoEmitirFactura comando);

    /**
     * @param clave Idempotency-Key (REST) o clave_comando (SAGA)
     * @param sagaId opcional; si viene, se propaga al evento y es la correlacion
     * @param totalEsperado opcional; si viene y difiere del calculado, se rechaza
     * @param fechaVencimiento opcional; por defecto hoy + dias configurados
     */
    record ComandoEmitirFactura(
            String clave,
            UUID sagaId,
            UUID clienteId,
            UUID campanaId,
            Moneda moneda,
            List<LineaComando> items,
            BigDecimal totalEsperado,
            LocalDate fechaVencimiento) {}

    record LineaComando(String descripcion, int cantidad, BigDecimal precioUnitario) {}

    /** {@code repetida} = la clave ya existia con la misma solicitud; se devolvio la respuesta original. */
    record ResultadoEmision(Factura factura, boolean repetida) {}
}
