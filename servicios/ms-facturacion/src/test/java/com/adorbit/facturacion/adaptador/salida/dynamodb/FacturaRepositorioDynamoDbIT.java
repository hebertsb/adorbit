package com.adorbit.facturacion.adaptador.salida.dynamodb;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.adorbit.facturacion.aplicacion.puerto.entrada.EmitirFacturaCasoDeUso.ComandoEmitirFactura;
import com.adorbit.facturacion.aplicacion.puerto.entrada.EmitirFacturaCasoDeUso.LineaComando;
import com.adorbit.facturacion.aplicacion.servicio.ServicioEmitirFactura;
import com.adorbit.facturacion.dominio.EstadoFactura;
import com.adorbit.facturacion.dominio.ExcepcionDominio;
import com.adorbit.facturacion.dominio.Moneda;
import java.math.BigDecimal;
import java.net.URI;
import java.time.Clock;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.dynamodb.DynamoDbClient;
import software.amazon.awssdk.services.dynamodb.model.AttributeDefinition;
import software.amazon.awssdk.services.dynamodb.model.AttributeValue;
import software.amazon.awssdk.services.dynamodb.model.BillingMode;
import software.amazon.awssdk.services.dynamodb.model.GlobalSecondaryIndex;
import software.amazon.awssdk.services.dynamodb.model.KeySchemaElement;
import software.amazon.awssdk.services.dynamodb.model.KeyType;
import software.amazon.awssdk.services.dynamodb.model.Projection;
import software.amazon.awssdk.services.dynamodb.model.ProjectionType;
import software.amazon.awssdk.services.dynamodb.model.ScalarAttributeType;

/** Prueba contra DynamoDB Local real. El esquema replica base_de_datos/ms-facturacion.dynamodb.sh. */
@Testcontainers(disabledWithoutDocker = true)
class FacturaRepositorioDynamoDbIT {

    private static final String TABLA = "AdOrbitFacturacion";

    @Container
    static final GenericContainer<?> DYNAMO = new GenericContainer<>("amazon/dynamodb-local:2.5.3")
            .withCommand("-jar", "DynamoDBLocal.jar", "-sharedDb", "-inMemory")
            .withExposedPorts(8000);

    static DynamoDbClient cliente;
    static FacturaRepositorioDynamoDb repositorio;
    static ServicioEmitirFactura servicio;

