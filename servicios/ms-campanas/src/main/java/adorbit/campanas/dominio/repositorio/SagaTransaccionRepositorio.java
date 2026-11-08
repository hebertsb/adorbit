package adorbit.campanas.dominio.repositorio;

import adorbit.campanas.dominio.modelo.EstadoSaga;
import adorbit.campanas.dominio.modelo.SagaTransaccion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface SagaTransaccionRepositorio extends JpaRepository<SagaTransaccion, UUID> {
    Optional<SagaTransaccion> findByClaveIdempotencia(String claveIdempotencia);
    Optional<SagaTransaccion> findByCampanaIdAndEstadoIn(UUID campanaId, List<EstadoSaga> estados);

    @Query("SELECT s FROM SagaTransaccion s WHERE s.limiteEn < :ahora AND s.estado NOT IN (adorbit.campanas.dominio.modelo.EstadoSaga.completada, adorbit.campanas.dominio.modelo.EstadoSaga.compensando, adorbit.campanas.dominio.modelo.EstadoSaga.compensada, adorbit.campanas.dominio.modelo.EstadoSaga.rechazada, adorbit.campanas.dominio.modelo.EstadoSaga.fallida)")
    List<SagaTransaccion> findSagasVencidas(OffsetDateTime ahora);
}

