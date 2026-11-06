package com.adorbit.facturacion.aplicacion.puerto.salida;

/** Evento tal como esta en la bandeja de salida: el cuerpo ya es el sobre JSON completo. */
public record EventoPublicable(String idEvento, String tipoEvento, String cuerpoJson) {

    /**
     * Clave de enrutamiento: {@code tipo_evento} en minusculas separado por puntos
     * ({@code FacturaEmitida -> factura.emitida}).
     */
    public String claveEnrutamiento() {
        return tipoEvento.replaceAll("([a-z0-9])([A-Z])", "$1.$2").toLowerCase(java.util.Locale.ROOT);
    }
}
