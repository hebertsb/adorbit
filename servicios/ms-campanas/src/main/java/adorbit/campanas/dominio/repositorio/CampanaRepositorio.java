package adorbit.campanas.dominio.repositorio;

import adorbit.campanas.dominio.modelo.Campana;
import adorbit.campanas.dominio.modelo.EstadoCampana;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface CampanaRepositorio extends JpaRepository<Campana, UUID> {
    Page<Campana> findByClienteId(UUID clienteId, Pageable pageable);
    Page<Campana> findByEstado(EstadoCampana estado, Pageable pageable);
    Page<Campana> findByClienteIdAndEstado(UUID clienteId, EstadoCampana estado, Pageable pageable);
}

