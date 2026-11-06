package adorbit.campanas.infraestructura.api;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.OffsetDateTime;
import java.util.HashMap;
import java.util.Map;

@RestController
public class SaludControlador {

    @GetMapping("/salud")
    public ResponseEntity<Map<String, Object>> salud() {
        Map<String, Object> respuesta = new HashMap<>();
        respuesta.put("estado", "ok");
        respuesta.put("servicio", "ms-campanas");
        respuesta.put("version", "1.0.0");
        respuesta.put("marca_tiempo", OffsetDateTime.now().toString());
        return ResponseEntity.ok(respuesta);
    }
}

