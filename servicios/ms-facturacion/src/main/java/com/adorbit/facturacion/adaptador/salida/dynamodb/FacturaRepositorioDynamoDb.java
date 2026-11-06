package com.adorbit.facturacion.adaptador.salida.dynamodb;

import com.adorbit.facturacion.aplicacion.puerto.salida.ClaveIdempotenciaDuplicadaException;
import com.adorbit.facturacion.aplicacion.puerto.salida.ConflictoVersionException;
import com.adorbit.facturacion.aplicacion.puerto.salida.EventoSalida;
import com.adorbit.facturacion.aplicacion.puerto.salida.FacturaRepositorioPuerto;
import com.adorbit.facturacion.aplicacion.puerto.salida.IdempotenciaPuerto;
import com.adorbit.facturacion.aplicacion.puerto.salida.Pagina;
import com.adorbit.facturacion.aplicacion.puerto.salida.RegistroIdempotencia;
import com.adorbit.facturacion.dominio.Cobro;
import com.adorbit.facturacion.dominio.Dinero;
import com.adorbit.facturacion.dominio.EstadoFactura;
import com.adorbit.facturacion.dominio.Factura;
import com.adorbit.facturacion.dominio.ItemFactura;
import com.adorbit.facturacion.dominio.Moneda;
import com.adorbit.facturacion.dominio.NotaCredito;
import com.adorbit.facturacion.dominio.Totales;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import software.amazon.awssdk.services.dynamodb.DynamoDbClient;
import software.amazon.awssdk.services.dynamodb.model.AttributeValue;
import software.amazon.awssdk.services.dynamodb.model.Put;
import software.amazon.awssdk.services.dynamodb.model.QueryResponse;
import software.amazon.awssdk.services.dynamodb.model.TransactWriteItem;
import software.amazon.awssdk.services.dynamodb.model.TransactionCanceledException;
import software.amazon.awssdk.services.dynamodb.model.Update;

/**
 * Adaptador DynamoDB (tabla unica, ver base_de_datos/ms-facturacion.dynamodb.sh).
 * La emision escribe factura + items + IDEMP# + SALIDA# en una sola TransactWriteItems.
 */
public class FacturaRepositorioDynamoDb implements FacturaRepositorioPuerto, IdempotenciaPuerto {

    static final int MAXIMO_LISTADO = 1000;
    static final long VIGENCIA_BANDEJA_SEGUNDOS = 30L * 24 * 3600;
    private static final ObjectMapper JSON = new ObjectMapper();

    private final DynamoDbClient cliente;
    private final String tabla;

    public FacturaRepositorioDynamoDb(DynamoDbClient cliente, String tabla) {
        this.cliente = cliente;
        this.tabla = tabla;
    }

    @Override
    public void guardarEmision(Factura f, RegistroIdempotencia idemp, EventoSalida evento) {
        List<TransactWriteItem> operaciones = new ArrayList<>();
        // Posicion 0 = idempotencia: si falla su condicion, es una repeticion.
        operaciones.add(poner(filaIdempotencia(idemp)));
        operaciones.add(poner(filaCabecera(f)));
        for (ItemFactura item : f.items()) {
            operaciones.add(poner(filaItem(f, item)));
        }
        operaciones.add(poner(filaSalida(evento)));
        try {
            cliente.transactWriteItems(r -> r.transactItems(operaciones));
        } catch (TransactionCanceledException e) {
            var razones = e.cancellationReasons();
            if (!razones.isEmpty()
                    && "ConditionalCheckFailed".equals(razones.get(0).code())) {
                throw new ClaveIdempotenciaDuplicadaException(idemp.clave());
            }
            throw e;
        }
    }

