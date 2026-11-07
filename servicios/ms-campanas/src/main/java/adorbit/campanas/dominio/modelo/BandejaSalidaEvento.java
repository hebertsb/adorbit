package adorbit.campanas.dominio.modelo;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "bandeja_salida_eventos")
public class BandejaSalidaEvento {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(name = "secuencia", insertable = false, updatable = false)
    private Long secuencia;

    @NotBlank
    @Size(max = 40)
    @Column(name = "tipo_agregado", nullable = false, length = 40)
    private String tipoAgregado;

    @NotNull
    @Column(name = "agregado_id", nullable = false)
    private UUID agregadoId;

    @NotBlank
    @Size(max = 80)
    @Column(name = "tipo_evento", nullable = false, length = 80)
    private String tipoEvento;

    // jsonb real (ver base_de_datos/ms-campanas.postgres.sql) -- mismo fix que
    // ClaveIdempotencia.respuesta, ver su comentario.
    @NotBlank
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(nullable = false, columnDefinition = "jsonb")
    private String carga;

    @Column(name = "creado_en", nullable = false, updatable = false)
    private OffsetDateTime creadoEn;

    @Column(name = "publicado_en")
    private OffsetDateTime publicadoEn;

    @PrePersist
    public void prePersist() {
        if (id == null) {
            id = UUID.randomUUID();
        }
        if (creadoEn == null) {
            creadoEn = OffsetDateTime.now();
        }
    }

    public BandejaSalidaEvento() {
    }

    public BandejaSalidaEvento(String tipoAgregado, UUID agregadoId, String tipoEvento, String carga) {
        this.tipoAgregado = tipoAgregado;
        this.agregadoId = agregadoId;
        this.tipoEvento = tipoEvento;
        this.carga = carga;
        this.creadoEn = OffsetDateTime.now();
    }

    public void marcarPublicado() {
        this.publicadoEn = OffsetDateTime.now();
    }

    // Getters y Setters
    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public Long getSecuencia() {
        return secuencia;
    }

    public void setSecuencia(Long secuencia) {
        this.secuencia = secuencia;
    }

    public String getTipoAgregado() {
        return tipoAgregado;
    }

    public void setTipoAgregado(String tipoAgregado) {
        this.tipoAgregado = tipoAgregado;
    }

    public UUID getAgregadoId() {
        return agregadoId;
    }

    public void setAgregadoId(UUID agregadoId) {
        this.agregadoId = agregadoId;
    }

    public String getTipoEvento() {
        return tipoEvento;
    }

    public void setTipoEvento(String tipoEvento) {
        this.tipoEvento = tipoEvento;
    }

    public String getCarga() {
        return carga;
    }

    public void setCarga(String carga) {
        this.carga = carga;
    }

    public OffsetDateTime getCreadoEn() {
        return creadoEn;
    }

    public void setCreadoEn(OffsetDateTime creadoEn) {
        this.creadoEn = creadoEn;
    }

    public OffsetDateTime getPublicadoEn() {
        return publicadoEn;
    }

    public void setPublicadoEn(OffsetDateTime publicadoEn) {
        this.publicadoEn = publicadoEn;
    }
}
