package adorbit.campanas.dominio.modelo;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.OffsetDateTime;

@Entity
@Table(name = "claves_idempotencia")
public class ClaveIdempotencia {

    @Id
    @NotBlank
    @Size(max = 120)
    @Column(nullable = false, length = 120)
    private String clave;

    @NotBlank
    @Size(min = 64, max = 64)
    @Column(name = "huella_solicitud", nullable = false, length = 64)
    private String huellaSolicitud;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 12)
    private EstadoIdempotencia estado = EstadoIdempotencia.EN_CURSO;

    @Column(name = "codigo_estado")
    private Integer codigoEstado;

    @Column(columnDefinition = "TEXT")
    private String respuesta;

    @Column(name = "creado_en", nullable = false, updatable = false)
    private OffsetDateTime creadoEn;

    @Column(name = "vence_en", nullable = false)
    private OffsetDateTime venceEn;

    @PrePersist
    public void prePersist() {
        if (creadoEn == null) {
            creadoEn = OffsetDateTime.now();
        }
        if (venceEn == null) {
            venceEn = OffsetDateTime.now().plusDays(14);
        }
        if (estado == null) {
            estado = EstadoIdempotencia.EN_CURSO;
        }
    }

    public ClaveIdempotencia() {
    }

    public ClaveIdempotencia(String clave, String huellaSolicitud) {
        this.clave = clave;
        this.huellaSolicitud = huellaSolicitud;
        this.estado = EstadoIdempotencia.EN_CURSO;
        this.creadoEn = OffsetDateTime.now();
        this.venceEn = OffsetDateTime.now().plusDays(14);
    }

    public void marcarCompletado(int codigoEstado, String respuesta) {
        this.estado = EstadoIdempotencia.COMPLETADO;
        this.codigoEstado = codigoEstado;
        this.respuesta = respuesta;
    }

    // Getters y Setters
    public String getClave() {
        return clave;
    }

    public void setClave(String clave) {
        this.clave = clave;
    }

    public String getHuellaSolicitud() {
        return huellaSolicitud;
    }

    public void setHuellaSolicitud(String huellaSolicitud) {
        this.huellaSolicitud = huellaSolicitud;
    }

    public EstadoIdempotencia getEstado() {
        return estado;
    }

    public void setEstado(EstadoIdempotencia estado) {
        this.estado = estado;
    }

    public Integer getCodigoEstado() {
        return codigoEstado;
    }

    public void setCodigoEstado(Integer codigoEstado) {
        this.codigoEstado = codigoEstado;
    }

    public String getRespuesta() {
        return respuesta;
    }

    public void setRespuesta(String respuesta) {
        this.respuesta = respuesta;
    }

    public OffsetDateTime getCreadoEn() {
        return creadoEn;
    }

    public void setCreadoEn(OffsetDateTime creadoEn) {
        this.creadoEn = creadoEn;
    }

    public OffsetDateTime getVenceEn() {
        return venceEn;
    }

    public void setVenceEn(OffsetDateTime venceEn) {
        this.venceEn = venceEn;
    }
}