    @BeforeAll
    static void crearTabla() {
        cliente = DynamoDbClient.builder()
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
                        indice("GSI2-EstadoVencimiento", "GSI2PK", "GSI2SK")));
        repositorio = new FacturaRepositorioDynamoDb(cliente, TABLA);
        servicio = new ServicioEmitirFactura(
                repositorio, repositorio, Clock.systemUTC(), UUID::randomUUID, new BigDecimal("0.13"), 30);
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

    private ComandoEmitirFactura comando(String clave, UUID cliente, String precio) {
        return new ComandoEmitirFactura(
                clave,
                null,
                cliente,
                UUID.randomUUID(),
                Moneda.BOB,
                List.of(
                        new LineaComando("Banner web", 3, new BigDecimal(precio)),
                        new LineaComando("Spot", 1, new BigDecimal("100.00"))),
                null,
                null);
    }

    private long contar(String prefijoPk) {
        return cliente.scan(r -> r.tableName(TABLA)).items().stream()
                .filter(f -> f.get("PK").s().startsWith(prefijoPk))
                .count();
    }

    @Test
    void emiteYLuegoLeeLaFacturaCompleta() {
        UUID clienteId = UUID.randomUUID();
        var resultado = servicio.emitir(comando("clave-it-001", clienteId, "50.00"));

        var leida = repositorio.buscarPorId(resultado.factura().id()).orElseThrow();
        assertThat(leida.estado()).isEqualTo(EstadoFactura.EMITIDA);
        assertThat(leida.items()).hasSize(2);
        assertThat(leida.totales().total().monto()).isEqualByComparingTo("282.50");
        assertThat(leida.saldo()).isEqualTo(leida.totales().total());
        assertThat(leida.clienteId()).isEqualTo(clienteId);
    }

    @Test
    void guardaFacturaIdempotenciaYBandejaDeSalidaJuntas() {
        var resultado = servicio.emitir(comando("clave-it-002", UUID.randomUUID(), "10.00"));
        var salida = cliente.scan(r -> r.tableName(TABLA)).items().stream()
                .filter(f -> f.get("PK").s().startsWith("SALIDA#")
                        && f.get("agregado_id")
                                .s()
                                .equals(resultado.factura().id().toString()))
                .toList();
        assertThat(salida).hasSize(1);
        assertThat(salida.get(0).get("tipo_evento").s()).isEqualTo("FacturaEmitida");
        assertThat(salida.get(0).get("carga").s()).contains("\"tipo_evento\":\"FacturaEmitida\"", "\"total\":\"");
        assertThat(repositorio.buscar("clave-it-002")).isPresent();
    }

    @Test
    void repetirLaSolicitudNoDuplicaNada() {
        UUID clienteId = UUID.randomUUID();
        var comando = comando("clave-it-003", clienteId, "20.00");
        var primera = servicio.emitir(comando);
        long facturasAntes = contar("FACT#");
        long salidaAntes = contar("SALIDA#");

        var segunda = servicio.emitir(comando);

        assertThat(segunda.repetida()).isTrue();
        assertThat(segunda.factura().id()).isEqualTo(primera.factura().id());
        assertThat(contar("FACT#")).isEqualTo(facturasAntes);
        assertThat(contar("SALIDA#")).isEqualTo(salidaAntes);
    }

    @Test
    void mismaClaveConOtroCuerpoEsConflicto() {
        UUID clienteId = UUID.randomUUID();
        servicio.emitir(comando("clave-it-004", clienteId, "20.00"));
        assertThatThrownBy(() -> servicio.emitir(comando("clave-it-004", clienteId, "21.00")))
                .isInstanceOf(ExcepcionDominio.class)
                .extracting("codigo")
                .isEqualTo("idempotencia_conflicto");
    }

    @Test
    void laTransaccionEsAtomicaSiLaClaveYaExiste() {
        UUID clienteId = UUID.randomUUID();
        var primera = servicio.emitir(comando("clave-it-005", clienteId, "30.00"));
        long facturasAntes = contar("FACT#");
        long salidaAntes = contar("SALIDA#");

        // Simula la carrera: otra emision con la misma clave llega directo al repositorio.
        var otra = comando("clave-it-005", clienteId, "30.00");
        var factura = com.adorbit.facturacion.dominio.Factura.emitir(
                UUID.randomUUID(),
                clienteId,
                otra.campanaId(),
                Moneda.BOB,
                List.of(new com.adorbit.facturacion.dominio.ItemFactura(
                        1, "x", 1, com.adorbit.facturacion.dominio.Dinero.de("1.00", Moneda.BOB))),
                new BigDecimal("0.13"),
                null,
                java.time.LocalDate.now(),
                java.time.LocalDate.now().plusDays(5));
        var evento = new com.adorbit.facturacion.aplicacion.puerto.salida.EventoSalida(
                UUID.randomUUID(), "FacturaEmitida", factura.id(), "x", java.time.Instant.now(), Map.of());
        var registro = new com.adorbit.facturacion.aplicacion.puerto.salida.RegistroIdempotencia(
                "clave-it-005", "otra-huella", "{}", java.time.Instant.now().plusSeconds(60));

        assertThatThrownBy(() -> repositorio.guardarEmision(factura, registro, evento))
                .isInstanceOf(
                        com.adorbit.facturacion.aplicacion.puerto.salida.ClaveIdempotenciaDuplicadaException.class);
        assertThat(contar("FACT#")).isEqualTo(facturasAntes);
        assertThat(contar("SALIDA#")).isEqualTo(salidaAntes);
        assertThat(repositorio.buscarPorId(factura.id())).isEmpty();
        assertThat(repositorio.buscarPorId(primera.factura().id())).isPresent();
    }

    @Test
    void consultaPorClienteUsaElIndiceGsi1() {
        UUID clienteId = UUID.randomUUID();
        servicio.emitir(comando("clave-it-006", clienteId, "5.00"));
        var items = cliente.query(r -> r.tableName(TABLA)
                        .indexName("GSI1-ClienteFecha")
                        .keyConditionExpression("GSI1PK = :c")
                        .expressionAttributeValues(Map.of(":c", AttributeValue.fromS("CLI#" + clienteId))))
                .items();
        assertThat(items).hasSize(1);
    }
}
