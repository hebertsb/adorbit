package com.adorbit.facturacion.aplicacion.puerto.entrada;

import com.adorbit.facturacion.aplicacion.puerto.salida.EventoPublicable;

/** Caso de uso de entrada: sacar un evento de la bandeja de salida hacia el bus. */
public interface PublicarEventoCasoDeUso {

    void publicar(EventoPublicable evento);
}
