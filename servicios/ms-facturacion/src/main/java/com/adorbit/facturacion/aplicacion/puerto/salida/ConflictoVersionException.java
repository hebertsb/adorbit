package com.adorbit.facturacion.aplicacion.puerto.salida;

/** La factura cambio entre la lectura y la escritura (control de concurrencia optimista). */
public class ConflictoVersionException extends RuntimeException {

    public ConflictoVersionException(String mensaje) {
        super(mensaje);
    }
}
