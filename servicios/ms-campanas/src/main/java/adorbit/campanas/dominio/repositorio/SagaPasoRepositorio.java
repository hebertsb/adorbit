package adorbit.campanas.dominio.repositorio;

import adorbit.campanas.dominio.modelo.SagaPaso;
import adorbit.campanas.dominio.modelo.TipoPasoSaga;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface SagaPasoRepositorio extends JpaRepository<SagaPaso, UUID> {
    List<SagaPaso> findBySagaIdOrderByOrdenAsc(UUID sagaId);
    Optional<SagaPaso> findByClaveComando(String claveComando);
    Optional<SagaPaso> findBySagaIdAndOrdenAndTipo(UUID sagaId, Integer orden, TipoPasoSaga tipo);
}

