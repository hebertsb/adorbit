package com.adorbit.facturacion.aplicacion.puerto.entrada;

/** Caso de uso de entrada: consultar si el servicio esta vivo y listo para atender. */
public interface ConsultarEstadoCasoDeUso {

    /** El proceso esta vivo. No depende de ninguna dependencia externa. */
    boolean estaVivo();

    /** El servicio puede atender trafico: sus dependencias (almacenamiento) responden. */
    boolean estaListo();
}
