package com.adorbit.facturacion.aplicacion.puerto.entrada;

import com.adorbit.facturacion.dominio.NotaCredito;
import java.util.Optional;
import java.util.UUID;

/** Caso de uso de entrada: anular una factura con una nota de credito (compensacion de la SAGA). */
public interface EmitirNotaCreditoCasoDeUso {

    /**
     * Idempotente por {@code clave}. Devuelve vacio si no habia nada que compensar (factura inexistente o ya
     * anulada) o si la clave ya se habia procesado.
     */
    Optional<NotaCredito> emitir(String clave, UUID sagaId, UUID facturaId, String motivo);
}
