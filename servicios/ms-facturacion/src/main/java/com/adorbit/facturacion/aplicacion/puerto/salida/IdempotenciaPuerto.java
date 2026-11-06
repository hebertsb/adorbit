package com.adorbit.facturacion.aplicacion.puerto.salida;

import java.util.Optional;

/** Puerto de salida: consulta de claves de idempotencia ya registradas. */
public interface IdempotenciaPuerto {

    Optional<RegistroIdempotencia> buscar(String clave);
}