    @Override
    public Optional<RegistroIdempotencia> buscar(String clave) {
        var respuesta = cliente.getItem(
                r -> r.tableName(tabla).consistentRead(true).key(Map.of("PK", s("IDEMP#" + clave), "SK", s("META"))));
        if (!respuesta.hasItem() || respuesta.item().isEmpty()) {
            return Optional.empty();
        }
        Map<String, AttributeValue> fila = respuesta.item();
        return Optional.of(new RegistroIdempotencia(
                clave,
                fila.get("huella_solicitud").s(),
                fila.get("respuesta").s(),
                Instant.ofEpochSecond(Long.parseLong(fila.get("vence_epoch").n()))));
    }

    @Override
    public Optional<Factura> buscarPorId(UUID id) {
        QueryResponse respuesta = cliente.query(r -> r.tableName(tabla)
                .consistentRead(true)
                .keyConditionExpression("PK = :pk")
                .expressionAttributeValues(Map.of(":pk", s("FACT#" + id))));
        if (respuesta.items().isEmpty()) {
            return Optional.empty();
        }
        Map<String, AttributeValue> cabecera = null;
        List<ItemFactura> items = new ArrayList<>();
        List<Cobro> cobros = new ArrayList<>();
        for (Map<String, AttributeValue> fila : respuesta.items()) {
            String sk = fila.get("SK").s();
            if (sk.equals("META")) {
                cabecera = fila;
            } else if (sk.startsWith("ITEM#")) {
                Moneda moneda = Moneda.valueOf(fila.get("moneda").s());
                items.add(new ItemFactura(
                        Integer.parseInt(fila.get("numero").n()),
                        fila.get("descripcion").s(),
                        Integer.parseInt(fila.get("cantidad").n()),
                        new Dinero(new BigDecimal(fila.get("precio_unitario").n()), moneda)));
            } else if (sk.startsWith("COBRO#")) {
                Moneda moneda = Moneda.valueOf(fila.get("moneda").s());
                cobros.add(new Cobro(
                        UUID.fromString(fila.get("cobro_id").s()),
                        id,
                        new Dinero(new BigDecimal(fila.get("monto").n()), moneda),
                        LocalDate.parse(fila.get("fecha").s()),
                        fila.containsKey("referencia") ? fila.get("referencia").s() : null));
            }
        }
        if (cabecera == null) {
            return Optional.empty();
        }
        return Optional.of(desdeCabecera(cabecera, items, cobros));
    }

    private Factura desdeCabecera(Map<String, AttributeValue> cabecera, List<ItemFactura> items, List<Cobro> cobros) {
        Moneda moneda = Moneda.valueOf(cabecera.get("moneda").s());
        Totales totales = new Totales(
                dinero(cabecera, "subtotal", moneda),
                dinero(cabecera, "impuestos", moneda),
                dinero(cabecera, "total", moneda));
        return Factura.reconstituir(
                UUID.fromString(cabecera.get("PK").s().substring("FACT#".length())),
                UUID.fromString(cabecera.get("cliente_id").s()),
                UUID.fromString(cabecera.get("campana_id").s()),
                moneda,
                items,
                totales,
                LocalDate.parse(cabecera.get("fecha_emision").s()),
                LocalDate.parse(cabecera.get("fecha_vencimiento").s()),
                cobros,
                EstadoFactura.valueOf(cabecera.get("estado").s().toUpperCase()),
                dinero(cabecera, "saldo", moneda),
                Long.parseLong(cabecera.get("version").n()));
    }

    @Override
    public void guardarCobro(Factura f, Cobro cobro, RegistroIdempotencia idemp, List<EventoSalida> eventos) {
        List<TransactWriteItem> operaciones = new ArrayList<>();
        operaciones.add(poner(filaIdempotencia(idemp)));
        operaciones.add(poner(filaCobro(f, cobro)));
        operaciones.add(actualizarCabecera(f));
        for (EventoSalida evento : eventos) {
            operaciones.add(poner(filaSalida(evento)));
        }
        ejecutarConConflictos(operaciones, idemp.clave());
    }

