package com.adorbit.facturacion.mensajeria;

import static org.assertj.core.api.Assertions.assertThat;

import com.adorbit.facturacion.aplicacion.puerto.salida.FacturaRepositorioPuerto;
import com.adorbit.facturacion.dominio.EstadoFactura;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.networknt.schema.JsonSchema;
import com.networknt.schema.JsonSchemaFactory;
import com.networknt.schema.SpecVersion;
import java.io.IOException;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.UUID;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.springframework.amqp.core.Binding;
import org.springframework.amqp.core.BindingBuilder;
import org.springframework.amqp.core.Message;
import org.springframework.amqp.core.MessageBuilder;
import org.springframework.amqp.core.MessageProperties;
import org.springframework.amqp.core.Queue;
import org.springframework.amqp.core.TopicExchange;
import org.springframework.amqp.rabbit.core.RabbitAdmin;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.containers.RabbitMQContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.dynamodb.DynamoDbClient;
import software.amazon.awssdk.services.dynamodb.model.AttributeDefinition;
import software.amazon.awssdk.services.dynamodb.model.BillingMode;
import software.amazon.awssdk.services.dynamodb.model.GlobalSecondaryIndex;
import software.amazon.awssdk.services.dynamodb.model.KeySchemaElement;
import software.amazon.awssdk.services.dynamodb.model.KeyType;
import software.amazon.awssdk.services.dynamodb.model.Projection;
import software.amazon.awssdk.services.dynamodb.model.ProjectionType;
import software.amazon.awssdk.services.dynamodb.model.ScalarAttributeType;
import software.amazon.awssdk.services.dynamodb.model.StreamSpecification;
import software.amazon.awssdk.services.dynamodb.model.StreamViewType;

/**
 * Punta a punta: comando SAGA -> factura -> bandeja de salida -> Streams -> RabbitMQ, validando cada evento
 * publicado contra su esquema de contratos/eventos.
 */
@Testcontainers(disabledWithoutDocker = true)
@SpringBootTest(
        properties = {
            "adorbit.facturacion.seguridad.jwks-uri=http://localhost:9/jwks",
            "adorbit.facturacion.seguridad.emisor=http://localhost:9/realms/adorbit",
            "adorbit.facturacion.mensajeria.intervalo-relevo=300ms",
            "spring.rabbitmq.listener.simple.retry.initial-interval=200ms",
            "spring.rabbitmq.listener.simple.retry.max-interval=500ms"
        })
class MensajeriaSagaIT {

    private static final String TABLA = "AdOrbitFacturacion";
    private static final ObjectMapper JSON = new ObjectMapper();

    @Container
    static final GenericContainer<?> DYNAMO = new GenericContainer<>("amazon/dynamodb-local:2.5.3")
            .withCommand("-jar", "DynamoDBLocal.jar", "-sharedDb", "-inMemory")
            .withExposedPorts(8000);

    @Container
    static final RabbitMQContainer RABBIT = new RabbitMQContainer("rabbitmq:3.13-management");

    static {
        System.setProperty("aws.accessKeyId", "local");
        System.setProperty("aws.secretAccessKey", "local");
    }

    @DynamicPropertySource
    static void propiedades(DynamicPropertyRegistry registro) {
        registro.add(
                "adorbit.facturacion.dynamodb.endpoint",
                () -> "http://" + DYNAMO.getHost() + ":" + DYNAMO.getMappedPort(8000));
        registro.add("spring.rabbitmq.host", RABBIT::getHost);
        registro.add("spring.rabbitmq.port", RABBIT::getAmqpPort);
        registro.add("spring.rabbitmq.username", RABBIT::getAdminUsername);
        registro.add("spring.rabbitmq.password", RABBIT::getAdminPassword);
    }

    @Autowired
    RabbitTemplate rabbit;

    @Autowired
    RabbitAdmin admin;

    @Autowired
    FacturaRepositorioPuerto facturas;

