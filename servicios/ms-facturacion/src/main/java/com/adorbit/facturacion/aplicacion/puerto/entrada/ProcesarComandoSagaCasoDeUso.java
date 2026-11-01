package com.adorbit.facturacion.aplicacion.puerto.entrada;

import com.adorbit.facturacion.aplicacion.puerto.entrada.EmitirFacturaCasoDeUso.ComandoEmitirFactura;
import java.util.UUID;

/** Caso de uso de entrada: reaccionar a un comando de la SAGA enviado por el orquestador (ms-campanas). */
public interface ProcesarComandoSagaCasoDeUso {

    /** Paso 4: emite la factura. Un fallo de negocio no lanza: se publica FacturacionFallida. */
    void procesarEmitirFactura(String claveComando, ComandoEmitirFactura comando);

    /** Compensacion del paso 4: anula la factura con una nota de credito. */
    void procesarEmitirNotaCredito(String claveComando, UUID sagaId, UUID facturaId, String motivo);
}