    @Override
    public Pagina<Factura> listarPorCliente(UUID clienteId, EstadoFactura estado, int page, int size) {
        List<Factura> todas = consultarIndice("GSI1-ClienteFecha", "GSI1PK", "CLI#" + clienteId);
        if (estado != null) {
            todas = todas.stream().filter(f -> f.estado() == estado).toList();
        }
        return paginar(todas, page, size);
    }

    @Override
    public Pagina<Factura> listarPorEstado(EstadoFactura estado, int page, int size) {
        return paginar(
                consultarIndice(
                        "GSI2-EstadoVencimiento",
                        "GSI2PK",
                        "ESTADO#" + estado.name().toLowerCase()),
                page,
                size);
    }

    /** Trae hasta {@value #MAXIMO_LISTADO} cabeceras del indice (sin items ni cobros). */
    private List<Factura> consultarIndice(String indice, String atributoPk, String valorPk) {
        List<Factura> resultado = new ArrayList<>();
        Map<String, AttributeValue> inicio = null;
        do {
            Map<String, AttributeValue> desde = inicio;
            QueryResponse r = cliente.query(q -> {
                q.tableName(tabla)
                        .indexName(indice)
                        .keyConditionExpression(atributoPk + " = :v")
                        .expressionAttributeValues(Map.of(":v", s(valorPk)))
                        .scanIndexForward(false);
                if (desde != null) {
                    q.exclusiveStartKey(desde);
                }
            });
            for (Map<String, AttributeValue> fila : r.items()) {
                if (fila.containsKey("tipo")
                        && "FACTURA".equals(fila.get("tipo").s())) {
                    resultado.add(desdeCabecera(fila, List.of(), List.of()));
                }
            }
            inicio = r.hasLastEvaluatedKey() ? r.lastEvaluatedKey() : null;
        } while (inicio != null && resultado.size() < MAXIMO_LISTADO);
        return resultado;
    }

    private static Pagina<Factura> paginar(List<Factura> todas, int page, int size) {
        int desde = Math.min(page * size, todas.size());
        int hasta = Math.min(desde + size, todas.size());
        return new Pagina<>(List.copyOf(todas.subList(desde, hasta)), page, size, todas.size());
    }

    @Override
    public void guardarNotaCredito(Factura f, NotaCredito nota, RegistroIdempotencia idemp, EventoSalida evento) {
        List<TransactWriteItem> operaciones = new ArrayList<>();
        operaciones.add(poner(filaIdempotencia(idemp)));
        operaciones.add(poner(filaNotaCredito(f, nota)));
        operaciones.add(actualizarCabecera(f));
        operaciones.add(poner(filaSalida(evento)));
        ejecutarConConflictos(operaciones, idemp.clave());
    }

    @Override
    public void guardarCambioDeEstado(Factura f) {
        var actualizacion = actualizarCabecera(f).update();
        try {
            cliente.updateItem(r -> r.tableName(tabla)
                    .key(actualizacion.key())
                    .updateExpression(actualizacion.updateExpression())
                    .conditionExpression(actualizacion.conditionExpression())
                    .expressionAttributeValues(actualizacion.expressionAttributeValues()));
        } catch (software.amazon.awssdk.services.dynamodb.model.ConditionalCheckFailedException e) {
            throw new ConflictoVersionException("La factura fue modificada por otra operacion");
        }
    }

    @Override
    public void guardarFallo(RegistroIdempotencia idemp, EventoSalida evento) {
        List<TransactWriteItem> operaciones = new ArrayList<>();
        operaciones.add(poner(filaIdempotencia(idemp)));
        operaciones.add(poner(filaSalida(evento)));
        ejecutarConConflictos(operaciones, idemp.clave());
    }

