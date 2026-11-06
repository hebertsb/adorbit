package adorbit.campanas.dominio.repositorio;

import adorbit.campanas.dominio.modelo.CalendarioMedio;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface CalendarioMedioRepositorio extends JpaRepository<CalendarioMedio, UUID> {
    List<CalendarioMedio> findByCampanaIdOrderByFechaInicioAsc(UUID campanaId);
}

