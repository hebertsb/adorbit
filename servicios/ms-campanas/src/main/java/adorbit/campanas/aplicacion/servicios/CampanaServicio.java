package adorbit.campanas.aplicacion.servicios;

import adorbit.campanas.aplicacion.dto.CampanaActualizarDto;
import adorbit.campanas.aplicacion.dto.CampanaCrearDto;
import adorbit.campanas.aplicacion.dto.CampanaRespuestaDto;
import adorbit.campanas.dominio.excepcion.ConflictoEdicionExcepcion;
import adorbit.campanas.dominio.excepcion.RecursoNoEncontradoExcepcion;
import adorbit.campanas.dominio.modelo.BandejaSalidaEvento;
import adorbit.campanas.dominio.modelo.Campana;
import adorbit.campanas.dominio.modelo.EstadoCampana;
import adorbit.campanas.dominio.repositorio.BandejaSalidaRepositorio;
import adorbit.campanas.dominio.repositorio.CampanaRepositorio;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Service
public class CampanaServicio {

    private final CampanaRepositorio campanaRepositorio;
    private final BandejaSalidaRepositorio bandejaSalidaRepositorio;
    private final ObjectMapper objectMapper;

    public CampanaServicio(CampanaRepositorio campanaRepositorio,
                           BandejaSalidaRepositorio bandejaSalidaRepositorio,
                           ObjectMapper objectMapper) {
        this.campanaRepositorio = campanaRepositorio;
        this.bandejaSalidaRepositorio = bandejaSalidaRepositorio;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public CampanaRespuestaDto crearCampana(CampanaCrearDto dto) {
        Campana campana = new Campana(
                dto.getClienteId(),
                dto.getNombre(),
                dto.getDescripcion(),
                dto.getFechaInicio(),
                dto.getFechaFin()
        );
        campana.validarFechas();
        Campana guardada = campanaRepositorio.save(campana);

        // Outbox transaccional: emitir evento CampanaCreada
        encolarEventoOutbox("Campana", guardada.getId(), "CampanaCreada", guardada);

        return CampanaRespuestaDto.desdeEntidad(guardada);
    }

    @Transactional
    public CampanaRespuestaDto actualizarCampana(UUID id, CampanaActualizarDto dto) {
        Campana campana = campanaRepositorio.findById(id)
                .orElseThrow(() -> new RecursoNoEncontradoExcepcion("Campaña no encontrada: " + id));

        // Control de concurrencia optimista (409 Conflict si la versión no coincide)
        if (dto.getVersion() != null && !dto.getVersion().equals(campana.getVersion())) {
            throw new ConflictoEdicionExcepcion("Conflicto de concurrencia: la versión provista (" +
                    dto.getVersion() + ") no coincide con la del servidor (" + campana.getVersion() + ")");
        }

        if (dto.getNombre() != null) campana.setNombre(dto.getNombre());
        if (dto.getDescripcion() != null) campana.setDescripcion(dto.getDescripcion());
        if (dto.getEstado() != null) campana.setEstado(dto.getEstado());
        if (dto.getFechaInicio() != null) campana.setFechaInicio(dto.getFechaInicio());
        if (dto.getFechaFin() != null) campana.setFechaFin(dto.getFechaFin());

        campana.validarFechas();
        Campana actualizada = campanaRepositorio.save(campana);

        // Outbox transaccional: emitir evento CampanaActualizada
        encolarEventoOutbox("Campana", actualizada.getId(), "CampanaActualizada", actualizada);

        return CampanaRespuestaDto.desdeEntidad(actualizada);
    }

    @Transactional(readOnly = true)
    public CampanaRespuestaDto obtenerPorId(UUID id) {
        Campana campana = campanaRepositorio.findById(id)
                .orElseThrow(() -> new RecursoNoEncontradoExcepcion("Campaña no encontrada: " + id));
        return CampanaRespuestaDto.desdeEntidad(campana);
    }

    @Transactional(readOnly = true)
    public Page<CampanaRespuestaDto> listarCampanas(UUID clienteId, EstadoCampana estado, Pageable pageable) {
        Page<Campana> pagina;
        if (clienteId != null && estado != null) {
            pagina = campanaRepositorio.findByClienteIdAndEstado(clienteId, estado, pageable);
        } else if (clienteId != null) {
            pagina = campanaRepositorio.findByClienteId(clienteId, pageable);
        } else if (estado != null) {
            pagina = campanaRepositorio.findByEstado(estado, pageable);
        } else {
            pagina = campanaRepositorio.findAll(pageable);
        }
        return pagina.map(CampanaRespuestaDto::desdeEntidad);
    }

    private void encolarEventoOutbox(String tipoAgregado, UUID agregadoId, String tipoEvento, Campana campana) {
        try {
            Map<String, Object> carga = new HashMap<>();
            carga.put("campana_id", campana.getId().toString());
            carga.put("cliente_id", campana.getClienteId().toString());
            carga.put("nombre", campana.getNombre());
            carga.put("estado", campana.getEstado().name());
            carga.put("fecha_inicio", campana.getFechaInicio() != null ? campana.getFechaInicio().toString() : null);
            carga.put("fecha_fin", campana.getFechaFin() != null ? campana.getFechaFin().toString() : null);
            carga.put("version", campana.getVersion());

            String jsonCarga = objectMapper.writeValueAsString(carga);
            BandejaSalidaEvento outbox = new BandejaSalidaEvento(tipoAgregado, agregadoId, tipoEvento, jsonCarga);
            bandejaSalidaRepositorio.save(outbox);
        } catch (JsonProcessingException e) {
            throw new RuntimeException("Error al serializar carga del evento outbox", e);
        }
    }
}

