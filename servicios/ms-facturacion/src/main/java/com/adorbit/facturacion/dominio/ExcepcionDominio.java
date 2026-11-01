package com.adorbit.facturacion.dominio;

/** Violacion de una regla de negocio. {@code codigo} es estable y lo usa la capa REST para responder. */
public class ExcepcionDominio extends RuntimeException {

    private final String codigo;

    public ExcepcionDominio(String codigo, String mensaje) {
        super(mensaje);
        this.codigo = codigo;
    }

    public String codigo() {
        return codigo;
    }
}
