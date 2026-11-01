package com.adorbit.facturacion.aplicacion.puerto.salida;

/** Puerto de salida: publica un evento ya serializado en el bus de mensajes. */
public interface PublicadorEventosPuerto {

    /**
     * Publica y espera la confirmacion del broker.
     *
     * @throws RuntimeException si no se pudo confirmar (el llamador reintenta: entrega al menos una vez)
     */
    void publicar(EventoPublicable evento);
}
