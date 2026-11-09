package adorbit.campanas.infraestructura.configuracion;

import java.util.Collection;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;
import org.springframework.security.authorization.AuthorizationDecision;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidatorResult;
import org.springframework.security.oauth2.jwt.BadJwtException;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtValidators;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
public class SeguridadBandeja {
    static OAuth2TokenValidator<Jwt> validadores(String emisor, String audiencia) {
        OAuth2TokenValidator<Jwt> audienciaValida = jwt ->
                jwt.getAudience() != null && jwt.getAudience().contains(audiencia)
                        ? OAuth2TokenValidatorResult.success()
                        : OAuth2TokenValidatorResult.failure(new OAuth2Error("invalid_token"));
        OAuth2TokenValidator<Jwt> expiracionObligatoria = jwt ->
                jwt.getExpiresAt() != null
                        ? OAuth2TokenValidatorResult.success()
                        : OAuth2TokenValidatorResult.failure(new OAuth2Error("invalid_token"));
        return new DelegatingOAuth2TokenValidator<>(JwtValidators.createDefaultWithIssuer(emisor),
                audienciaValida, expiracionObligatoria);
    }

    @Bean
    JwtDecoder decodificadorJwt(
            @Value("${spring.security.oauth2.resourceserver.jwt.issuer-uri:}") String emisor,
            @Value("${ADORBIT_CAMPANAS_AUDIENCIA_JWT:}") String audiencia,
            @Value("${spring.security.oauth2.resourceserver.jwt.jwk-set-uri:}") String jwks) {
        return new JwtDecoder() {
            private volatile NimbusJwtDecoder delegado;

            @Override
            public Jwt decode(String token) {
                if (emisor.isBlank() || audiencia.isBlank() || jwks.isBlank()) {
                    throw new BadJwtException("Validacion JWT no configurada");
                }
                try {
                    if (delegado == null) {
                        synchronized (this) {
                            if (delegado == null) {
                                NimbusJwtDecoder nuevo = NimbusJwtDecoder.withJwkSetUri(jwks).build();
                                nuevo.setJwtValidator(validadores(emisor, audiencia));
                                delegado = nuevo;
                            }
                        }
                    }
                    return delegado.decode(token);
                } catch (Exception ex) {
                    throw new BadJwtException("JWT invalido", ex);
                }
            }
        };
    }

    @Bean
    @Order(1)
    SecurityFilterChain seguridadInterna(HttpSecurity http, JwtDecoder decodificador) throws Exception {
        http.securityMatcher("/api/v1/interno/bandeja-salida/**")
            .csrf(csrf -> csrf.disable())
            .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth.anyRequest().access((autenticacion, contexto) -> {
                if (!(autenticacion.get() instanceof JwtAuthenticationToken jwt)) {
                    return new AuthorizationDecision(false);
                }
                Object realm = jwt.getToken().getClaims().get("realm_access");
                Object roles = realm instanceof Map<?, ?> mapa ? mapa.get("roles") : null;
                return new AuthorizationDecision(roles instanceof Collection<?> lista && lista.contains("gerente"));
            }))
            .oauth2ResourceServer(oauth -> oauth.jwt(jwt -> jwt.decoder(decodificador)));
        return http.build();
    }
}
