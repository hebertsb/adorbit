package com.adorbit.facturacion.aplicacion.puerto.salida;

import java.time.Instant;

/** Clave de idempotencia con la huella de la solicitud y la respuesta guardada. */
public record RegistroIdempotencia(String clave, String huellaSolicitud, String respuesta, Instant venceEn) {}
