package adorbit.campanas.infraestructura.api;

import adorbit.campanas.aplicacion.dto.SagaRespuestaDto;
import adorbit.campanas.aplicacion.servicios.SagaOrquestadorServicio;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1")
public class SagaControlador {

    private final SagaOrquestadorServicio sagaServicio;

    public SagaControlador(SagaOrquestadorServicio sagaServicio) {
        this.sagaServicio = sagaServicio;
    }

    @PostMapping("/campanas/{id}/contratar")
    public ResponseEntity<SagaRespuestaDto> contratarCampana(
            @PathVariable UUID id,
            @RequestHeader("Idempotency-Key") String claveIdempotencia) {
        SagaRespuestaDto respuesta = sagaServicio.iniciarContratacion(id, claveIdempotencia);
        return ResponseEntity.status(HttpStatus.ACCEPTED).body(respuesta);
    }

    @GetMapping("/sagas/{id}")
    public ResponseEntity<SagaRespuestaDto> obtenerEstadoSaga(@PathVariable UUID id) {
        return ResponseEntity.ok(sagaServicio.obtenerEstado(id));
    }
}

