package adorbit.campanas.aplicacion.servicios;

import adorbit.campanas.aplicacion.dto.PresupuestoDto;
import adorbit.campanas.dominio.excepcion.RecursoNoEncontradoExcepcion;
import adorbit.campanas.dominio.modelo.EstadoPresupuesto;
import adorbit.campanas.dominio.modelo.Presupuesto;
import adorbit.campanas.dominio.repositorio.CampanaRepositorio;
import adorbit.campanas.dominio.repositorio.PresupuestoRepositorio;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.Arrays;
import java.util.Optional;
import java.util.UUID;

@Service
public class PresupuestoServicio {

    private final PresupuestoRepositorio presupuestoRepositorio;
    private final CampanaRepositorio campanaRepositorio;

    public PresupuestoServicio(PresupuestoRepositorio presupuestoRepositorio, CampanaRepositorio campanaRepositorio) {
        this.presupuestoRepositorio = presupuestoRepositorio;
        this.campanaRepositorio = campanaRepositorio;
    }

    @Transactional
    public PresupuestoDto asignarPresupuesto(UUID campanaId, PresupuestoDto dto) {
        if (!campanaRepositorio.existsById(campanaId)) {
            throw new RecursoNoEncontradoExcepcion("Campaña no encontrada: " + campanaId);
        }

        Optional<Presupuesto> existente = presupuestoRepositorio.findFirstByCampanaIdAndEstadoInOrderByCreadoEnDesc(
                campanaId,
                Arrays.asList(EstadoPresupuesto.borrador, EstadoPresupuesto.reservado, EstadoPresupuesto.consumido)
        );

        Presupuesto presupuesto;
        if (existente.isPresent()) {
            presupuesto = existente.get();
            presupuesto.setMontoTotal(dto.getMontoTotal());
            if (dto.getMoneda() != null) {
                presupuesto.setMoneda(dto.getMoneda());
            }
            if (dto.getMontoGastado() != null) {
                presupuesto.setMontoGastado(dto.getMontoGastado());
            }
        } else {
            presupuesto = new Presupuesto(campanaId, dto.getMontoTotal(), dto.getMoneda());
            if (dto.getMontoGastado() != null) {
                presupuesto.setMontoGastado(dto.getMontoGastado());
            }
        }

        presupuesto.validarInvariantes();
        Presupuesto guardado = presupuestoRepositorio.save(presupuesto);
        return PresupuestoDto.desdeEntidad(guardado);
    }

    @Transactional(readOnly = true)
    public PresupuestoDto obtenerPresupuesto(UUID campanaId) {
        if (!campanaRepositorio.existsById(campanaId)) {
            throw new RecursoNoEncontradoExcepcion("Campaña no encontrada: " + campanaId);
        }

        Presupuesto presupuesto = presupuestoRepositorio.findFirstByCampanaIdOrderByCreadoEnDesc(campanaId)
                .orElseThrow(() -> new RecursoNoEncontradoExcepcion("No existe presupuesto asignado a la campaña: " + campanaId));

        return PresupuestoDto.desdeEntidad(presupuesto);
    }
}

