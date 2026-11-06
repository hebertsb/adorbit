package com.adorbit.facturacion.aplicacion.puerto.entrada;

import java.time.LocalDate;

/** Caso de uso de entrada: marcar como vencidas las facturas abiertas cuyo vencimiento ya paso. */
public interface MarcarVencidasCasoDeUso {

    /** Idempotente por naturaleza: una factura ya vencida no se vuelve a tocar. */
    ResultadoVencimientos marcar(LocalDate hoy);

    record ResultadoVencimientos(int revisadas, int marcadasVencidas, int conflictos) {}
}
