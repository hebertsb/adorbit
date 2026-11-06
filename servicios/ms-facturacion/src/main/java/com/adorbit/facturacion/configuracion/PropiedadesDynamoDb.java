package com.adorbit.facturacion.configuracion;

import org.springframework.boot.context.properties.ConfigurationProperties;

/** Parametros de conexion a DynamoDB. {@code endpoint} vacio = AWS real. */
@ConfigurationProperties("adorbit.facturacion.dynamodb")
public record PropiedadesDynamoDb(String region, String tabla, String endpoint) {}
