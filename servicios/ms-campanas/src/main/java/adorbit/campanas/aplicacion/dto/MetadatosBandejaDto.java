package adorbit.campanas.aplicacion.dto;

import java.time.OffsetDateTime;
import java.util.UUID;

/** Metadatos de un evento pendiente, sin su carga. */
public record MetadatosBandejaDto(UUID id, Long secuencia, String tipoAgregado,
        UUID agregadoId, String tipoEvento, OffsetDateTime creadoEn) { }
