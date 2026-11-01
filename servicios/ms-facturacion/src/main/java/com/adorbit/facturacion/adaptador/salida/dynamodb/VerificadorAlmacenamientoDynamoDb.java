package com.adorbit.facturacion.adaptador.salida.dynamodb;

import com.adorbit.facturacion.aplicacion.puerto.salida.VerificarAlmacenamientoPuerto;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import software.amazon.awssdk.services.dynamodb.DynamoDbClient;
import software.amazon.awssdk.services.dynamodb.model.TableStatus;

/** Adaptador de salida: la tabla de facturacion existe y esta activa en DynamoDB. */
public class VerificadorAlmacenamientoDynamoDb implements VerificarAlmacenamientoPuerto {

    private static final Logger LOG = LoggerFactory.getLogger(VerificadorAlmacenamientoDynamoDb.class);

    private final DynamoDbClient cliente;
    private final String tabla;

    public VerificadorAlmacenamientoDynamoDb(DynamoDbClient cliente, String tabla) {
        this.cliente = cliente;
        this.tabla = tabla;
    }

    @Override
    public boolean estaDisponible() {
        try {
            var estado = cliente.describeTable(r -> r.tableName(tabla)).table().tableStatus();
            return estado == TableStatus.ACTIVE;
        } catch (RuntimeException e) {
            LOG.warn("DynamoDB no disponible: {}", e.getClass().getSimpleName());
            return false;
        }
    }
}
