package adorbit.campanas.infraestructura.api;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import javax.sql.DataSource;
import java.sql.Connection;
import java.time.OffsetDateTime;
import java.util.HashMap;
import java.util.Map;

@RestController
public class ListoControlador {

    private final DataSource dataSource;

    public ListoControlador(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    @GetMapping("/listo")
    public ResponseEntity<Map<String, Object>> listo() {
        Map<String, Object> respuesta = new HashMap<>();
        respuesta.put("servicio", "ms-campanas");
        respuesta.put("marca_tiempo", OffsetDateTime.now().toString());

        boolean bdOk = false;
        try (Connection conn = dataSource.getConnection()) {
            bdOk = conn.isValid(2);
        } catch (Exception ignored) {
        }

        respuesta.put("base_de_datos", bdOk ? "conectada" : "desconectada");
        respuesta.put("estado", bdOk ? "listo" : "degradado");

        return bdOk ? ResponseEntity.ok(respuesta) : ResponseEntity.status(503).body(respuesta);
    }
}

