package adorbit.campanas.infraestructura.api;

import adorbit.campanas.aplicacion.dto.*;
import adorbit.campanas.aplicacion.servicios.CalendarioServicio;
import adorbit.campanas.aplicacion.servicios.CampanaServicio;
import adorbit.campanas.aplicacion.servicios.PresupuestoServicio;
import adorbit.campanas.dominio.modelo.EstadoCampana;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.security.access.AccessDeniedException;

import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/campanas")
public class CampanaControlador {

    private final CampanaServicio campanaServicio;
    private final PresupuestoServicio presupuestoServicio;
    private final CalendarioServicio calendarioServicio;

    public CampanaControlador(CampanaServicio campanaServicio,
                              PresupuestoServicio presupuestoServicio,
                              CalendarioServicio calendarioServicio) {
        this.campanaServicio = campanaServicio;
        this.presupuestoServicio = presupuestoServicio;
        this.calendarioServicio = calendarioServicio;
    }

    @PostMapping
    public ResponseEntity<CampanaRespuestaDto> crearCampana(
            @RequestHeader("Idempotency-Key") String claveIdempotencia,
            @Valid @RequestBody CampanaCrearDto dto) {
        CampanaRespuestaDto respuesta = campanaServicio.crearCampana(dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(respuesta);
    }

    @GetMapping
    public ResponseEntity<Page<CampanaRespuestaDto>> listarCampanas(
            @RequestParam(required = false) UUID clienteId,
            @RequestParam(required = false) EstadoCampana estado,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            Authentication autenticacion) {
        if (size < 1 || size > 100 || page < 0) {
            throw new IllegalArgumentException("Paginacion fuera de rango");
        }
        UUID clienteToken = clienteDelToken(autenticacion);
        if (esCliente(autenticacion)) {
            if (clienteToken == null) {
                throw new AccessDeniedException("El token cliente_id es obligatorio y debe ser UUID");
            }
            clienteId = clienteToken;
        }
        PageRequest pageRequest = PageRequest.of(page, size, Sort.by("creadoEn").descending());
        return ResponseEntity.ok(campanaServicio.listarCampanas(clienteId, estado, pageRequest));
    }

    private UUID clienteDelToken(Authentication autenticacion) {
        if (!(autenticacion instanceof JwtAuthenticationToken jwt)) return null;
        Object valor = jwt.getToken().getClaims().get("cliente_id");
        if (valor == null) return null;
        try {
            return UUID.fromString(valor.toString());
        } catch (IllegalArgumentException ex) {
            return null;
        }
    }

    private boolean esCliente(Authentication autenticacion) {
        if (!(autenticacion instanceof JwtAuthenticationToken jwt)) return false;
        Object realm = jwt.getToken().getClaims().get("realm_access");
        Object roles = realm instanceof Map<?, ?> mapa ? mapa.get("roles") : null;
        return roles instanceof Collection<?> lista && lista.contains("cliente");
    }

    @GetMapping("/{id}")
    public ResponseEntity<CampanaRespuestaDto> obtenerCampana(@PathVariable UUID id, Authentication autenticacion) {
        UUID clienteToken = esCliente(autenticacion) ? clienteDelToken(autenticacion) : null;
        if (esCliente(autenticacion) && clienteToken == null) {
            throw new AccessDeniedException("El token cliente_id es obligatorio y debe ser UUID");
        }
        CampanaRespuestaDto respuesta = campanaServicio.obtenerPorId(id);
        if (esCliente(autenticacion) && !clienteToken.equals(respuesta.getClienteId())) {
            throw new AccessDeniedException("La campana no pertenece al cliente autenticado");
        }
        return ResponseEntity.ok(respuesta);
    }

    @PutMapping("/{id}")
    public ResponseEntity<CampanaRespuestaDto> actualizarCampana(
            @PathVariable UUID id,
            @Valid @RequestBody CampanaActualizarDto dto) {
        return ResponseEntity.ok(campanaServicio.actualizarCampana(id, dto));
    }

    @PostMapping("/{id}/presupuesto")
    public ResponseEntity<PresupuestoDto> asignarPresupuesto(
            @PathVariable UUID id,
            @Valid @RequestBody PresupuestoDto dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(presupuestoServicio.asignarPresupuesto(id, dto));
    }

    @GetMapping("/{id}/presupuesto")
    public ResponseEntity<PresupuestoDto> obtenerPresupuesto(@PathVariable UUID id) {
        return ResponseEntity.ok(presupuestoServicio.obtenerPresupuesto(id));
    }

    @PostMapping("/{id}/calendario")
    public ResponseEntity<CalendarioMedioDto> agregarMedio(
            @PathVariable UUID id,
            @Valid @RequestBody CalendarioMedioDto dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(calendarioServicio.agregarMedio(id, dto));
    }

    @GetMapping("/{id}/calendario")
    public ResponseEntity<List<CalendarioMedioDto>> listarCalendario(@PathVariable UUID id) {
        return ResponseEntity.ok(calendarioServicio.listarPorCampana(id));
    }
}

