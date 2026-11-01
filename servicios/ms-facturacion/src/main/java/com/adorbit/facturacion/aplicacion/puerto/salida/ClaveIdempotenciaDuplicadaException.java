package com.adorbit.facturacion.aplicacion.puerto.salida;

/** La clave de idempotencia ya existia al intentar guardar (carrera entre dos solicitudes iguales). */
public class ClaveIdempotenciaDuplicadaException extends RuntimeException {

    public ClaveIdempotenciaDuplicadaException(String clave) {
        super("La clave de idempotencia ya existe: " + clave);
    }
}
