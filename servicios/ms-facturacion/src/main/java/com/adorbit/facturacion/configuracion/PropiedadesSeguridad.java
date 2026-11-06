package com.adorbit.facturacion.configuracion;

import java.util.List;
import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Parametros de seguridad: validacion del JWT de Keycloak y lista blanca de origenes CORS (los portales web).
 * Sin origenes configurados no se permite ningun origen distinto del propio.
 */
@ConfigurationProperties("adorbit.facturacion.seguridad")
public record PropiedadesSeguridad(String jwksUri, String emisor, String audiencia, List<String> corsOrigenes) {

    public PropiedadesSeguridad {
        corsOrigenes = corsOrigenes == null ? List.of() : List.copyOf(corsOrigenes);
    }
}