    @BeforeAll
    static void crearTabla() {
        DynamoDbClient cliente = DynamoDbClient.builder()
                .endpointOverride(URI.create("http://" + DYNAMO.getHost() + ":" + DYNAMO.getMappedPort(8000)))
                .region(Region.US_EAST_1)
                .credentialsProvider(StaticCredentialsProvider.create(AwsBasicCredentials.create("local", "local")))
                .build();
        cliente.createTable(r -> r.tableName(TABLA)
                .billingMode(BillingMode.PAY_PER_REQUEST)
                .attributeDefinitions(
                        atributo("PK"),
                        atributo("SK"),
                        atributo("GSI1PK"),
                        atributo("GSI1SK"),
                        atributo("GSI2PK"),
                        atributo("GSI2SK"))
                .keySchema(clave("PK", KeyType.HASH), clave("SK", KeyType.RANGE))
                .globalSecondaryIndexes(
                        indice("GSI1-ClienteFecha", "GSI1PK", "GSI1SK"),
                        indice("GSI2-EstadoVencimiento", "GSI2PK", "GSI2SK"))
                .streamSpecification(StreamSpecification.builder()
                        .streamEnabled(true)
                        .streamViewType(StreamViewType.NEW_IMAGE)
                        .build()));
    }

    private static AttributeDefinition atributo(String nombre) {
        return AttributeDefinition.builder()
                .attributeName(nombre)
                .attributeType(ScalarAttributeType.S)
                .build();
    }

    private static KeySchemaElement clave(String nombre, KeyType tipo) {
        return KeySchemaElement.builder().attributeName(nombre).keyType(tipo).build();
    }

    private static GlobalSecondaryIndex indice(String nombre, String pk, String sk) {
        return GlobalSecondaryIndex.builder()
                .indexName(nombre)
                .keySchema(clave(pk, KeyType.HASH), clave(sk, KeyType.RANGE))
                .projection(
                        Projection.builder().projectionType(ProjectionType.ALL).build())
                .build();
    }

    private void escucharEventos(String cola) {
        Queue q = new Queue(cola, false, false, false);
        admin.declareQueue(q);
        Binding b = BindingBuilder.bind(q)
                .to(new TopicExchange("adorbit.eventos", true, false))
                .with("#");
        admin.declareBinding(b);
    }

    private void enviarComando(String tipo, String carga) {
        String sobre =
                "{\"id_evento\":\"%s\",\"tipo_evento\":\"%s\",\"version_esquema\":1,\"ocurrido_en\":\"2026-11-05T14:00:00Z\",\"agregado_id\":\"%s\",\"correlacion_id\":\"saga\",\"carga\":%s}"
                        .formatted(UUID.randomUUID(), tipo, UUID.randomUUID(), carga);
        String enrutamiento = tipo.equals("EmitirFactura") ? "emitir.factura" : "emitir.nota.credito";
        enviarCrudo(enrutamiento, sobre.getBytes(StandardCharsets.UTF_8));
    }

    private void enviarCrudo(String claveEnrutamiento, byte[] cuerpo) {
        Message m = MessageBuilder.withBody(cuerpo)
                .setContentType(MessageProperties.CONTENT_TYPE_JSON)
                .build();
        rabbit.send("adorbit.saga", claveEnrutamiento, m);
    }

    private String emitirFacturaJson(UUID saga, String total) {
        return "{\"saga_id\":\"%s\",\"clave_comando\":\"%s:4:accion\",\"cliente_id\":\"%s\",\"campana_id\":\"%s\",\"items\":[{\"descripcion\":\"Spot\",\"cantidad\":2,\"precio_unitario\":\"1000.00\"}],\"total\":\"%s\",\"moneda\":\"BOB\"}"
                .formatted(saga, saga, UUID.randomUUID(), UUID.randomUUID(), total);
    }

    /** Espera un evento del tipo dado con ese saga_id; valida el sobre contra el esquema del contrato. */
    private JsonNode esperar(String cola, String tipo, UUID saga, long esperaMs) throws IOException {
        long limite = System.currentTimeMillis() + esperaMs;
        while (System.currentTimeMillis() < limite) {
            Message m = rabbit.receive(cola, 500);
            if (m == null) {
                continue;
            }
            JsonNode nodo = JSON.readTree(m.getBody());
            boolean coincide = tipo.equals(nodo.path("tipo_evento").asText())
                    && saga.toString().equals(nodo.path("carga").path("saga_id").asText());
            if (coincide) {
                validar(tipo, nodo);
                return nodo;
            }
        }
        return null;
    }

