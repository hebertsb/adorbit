package com.adorbit.facturacion.aplicacion.servicio;

import com.adorbit.facturacion.aplicacion.puerto.entrada.ConsultarEstadoCasoDeUso;
import com.adorbit.facturacion.aplicacion.puerto.salida.VerificarAlmacenamientoPuerto;

/** Implementa la consulta de estado usando solo puertos, sin conocer DynamoDB. */
public class ServicioEstado implements ConsultarEstadoCasoDeUso {

    private final VerificarAlmacenamientoPuerto almacenamiento;

    public ServicioEstado(VerificarAlmacenamientoPuerto almacenamiento) {
        this.almacenamiento = almacenamiento;
    }

    @Override
    public boolean estaVivo() {
        return true;
    }

    @Override
    public boolean estaListo() {
        return almacenamiento.estaDisponible();
    }
}
