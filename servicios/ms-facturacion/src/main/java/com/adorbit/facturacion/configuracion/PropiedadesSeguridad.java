package com.adorbit.facturacion.configuracion;

import org.springframework.boot.context.properties.ConfigurationProperties;

/** Parametros de validacion del JWT de Keycloak. */
@ConfigurationProperties("adorbit.facturacion.seguridad")
public record PropiedadesSeguridad(String jwksUri, String emisor, String audiencia) {}
