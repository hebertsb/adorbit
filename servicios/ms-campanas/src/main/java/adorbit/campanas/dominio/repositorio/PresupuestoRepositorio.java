package adorbit.campanas.dominio.repositorio;

import adorbit.campanas.dominio.modelo.EstadoPresupuesto;
import adorbit.campanas.dominio.modelo.Presupuesto;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PresupuestoRepositorio extends JpaRepository<Presupuesto, UUID> {
    List<Presupuesto> findByCampanaId(UUID campanaId);
    Optional<Presupuesto> findFirstByCampanaIdAndEstadoInOrderByCreadoEnDesc(UUID campanaId, List<EstadoPresupuesto> estados);
    Optional<Presupuesto> findFirstByCampanaIdOrderByCreadoEnDesc(UUID campanaId);
}

