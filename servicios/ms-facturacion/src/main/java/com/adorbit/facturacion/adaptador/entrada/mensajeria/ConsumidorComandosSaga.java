package com.adorbit.facturacion.adaptador.entrada.mensajeria;

import com.adorbit.facturacion.aplicacion.puerto.entrada.EmitirFacturaCasoDeUso.ComandoEmitirFactura;
import com.adorbit.facturacion.aplicacion.puerto.entrada.EmitirFacturaCasoDeUso.LineaComando;
import com.adorbit.facturacion.aplicacion.puerto.entrada.ProcesarComandoSagaCasoDeUso;
import com.adorbit.facturacion.dominio.Moneda;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.amqp.AmqpRejectAndDontRequeueException;
import org.springframework.amqp.core.Message;
import org.springframework.amqp.rabbit.annotation.RabbitListener;

/**
 * Consumidor de la cola {@code saga.facturacion}. Los mensajes ilegibles o desconocidos se rechazan sin reencolar
 * (van a la cola de errores); las fallas transitorias se reintentan con espera exponencial (maximo 5 intentos).
 */
public class ConsumidorComandosSaga {

    private static final Logger LOG = LoggerFactory.getLogger(ConsumidorComandosSaga.class);
    private static final ObjectMapper JSON = new ObjectMapper();

    private final ProcesarComandoSagaCasoDeUso procesar;

    public ConsumidorComandosSaga(ProcesarComandoSagaCasoDeUso procesar) {
        this.procesar = procesar;
    }

    @RabbitListener(queues = "${adorbit.facturacion.mensajeria.cola-comandos}")
    public void recibir(Message mensaje) {
        JsonNode raiz;
        try {
            raiz = JSON.readTree(mensaje.getBody());
        } catch (IOException e) {
            throw new AmqpRejectAndDontRequeueException("El mensaje no es JSON valido", e);
        }
        MDC.put("correlacion_id", raiz.path("correlacion_id").asText(""));
        try {
            String tipo = raiz.path("tipo_evento").asText("");
            JsonNode carga = raiz.path("carga");
            switch (tipo) {
                case "EmitirFactura" -> emitirFactura(carga);
                case "EmitirNotaCredito" -> emitirNotaCredito(carga);
                default -> throw new AmqpRejectAndDontRequeueException("Comando desconocido: " + tipo);
            }
        } catch (IllegalArgumentException | NullPointerException | java.time.format.DateTimeParseException e) {
            LOG.warn("Comando invalido: {}", e.toString());
            throw new AmqpRejectAndDontRequeueException("Comando con datos invalidos", e);
        } finally {
            MDC.remove("correlacion_id");
        }
    }

    private void emitirFactura(JsonNode c) {
        String clave = texto(c, "clave_comando");
        UUID sagaId = UUID.fromString(texto(c, "saga_id"));
        List<LineaComando> lineas = new ArrayList<>();
        for (JsonNode i : requerido(c, "items")) {
            lineas.add(new LineaComando(
                    texto(i, "descripcion"),
                    requerido(i, "cantidad").asInt(),
                    new BigDecimal(texto(i, "precio_unitario"))));
        }
        var comando = new ComandoEmitirFactura(
                clave,
                sagaId,
                UUID.fromString(texto(c, "cliente_id")),
                UUID.fromString(texto(c, "campana_id")),
                Moneda.valueOf(texto(c, "moneda")),
                lineas,
                new BigDecimal(texto(c, "total")),
                c.hasNonNull("fecha_vencimiento")
                        ? LocalDate.parse(c.get("fecha_vencimiento").asText())
                        : null);
        procesar.procesarEmitirFactura(clave, comando);
    }

    private void emitirNotaCredito(JsonNode c) {
        procesar.procesarEmitirNotaCredito(
                texto(c, "clave_comando"),
                UUID.fromString(texto(c, "saga_id")),
                UUID.fromString(texto(c, "factura_id")),
                c.path("motivo").asText("Compensacion de SAGA"));
    }

    private static JsonNode requerido(JsonNode nodo, String campo) {
        JsonNode valor = nodo.get(campo);
        if (valor == null || valor.isNull()) {
            throw new IllegalArgumentException("Falta el campo " + campo);
        }
        return valor;
    }

    private static String texto(JsonNode nodo, String campo) {
        return requerido(nodo, campo).asText();
    }
}
