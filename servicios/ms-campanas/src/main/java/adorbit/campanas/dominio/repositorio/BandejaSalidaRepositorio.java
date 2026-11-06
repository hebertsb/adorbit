package adorbit.campanas.dominio.repositorio;

import adorbit.campanas.dominio.modelo.BandejaSalidaEvento;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface BandejaSalidaRepositorio extends JpaRepository<BandejaSalidaEvento, UUID> {
    @Query("SELECT b FROM BandejaSalidaEvento b WHERE b.publicadoEn IS NULL ORDER BY b.secuencia ASC")
    List<BandejaSalidaEvento> findEventosPendientes();
}