    private static void validar(String tipo, JsonNode nodo) throws IOException {
        Path ruta = Path.of("../../contratos/eventos/" + tipo + ".schema.json");
        JsonSchema esquema =
                JsonSchemaFactory.getInstance(SpecVersion.VersionFlag.V202012).getSchema(Files.readString(ruta));
        assertThat(esquema.validate(nodo))
                .as("el evento %s cumple su esquema", tipo)
                .isEmpty();
    }

    @Test
    void emitirFacturaPublicaFacturaEmitidaYElReenvioNoDuplica() throws Exception {
        String cola = "test.eventos." + UUID.randomUUID();
        escucharEventos(cola);
        UUID saga = UUID.randomUUID();
        String carga = emitirFacturaJson(saga, "2260.00");

        enviarComando("EmitirFactura", carga);
        JsonNode evento = esperar(cola, "FacturaEmitida", saga, 20_000);
        assertThat(evento).as("FacturaEmitida publicada").isNotNull();
        assertThat(evento.path("carga").path("total").asText()).isEqualTo("2260.00");

        enviarComando("EmitirFactura", carga);
        assertThat(esperar(cola, "FacturaEmitida", saga, 4_000))
                .as("sin segundo evento")
                .isNull();
    }

    @Test
    void totalIncorrectoPublicaFacturacionFallidaUnaSolaVez() throws Exception {
        String cola = "test.eventos." + UUID.randomUUID();
        escucharEventos(cola);
        UUID saga = UUID.randomUUID();
        String carga = emitirFacturaJson(saga, "1.00");

        enviarComando("EmitirFactura", carga);
        JsonNode evento = esperar(cola, "FacturacionFallida", saga, 20_000);
        assertThat(evento).isNotNull();
        assertThat(evento.path("carga").path("motivo").asText()).isEqualTo("total_no_coincide");

        enviarComando("EmitirFactura", carga);
        assertThat(esperar(cola, "FacturacionFallida", saga, 4_000)).isNull();
    }

    @Test
    void notaDeCreditoCompensaYAnulaLaFactura() throws Exception {
        String cola = "test.eventos." + UUID.randomUUID();
        escucharEventos(cola);
        UUID saga = UUID.randomUUID();
        enviarComando("EmitirFactura", emitirFacturaJson(saga, "2260.00"));
        JsonNode emitida = esperar(cola, "FacturaEmitida", saga, 20_000);
        assertThat(emitida).isNotNull();
        UUID facturaId =
                UUID.fromString(emitida.path("carga").path("factura_id").asText());

        String compensacion =
                "{\"saga_id\":\"%s\",\"clave_comando\":\"%s:4:compensacion\",\"factura_id\":\"%s\",\"campana_id\":\"%s\",\"motivo\":\"Fallo posterior en la SAGA\"}"
                        .formatted(saga, saga, facturaId, UUID.randomUUID());
        enviarComando("EmitirNotaCredito", compensacion);

        JsonNode nota = esperar(cola, "NotaCreditoEmitida", saga, 20_000);
        assertThat(nota).isNotNull();
        assertThat(nota.path("carga").path("factura_id").asText()).isEqualTo(facturaId.toString());
        assertThat(facturas.buscarPorId(facturaId).orElseThrow().estado()).isEqualTo(EstadoFactura.ANULADA);

        enviarComando("EmitirNotaCredito", compensacion);
        assertThat(esperar(cola, "NotaCreditoEmitida", saga, 4_000))
                .as("la compensacion es idempotente")
                .isNull();
    }

    @Test
    void mensajeIlegibleVaALaColaDeErrores() {
        enviarCrudo("emitir.factura", "esto no es json".getBytes(StandardCharsets.UTF_8));
        Message enDlq = null;
        long limite = System.currentTimeMillis() + 20_000;
        while (enDlq == null && System.currentTimeMillis() < limite) {
            enDlq = rabbit.receive("saga.facturacion.dlq", 500);
        }
        assertThat(enDlq).as("mensaje en saga.facturacion.dlq").isNotNull();
    }
}
