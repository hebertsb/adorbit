package adorbit.campanas.infraestructura.configuracion;

import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;

import javax.sql.DataSource;
import java.net.URI;

@Configuration
@org.springframework.context.annotation.Profile("!test")
public class ConfiguracionBaseDatos {

    private static final Logger log = LoggerFactory.getLogger(ConfiguracionBaseDatos.class);

    @Value("${spring.datasource.url:}")
    private String urlPropiedad;

    @Value("${spring.datasource.username:}")
    private String usuarioPropiedad;

    @Value("${spring.datasource.password:}")
    private String contrasenaPropiedad;

    @Bean
    @Primary
    public DataSource dataSource() {
        HikariConfig config = new HikariConfig();

        String url = urlPropiedad;
        String usuario = usuarioPropiedad;
        String contrasena = contrasenaPropiedad;

        // Si la URL viene en formato URI postgresql://usuario:pass@host:puerto/bd
        if (url != null && url.startsWith("postgresql://")) {
            try {
                URI uri = URI.create(url);
                String host = uri.getHost();
                int puerto = uri.getPort() > 0 ? uri.getPort() : 5432;
                String ruta = uri.getPath();

                String jdbcUrl = "jdbc:postgresql://" + host + ":" + puerto + ruta;
                config.setJdbcUrl(jdbcUrl);

                if (uri.getUserInfo() != null) {
                    String[] partes = uri.getUserInfo().split(":", 2);
                    if (partes.length >= 1 && (usuario == null || usuario.isEmpty())) {
                        usuario = partes[0];
                    }
                    if (partes.length == 2 && (contrasena == null || contrasena.isEmpty())) {
                        contrasena = partes[1];
                    }
                }
                log.info("URL de PostgreSQL convertida automáticamente a formato JDBC: {}", jdbcUrl);
            } catch (Exception e) {
                log.warn("No se pudo parsear URI postgresql://, usando como JDBC directa: {}", e.getMessage());
                config.setJdbcUrl("jdbc:" + url);
            }
        } else {
            config.setJdbcUrl(url);
        }

        config.setUsername(usuario);
        config.setPassword(contrasena);
        config.setDriverClassName("org.postgresql.Driver");

        // Configuración de pool recomendada
        config.setMaximumPoolSize(5);
        config.setMinimumIdle(1);
        config.setConnectionTimeout(20000);

        // Si es H2 en tests
        if (url != null && url.contains("h2:mem")) {
            config.setDriverClassName("org.h2.Driver");
        }

        return new HikariDataSource(config);
    }
}
