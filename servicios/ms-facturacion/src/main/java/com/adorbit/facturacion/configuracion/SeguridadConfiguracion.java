package com.adorbit.facturacion.configuracion;

import java.util.Collection;
import java.util.List;
import java.util.Map;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidatorResult;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtValidators;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.web.SecurityFilterChain;

/** JWT de Keycloak: firma, expiracion, emisor, audiencia y roles ({@code realm_access.roles}). */
@Configuration
public class SeguridadConfiguracion {

    @Bean
    SecurityFilterChain cadenaSeguridad(HttpSecurity http) throws Exception {
        http.csrf(csrf -> csrf.disable())
                .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(a -> a.requestMatchers("/salud", "/listo")
                        .permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/v1/facturas", "/api/v1/facturas/*")
                        .hasAnyRole("ejecutivo", "gerente", "cliente")
                        .requestMatchers("/api/v1/**")
                        .hasAnyRole("ejecutivo", "gerente")
                        .anyRequest()
                        .denyAll())
                .oauth2ResourceServer(o -> o.jwt(j -> j.jwtAuthenticationConverter(convertidorRoles())));
        return http.build();
    }

    @Bean
    JwtDecoder decodificadorJwt(PropiedadesSeguridad propiedades) {
        NimbusJwtDecoder decodificador =
                NimbusJwtDecoder.withJwkSetUri(propiedades.jwksUri()).build();
        decodificador.setJwtValidator(new DelegatingOAuth2TokenValidator<>(
                JwtValidators.createDefaultWithIssuer(propiedades.emisor()), validadorAudiencia(propiedades)));
        return decodificador;
    }

    static OAuth2TokenValidator<Jwt> validadorAudiencia(PropiedadesSeguridad propiedades) {
        return jwt -> jwt.getAudience().contains(propiedades.audiencia())
                ? OAuth2TokenValidatorResult.success()
                : OAuth2TokenValidatorResult.failure(new OAuth2Error("token_invalido", "Audiencia no permitida", null));
    }

    static JwtAuthenticationConverter convertidorRoles() {
        JwtAuthenticationConverter convertidor = new JwtAuthenticationConverter();
        convertidor.setJwtGrantedAuthoritiesConverter(SeguridadConfiguracion::extraerRoles);
        return convertidor;
    }

    private static Collection<GrantedAuthority> extraerRoles(Jwt jwt) {
        Object acceso = jwt.getClaim("realm_access");
        if (acceso instanceof Map<?, ?> mapa && mapa.get("roles") instanceof List<?> roles) {
            return roles.stream()
                    .map(rol -> (GrantedAuthority) new SimpleGrantedAuthority("ROLE_" + rol))
                    .toList();
        }
        return List.of();
    }
}
