package adorbit.campanas.infraestructura.configuracion;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
@EnableWebSecurity
public class ConfiguracionSeguridad {

    @Value("${spring.security.oauth2.resourceserver.jwt.issuer-uri:}")
    private String emisorOidc;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .csrf(AbstractHttpConfigurer::disable)
            .cors(AbstractHttpConfigurer::disable)
            .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/salud", "/listo", "/actuator/**", "/error").permitAll()
                .anyRequest().permitAll() // Permitimos el paso; si hay token JWT se valida opcionalmente
            );

        if (emisorOidc != null && !emisorOidc.trim().isEmpty()) {
            http.oauth2ResourceServer(oauth2 -> oauth2.jwt(jwt -> {}));
        }

        return http.build();
    }
}

