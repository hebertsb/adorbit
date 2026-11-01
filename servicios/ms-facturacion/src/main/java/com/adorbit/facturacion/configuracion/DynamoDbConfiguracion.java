package com.adorbit.facturacion.configuracion;

import com.adorbit.facturacion.adaptador.salida.dynamodb.VerificadorAlmacenamientoDynamoDb;
import com.adorbit.facturacion.aplicacion.puerto.salida.VerificarAlmacenamientoPuerto;
import java.net.URI;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.dynamodb.DynamoDbClient;
import software.amazon.awssdk.services.dynamodb.DynamoDbClientBuilder;

@Configuration
public class DynamoDbConfiguracion {

    @Bean
    DynamoDbClient clienteDynamoDb(PropiedadesDynamoDb propiedades) {
        DynamoDbClientBuilder constructor = DynamoDbClient.builder().region(Region.of(propiedades.region()));
        if (propiedades.endpoint() != null && !propiedades.endpoint().isBlank()) {
            constructor.endpointOverride(URI.create(propiedades.endpoint()));
        }
        return constructor.build();
    }

    @Bean
    VerificarAlmacenamientoPuerto verificarAlmacenamiento(DynamoDbClient cliente, PropiedadesDynamoDb propiedades) {
        return new VerificadorAlmacenamientoDynamoDb(cliente, propiedades.tabla());
    }
}
