package com.adorbit.facturacion.aplicacion.servicio;

import com.adorbit.facturacion.aplicacion.puerto.entrada.EmitirFacturaCasoDeUso;
import com.adorbit.facturacion.aplicacion.puerto.entrada.EmitirFacturaCasoDeUso.ComandoEmitirFactura;
import com.adorbit.facturacion.aplicacion.puerto.entrada.EmitirNotaCreditoCasoDeUso;
import com.adorbit.facturacion.aplicacion.puerto.entrada.ProcesarComandoSagaCasoDeUso;
import com.adorbit.facturacion.aplicacion.puerto.salida.ClaveIdempotenciaDuplicadaException;
import com.adorbit.facturacion.aplicacion.puerto.salida.EventoSalida;
import com.adorbit.facturacion.aplicacion.puerto.salida.FacturaRepositorioPuerto;
import com.adorbit.facturacion.aplicacion.puerto.salida.IdempotenciaPuerto;
import com.adorbit.facturacion.aplicacion.puerto.salida.RegistroIdempotencia;
import com.adorbit.facturacion.dominio.ExcepcionDominio;
import java.time.Clock;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;
import java.util.function.Supplier;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Orquesta la respuesta a los comandos de la SAGA. Los fallos de NEGOCIO se convierten en el evento
 * FacturacionFallida (y quedan registrados con la clave del comando, para que un reenvio no los repita);
 * los fallos de INFRAESTRUCTURA se propagan para que el consumidor reintente.
 */
public class ServicioProcesarComandoSaga implements ProcesarComandoSagaCasoDeUso {

    private static final Logger LOG = LoggerFactory.getLogger(ServicioProcesarComandoSaga.class);
    private static final String MARCA_FALLO = "\"fallo\"";

    private final EmitirFacturaCasoDeUso emitirFactura;
    private final EmitirNotaCreditoCasoDeUso emitirNotaCredito;
    private final FacturaRepositorioPuerto facturas;
    private final IdempotenciaPuerto idempotencia;
    private final Clock reloj;
    private final Supplier<UUID> generadorId;

    public ServicioProcesarComandoSaga(
            EmitirFacturaCasoDeUso emitirFactura,
            EmitirNotaCreditoCasoDeUso emitirNotaCredito,
            FacturaRepositorioPuerto facturas,
            IdempotenciaPuerto idempotencia,
            Clock reloj,
            Supplier<UUID> generadorId) {
        this.emitirFactura = emitirFactura;
        this.emitirNotaCredito = emitirNotaCredito;
        this.facturas = facturas;
        this.idempotencia = idempotencia;
        this.reloj = reloj;
        this.generadorId = generadorId;
    }

    @Override
    public void procesarEmitirFactura(String claveComando, ComandoEmitirFactura comando) {
        var previo = idempotencia.buscar(claveComando);
        if (previo.isPresent() && previo.get().respuesta().contains(MARCA_FALLO)) {
            LOG.info("Comando {} ya respondido con fallo; se ignora el reenvio", claveComando);
            return;
        }
        try {
            emitirFactura.emitir(comando);
        } catch (ExcepcionDominio e) {
            if (e.codigo().equals("idempotencia_conflicto")) {
                throw e; // misma clave con otro contenido: mensaje corrupto, va a la cola de errores
            }
            registrarFallo(claveComando, comando, e);
        }
    }

    @Override
    public void procesarEmitirNotaCredito(String claveComando, UUID sagaId, UUID facturaId, String motivo) {
        emitirNotaCredito.emitir(claveComando, sagaId, facturaId, motivo);
    }

    private void registrarFallo(String clave, ComandoEmitirFactura c, ExcepcionDominio e) {
        String motivo = e.codigo().equals("total_no_coincide") ? "total_no_coincide" : "datos_invalidos";
        Instant ahora = reloj.instant();

        Map<String, Object> carga = new LinkedHashMap<>();
        carga.put("saga_id", c.sagaId().toString());
        carga.put("campana_id", c.campanaId().toString());
        carga.put("cliente_id", c.clienteId().toString());
        carga.put("motivo", motivo);
        carga.put("detalle", e.getMessage());
        var evento = new EventoSalida(
                generadorId.get(),
                "FacturacionFallida",
                c.campanaId(),
                c.sagaId().toString(),
                ahora,
                carga);
        var registro = new RegistroIdempotencia(
                clave,
                "fallo",
                "{" + MARCA_FALLO + ":\"" + motivo + "\"}",
                ahora.plus(ServicioEmitirFactura.VIGENCIA_IDEMPOTENCIA));
        try {
            facturas.guardarFallo(registro, evento);
            LOG.warn("Facturacion fallida para la SAGA {}: {}", c.sagaId(), motivo);
        } catch (ClaveIdempotenciaDuplicadaException yaRegistrado) {
            LOG.info("El fallo del comando {} ya estaba registrado", clave);
        }
    }
}
