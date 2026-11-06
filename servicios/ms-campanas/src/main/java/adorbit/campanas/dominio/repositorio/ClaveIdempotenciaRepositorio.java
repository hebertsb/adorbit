package adorbit.campanas.dominio.repositorio;

import adorbit.campanas.dominio.modelo.ClaveIdempotencia;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ClaveIdempotenciaRepositorio extends JpaRepository<ClaveIdempotencia, String> {
    Optional<ClaveIdempotencia> findByClave(String clave);
}

