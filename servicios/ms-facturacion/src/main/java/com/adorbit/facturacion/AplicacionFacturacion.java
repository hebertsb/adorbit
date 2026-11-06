package com.adorbit.facturacion;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

/** Punto de arranque de ms-facturacion. */
@SpringBootApplication
@ConfigurationPropertiesScan
public class AplicacionFacturacion {

    public static void main(String[] args) {
        SpringApplication.run(AplicacionFacturacion.class, args);
    }
}
