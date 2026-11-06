package adorbit.campanas.dominio.modelo;

public enum EstadoSaga {
    iniciada,
    reservando_presupuesto,
    reservando_credito,
    bloqueando_piezas,
    facturando,
    completada,
    compensando,
    compensada,
    rechazada,
    fallida
}