    private TransactWriteItem actualizarCabecera(Factura f) {
        return TransactWriteItem.builder()
                .update(Update.builder()
                        .tableName(tabla)
                        .key(Map.of("PK", s("FACT#" + f.id()), "SK", s("META")))
                        .updateExpression("SET saldo = :saldo, estado = :estado, version = :nueva, GSI2PK = :g2")
                        .conditionExpression("version = :previa")
                        .expressionAttributeValues(Map.of(
                                ":saldo", n(f.saldo().monto()),
                                ":estado", s(f.estado().name().toLowerCase()),
                                ":nueva", AttributeValue.fromN(Long.toString(f.version())),
                                ":previa", AttributeValue.fromN(Long.toString(f.version() - 1)),
                                ":g2", s("ESTADO#" + f.estado().name().toLowerCase())))
                        .build())
                .build();
    }

    /** Ejecuta la transaccion. Posicion 0 = idempotencia; posicion 2 = actualizacion de cabecera (si la hay). */
    private void ejecutarConConflictos(List<TransactWriteItem> operaciones, String clave) {
        try {
            cliente.transactWriteItems(r -> r.transactItems(operaciones));
        } catch (TransactionCanceledException e) {
            var razones = e.cancellationReasons();
            if (!razones.isEmpty()
                    && "ConditionalCheckFailed".equals(razones.get(0).code())) {
                throw new ClaveIdempotenciaDuplicadaException(clave);
            }
            if (razones.size() > 2
                    && operaciones.get(2).update() != null
                    && "ConditionalCheckFailed".equals(razones.get(2).code())) {
                throw new ConflictoVersionException("La factura fue modificada por otra operacion");
            }
            throw e;
        }
    }

    private Map<String, AttributeValue> filaNotaCredito(Factura f, NotaCredito nc) {
        Map<String, AttributeValue> fila = new LinkedHashMap<>();
        fila.put("PK", s("NC#" + nc.id()));
        fila.put("SK", s("META"));
        fila.put("tipo", s("NOTA_CREDITO"));
        fila.put("factura_id", s(f.id().toString()));
        fila.put("cliente_id", s(nc.clienteId().toString()));
        fila.put("total", n(nc.total().monto()));
        fila.put("moneda", s(f.moneda().name()));
        fila.put("motivo", s(nc.motivo() == null ? "" : nc.motivo()));
        fila.put("fecha", s(nc.fecha().toString()));
        fila.put("GSI1PK", s("CLI#" + nc.clienteId()));
        fila.put("GSI1SK", s(nc.fecha() + "#" + nc.id()));
        return fila;
    }

    private Map<String, AttributeValue> filaCobro(Factura f, Cobro c) {
        Map<String, AttributeValue> fila = new LinkedHashMap<>();
        fila.put("PK", s("FACT#" + f.id()));
        fila.put("SK", s("COBRO#" + c.id()));
        fila.put("cobro_id", s(c.id().toString()));
        fila.put("monto", n(c.monto().monto()));
        fila.put("moneda", s(f.moneda().name()));
        fila.put("fecha", s(c.fecha().toString()));
        if (c.referencia() != null) {
            fila.put("referencia", s(c.referencia()));
        }
        return fila;
    }

    private Map<String, AttributeValue> filaCabecera(Factura f) {
        Map<String, AttributeValue> fila = new LinkedHashMap<>();
        fila.put("PK", s("FACT#" + f.id()));
        fila.put("SK", s("META"));
        fila.put("tipo", s("FACTURA"));
        fila.put("cliente_id", s(f.clienteId().toString()));
        fila.put("campana_id", s(f.campanaId().toString()));
        fila.put("estado", s(f.estado().name().toLowerCase()));
        fila.put("moneda", s(f.moneda().name()));
        fila.put("subtotal", n(f.totales().subtotal().monto()));
        fila.put("impuestos", n(f.totales().impuestos().monto()));
        fila.put("total", n(f.totales().total().monto()));
        fila.put("saldo", n(f.saldo().monto()));
        fila.put("fecha_emision", s(f.fechaEmision().toString()));
        fila.put("fecha_vencimiento", s(f.fechaVencimiento().toString()));
        fila.put("version", AttributeValue.fromN(Long.toString(f.version())));
        fila.put("GSI1PK", s("CLI#" + f.clienteId()));
        fila.put("GSI1SK", s(f.fechaEmision() + "#" + f.id()));
        fila.put("GSI2PK", s("ESTADO#" + f.estado().name().toLowerCase()));
        fila.put("GSI2SK", s(f.fechaVencimiento() + "#" + f.id()));
        return fila;
    }

