package adorbit.campanas.dominio.repositorio;

import adorbit.campanas.dominio.modelo.BandejaSalidaEvento;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface BandejaSalidaRepositorio extends JpaRepository<BandejaSalidaEvento, UUID> {
    @Query("SELECT new adorbit.campanas.aplicacion.dto.MetadatosBandejaDto(b.id, b.secuencia, b.tipoAgregado, b.agregadoId, b.tipoEvento, b.creadoEn) FROM BandejaSalidaEvento b WHERE b.publicadoEn IS NULL AND (b.secuencia > :cursor OR (b.secuencia = :cursor AND b.id > :id)) ORDER BY b.secuencia ASC, b.id ASC")
    org.springframework.data.domain.Slice<adorbit.campanas.aplicacion.dto.MetadatosBandejaDto> consultarMetadatosPendientes(@org.springframework.data.repository.query.Param("cursor") Long cursor, @org.springframework.data.repository.query.Param("id") UUID id, org.springframework.data.domain.Pageable pagina);

    @Query("SELECT b FROM BandejaSalidaEvento b WHERE b.publicadoEn IS NULL ORDER BY b.secuencia ASC")
    List<BandejaSalidaEvento> findEventosPendientes();
}

