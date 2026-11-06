package com.adorbit.facturacion.aplicacion.servicio;

import com.adorbit.facturacion.aplicacion.puerto.entrada.MarcarVencidasCasoDeUso;
import com.adorbit.facturacion.aplicacion.puerto.salida.ConflictoVersionException;
import com.adorbit.facturacion.aplicacion.puerto.salida.FacturaRepositorioPuerto;
import com.adorbit.facturacion.dominio.EstadoFactura;
import com.adorbit.facturacion.dominio.Factura;
import java.time.LocalDate;
import java.util.List;

public class ServicioMarcarVencidas implements MarcarVencidasCasoDeUso {

    /** Tope por estado por corrida (el resto se procesa en la siguiente). */
    static final int MAXIMO_POR_ESTADO = 1000;

    private final FacturaRepositorioPuerto facturas;

    public ServicioMarcarVencidas(FacturaRepositorioPuerto facturas) {
        this.facturas = facturas;
    }

    @Override
    public ResultadoVencimientos marcar(LocalDate hoy) {
        int revisadas = 0;
        int marcadas = 0;
        int conflictos = 0;
        // Se trae todo antes de modificar: cambiar el estado saca la factura del indice que se esta recorriendo.
        for (EstadoFactura estado : List.of(EstadoFactura.EMITIDA, EstadoFactura.PAGADA_PARCIAL)) {
            for (Factura factura :
                    facturas.listarPorEstado(estado, 0, MAXIMO_POR_ESTADO).contenido()) {
                revisadas++;
                if (!factura.marcarVencidaSiCorresponde(hoy)) {
                    continue;
                }
                try {
                    facturas.guardarCambioDeEstado(factura);
                    marcadas++;
                } catch (ConflictoVersionException e) {
                    conflictos++; // otra operacion la cambio (p. ej. un cobro); la proxima corrida la revisa
                }
            }
        }
        return new ResultadoVencimientos(revisadas, marcadas, conflictos);
    }
}
