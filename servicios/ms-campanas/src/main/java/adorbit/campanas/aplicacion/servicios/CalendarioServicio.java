package adorbit.campanas.aplicacion.servicios;

import adorbit.campanas.aplicacion.dto.CalendarioMedioDto;
import adorbit.campanas.dominio.excepcion.RecursoNoEncontradoExcepcion;
import adorbit.campanas.dominio.modelo.CalendarioMedio;
import adorbit.campanas.dominio.repositorio.CalendarioMedioRepositorio;
import adorbit.campanas.dominio.repositorio.CampanaRepositorio;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class CalendarioServicio {

    private final CalendarioMedioRepositorio calendarioRepositorio;
    private final CampanaRepositorio campanaRepositorio;

    public CalendarioServicio(CalendarioMedioRepositorio calendarioRepositorio, CampanaRepositorio campanaRepositorio) {
        this.calendarioRepositorio = calendarioRepositorio;
        this.campanaRepositorio = campanaRepositorio;
    }

    @Transactional
    public CalendarioMedioDto agregarMedio(UUID campanaId, CalendarioMedioDto dto) {
        if (!campanaRepositorio.existsById(campanaId)) {
            throw new RecursoNoEncontradoExcepcion("Campaña no encontrada: " + campanaId);
        }

        CalendarioMedio medio = new CalendarioMedio(
                campanaId,
                dto.getMedio(),
                dto.getFechaInicio(),
                dto.getFechaFin(),
                dto.getCosto()
        );
        medio.validarFechas();
        CalendarioMedio guardado = calendarioRepositorio.save(medio);
        return CalendarioMedioDto.desdeEntidad(guardado);
    }

    @Transactional(readOnly = true)
    public List<CalendarioMedioDto> listarPorCampana(UUID campanaId) {
        if (!campanaRepositorio.existsById(campanaId)) {
            throw new RecursoNoEncontradoExcepcion("Campaña no encontrada: " + campanaId);
        }

        return calendarioRepositorio.findByCampanaIdOrderByFechaInicioAsc(campanaId)
                .stream()
                .map(CalendarioMedioDto::desdeEntidad)
                .collect(Collectors.toList());
    }
}