    private Map<String, AttributeValue> filaItem(Factura f, ItemFactura item) {
        Map<String, AttributeValue> fila = new LinkedHashMap<>();
        fila.put("PK", s("FACT#" + f.id()));
        fila.put("SK", s(String.format("ITEM#%03d", item.numero())));
        fila.put("numero", AttributeValue.fromN(Integer.toString(item.numero())));
        fila.put("descripcion", s(item.descripcion()));
        fila.put("cantidad", AttributeValue.fromN(Integer.toString(item.cantidad())));
        fila.put("precio_unitario", n(item.precioUnitario().monto()));
        fila.put("moneda", s(f.moneda().name()));
        return fila;
    }

    private Map<String, AttributeValue> filaIdempotencia(RegistroIdempotencia r) {
        Map<String, AttributeValue> fila = new LinkedHashMap<>();
        fila.put("PK", s("IDEMP#" + r.clave()));
        fila.put("SK", s("META"));
        fila.put("huella_solicitud", s(r.huellaSolicitud()));
        fila.put("respuesta", s(r.respuesta()));
        fila.put("estado", s("completado"));
        fila.put("vence_epoch", AttributeValue.fromN(Long.toString(r.venceEn().getEpochSecond())));
        return fila;
    }

    private Map<String, AttributeValue> filaSalida(EventoSalida e) {
        Map<String, Object> sobre = new LinkedHashMap<>();
        sobre.put("id_evento", e.idEvento().toString());
        sobre.put("tipo_evento", e.tipoEvento());
        sobre.put("version_esquema", 1);
        sobre.put("ocurrido_en", e.ocurridoEn().toString());
        sobre.put("agregado_id", e.agregadoId().toString());
        sobre.put("correlacion_id", e.correlacionId());
        sobre.put("carga", e.carga());
        String json;
        try {
            json = JSON.writeValueAsString(sobre);
        } catch (JsonProcessingException ex) {
            throw new IllegalStateException("No se pudo serializar el evento " + e.tipoEvento(), ex);
        }
        Map<String, AttributeValue> fila = new LinkedHashMap<>();
        fila.put("PK", s("SALIDA#" + e.idEvento()));
        fila.put("SK", s("META"));
        fila.put("tipo_evento", s(e.tipoEvento()));
        fila.put("agregado_id", s(e.agregadoId().toString()));
        fila.put("carga", s(json));
        fila.put("creado_en", s(e.ocurridoEn().toString()));
        fila.put(
                "vence_epoch",
                AttributeValue.fromN(Long.toString(e.ocurridoEn().getEpochSecond() + VIGENCIA_BANDEJA_SEGUNDOS)));
        return fila;
    }

    private TransactWriteItem poner(Map<String, AttributeValue> fila) {
        return TransactWriteItem.builder()
                .put(Put.builder()
                        .tableName(tabla)
                        .item(fila)
                        .conditionExpression("attribute_not_exists(PK)")
                        .build())
                .build();
    }

    private static Dinero dinero(Map<String, AttributeValue> fila, String campo, Moneda moneda) {
        return new Dinero(new BigDecimal(fila.get(campo).n()), moneda);
    }

    private static AttributeValue s(String valor) {
        return AttributeValue.fromS(valor);
    }

    private static AttributeValue n(BigDecimal valor) {
        return AttributeValue.fromN(valor.toPlainString());
    }
}
