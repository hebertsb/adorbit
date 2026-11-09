package adorbit.campanas.infraestructura.configuracion;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.access.intercept.AuthorizationFilter;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import adorbit.campanas.infraestructura.idempotencia.FiltroIdempotencia;
import org.springframework.security.authorization.AuthorizationDecision;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import java.util.Collection;
import java.util.Map;
import org.springframework.http.HttpMethod;

@Configuration
@EnableWebSecurity
public class ConfiguracionSeguridad {

    @Bean
    FilterRegistrationBean<FiltroIdempotencia> registroIdempotencia(FiltroIdempotencia filtro) {
        FilterRegistrationBean<FiltroIdempotencia> registro = new FilterRegistrationBean<>(filtro);
        registro.setEnabled(false);
        return registro;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http, FiltroIdempotencia filtro) throws Exception {
        http
            .csrf(AbstractHttpConfigurer::disable)
            .cors(AbstractHttpConfigurer::disable)
            .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/salud", "/listo", "/actuator/**", "/error").permitAll()
                .requestMatchers("/api/v1/campanas/**", "/api/v1/sagas/**").access((autenticacion, contexto) -> {
                    if (!(autenticacion.get() instanceof JwtAuthenticationToken jwt)) {
                        return new AuthorizationDecision(false);
                    }
                    Object realm = jwt.getToken().getClaims().get("realm_access");
                    Object roles = realm instanceof Map<?, ?> mapa ? mapa.get("roles") : null;
                    boolean interno = tieneRol(roles, "ejecutivo") || tieneRol(roles, "gerente");
                    boolean clienteSoloLectura = tieneRol(roles, "cliente")
                            && contexto.getRequest().getMethod().equals(HttpMethod.GET.name())
                            && consultaCampanaBasica(contexto.getRequest().getRequestURI());
                    return new AuthorizationDecision(interno || clienteSoloLectura);
                })
                .anyRequest().denyAll()
            )
            .oauth2ResourceServer(oauth2 -> oauth2.jwt(jwt -> {}))
            .addFilterAfter(filtro, AuthorizationFilter.class);

        return http.build();
    }

    private static boolean tieneRol(Object roles, String rol) {
        return roles instanceof Collection<?> lista && lista.contains(rol);
    }

    private static boolean consultaCampanaBasica(String ruta) {
        return ruta.equals("/api/v1/campanas") || ruta.matches("/api/v1/campanas/[0-9a-fA-F-]{36}");
    }
}

