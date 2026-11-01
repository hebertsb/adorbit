package com.adorbit.facturacion.aplicacion.servicio;

import com.adorbit.facturacion.aplicacion.puerto.entrada.PublicarEventoCasoDeUso;
import com.adorbit.facturacion.aplicacion.puerto.salida.EventoPublicable;
import com.adorbit.facturacion.aplicacion.puerto.salida.PublicadorEventosPuerto;

public class ServicioPublicarEvento implements PublicarEventoCasoDeUso {

    private final PublicadorEventosPuerto publicador;

    public ServicioPublicarEvento(PublicadorEventosPuerto publicador) {
        this.publicador = publicador;
    }

    @Override
    public void publicar(EventoPublicable evento) {
        publicador.publicar(evento);
    }
}
