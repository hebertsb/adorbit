package adorbit.campanas.infraestructura.mensajeria;

import adorbit.campanas.aplicacion.servicios.SagaOrquestadorServicio;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Component
@Profile("!test")
public class ConsumidorRespuestasSaga {

    private static final Logger log = LoggerFactory.getLogger(ConsumidorRespuestasSaga.class);

    private final SagaOrquestadorServicio sagaServicio;
    private final ObjectMapper objectMapper;

    public ConsumidorRespuestasSaga(SagaOrquestadorServicio sagaServicio, ObjectMapper objectMapper) {
        this.sagaServicio = sagaServicio;
        this.objectMapper = objectMapper;
    }

    @RabbitListener(queues = ConfiguracionRabbitMQ.COLA_SAGA_CAMPANAS)
    public void procesarMensaje(String mensajeJson) {
        try {
            JsonNode nodo = objectMapper.readTree(mensajeJson);
            String tipoEvento = nodo.path("tipo_evento").asText();
            // correlacion_id es el saga_id en la convencion de los 3 participantes (ms-clientes-crm,
            // ms-creatividades, ms-facturacion): todos usan agregado_id para el campana_id/entidad y
            // correlacion_id para correlacionar con la SAGA. agregado_id queda solo de respaldo.
            String sagaIdStr = nodo.path("correlacion_id").asText();

            if (sagaIdStr == null || sagaIdStr.isEmpty()) {
                sagaIdStr = nodo.path("agregado_id").asText();
            }

            if (sagaIdStr == null || sagaIdStr.isEmpty()) {
                log.warn("Mensaje SAGA recibido sin agregado_id ni correlacion_id: {}", mensajeJson);
                return;
            }

            UUID sagaId = UUID.fromString(sagaIdStr);
            JsonNode carga = nodo.path("carga");
            Map<String, Object> detalle = objectMapper.convertValue(carga, Map.class);
            if (detalle == null) detalle = new HashMap<>();

            log.info("Recibida respuesta SAGA tipo_evento={} para saga_id={}", tipoEvento, sagaId);

            switch (tipoEvento) {
                case "CreditoReservado":
                    sagaServicio.procesarRespuestaCredito(sagaId, true, null, detalle);
                    break;
                case "CreditoRechazado":
                    String motivoCredito = carga.path("motivo").asText("Línea de crédito insuficiente");
                    sagaServicio.procesarRespuestaCredito(sagaId, false, motivoCredito, detalle);
                    break;
                case "PiezasBloqueadas":
                    sagaServicio.procesarRespuestaPiezas(sagaId, true, null, detalle);
                    break;
                case "BloqueoFallido":
                    String motivoPiezas = carga.path("motivo").asText("Piezas no encontradas o no aprobadas");
                    sagaServicio.procesarRespuestaPiezas(sagaId, false, motivoPiezas, detalle);
                    break;
                case "FacturaEmitida":
                    sagaServicio.procesarRespuestaFactura(sagaId, true, null, detalle);
                    break;
                case "FacturacionFallida":
                    String motivoFactura = carga.path("motivo").asText("Error al emitir factura");
                    sagaServicio.procesarRespuestaFactura(sagaId, false, motivoFactura, detalle);
                    break;
                case "CreditoLiberado":
                    sagaServicio.procesarConfirmacionCompensacion(sagaId, 2);
                    break;
                case "PiezasDesbloqueadas":
                    sagaServicio.procesarConfirmacionCompensacion(sagaId, 3);
                    break;
                case "NotaCreditoEmitida":
                    sagaServicio.procesarConfirmacionCompensacion(sagaId, 4);
                    break;
                default:
                    log.debug("Evento no manejado por ConsumidorRespuestasSaga: {}", tipoEvento);
                    break;
            }
        } catch (Exception e) {
            log.error("Error al procesar mensaje de respuesta SAGA: {}", e.getMessage(), e);
        }
    }
}

