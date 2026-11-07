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
@Table(name = "saga_pasos")
public class SagaPaso {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @NotNull
    @Column(name = "saga_id", nullable = false)
    private UUID sagaId;

    @NotNull
    @Column(nullable = false)
    private Integer orden;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 12)
    private TipoPasoSaga tipo;

    @NotBlank
    @Size(max = 50)
    @Column(nullable = false, length = 50)
    private String servicio;

    @NotBlank
    @Size(max = 50)
    @Column(nullable = false, length = 50)
    private String accion;

    @NotBlank
    @Size(max = 120)
    @Column(name = "clave_comando", nullable = false, unique = true, length = 120)
    private String claveComando;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private EstadoPasoSaga estado = EstadoPasoSaga.pendiente;

    @Column(nullable = false)
    private Integer intentos = 0;

    // jsonb real (ver base_de_datos/ms-campanas.postgres.sql) -- mismo fix que
    // ClaveIdempotencia.respuesta, ver su comentario.
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    private String detalle;

    @Column(name = "creado_en", nullable = false, updatable = false)
    private OffsetDateTime creadoEn;

    @Column(name = "actualizado_en", nullable = false)
    private OffsetDateTime actualizadoEn;

    @PrePersist
    public void prePersist() {
        if (id == null) {
            id = UUID.randomUUID();
        }
        if (creadoEn == null) {
            creadoEn = OffsetDateTime.now();
        }
        actualizadoEn = OffsetDateTime.now();
        if (estado == null) {
            estado = EstadoPasoSaga.pendiente;
        }
        if (intentos == null) {
            intentos = 0;
        }
    }

    @PreUpdate
    public void preUpdate() {
        actualizadoEn = OffsetDateTime.now();
    }

    public SagaPaso() {
    }

    public SagaPaso(UUID sagaId, Integer orden, TipoPasoSaga tipo, String servicio, String accion, String claveComando) {
        this.sagaId = sagaId;
        this.orden = orden;
        this.tipo = tipo;
        this.servicio = servicio;
        this.accion = accion;
        this.claveComando = claveComando;
        this.estado = EstadoPasoSaga.pendiente;
        this.intentos = 0;
    }

    // Getters y Setters
    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public UUID getSagaId() {
        return sagaId;
    }

    public void setSagaId(UUID sagaId) {
        this.sagaId = sagaId;
    }

    public Integer getOrden() {
        return orden;
    }

    public void setOrden(Integer orden) {
        this.orden = orden;
    }

    public TipoPasoSaga getTipo() {
        return tipo;
    }

    public void setTipo(TipoPasoSaga tipo) {
        this.tipo = tipo;
    }

    public String getServicio() {
        return servicio;
    }

    public void setServicio(String servicio) {
        this.servicio = servicio;
    }

    public String getAccion() {
        return accion;
    }

    public void setAccion(String accion) {
        this.accion = accion;
    }

    public String getClaveComando() {
        return claveComando;
    }

    public void setClaveComando(String claveComando) {
        this.claveComando = claveComando;
    }

    public EstadoPasoSaga getEstado() {
        return estado;
    }

    public void setEstado(EstadoPasoSaga estado) {
        this.estado = estado;
    }

    public Integer getIntentos() {
        return intentos;
    }

    public void setIntentos(Integer intentos) {
        this.intentos = intentos;
    }

    public String getDetalle() {
        return detalle;
    }

    public void setDetalle(String detalle) {
        this.detalle = detalle;
    }

    public OffsetDateTime getCreadoEn() {
        return creadoEn;
    }

    public void setCreadoEn(OffsetDateTime creadoEn) {
        this.creadoEn = creadoEn;
    }

    public OffsetDateTime getActualizadoEn() {
        return actualizadoEn;
    }

    public void setActualizadoEn(OffsetDateTime actualizadoEn) {
        this.actualizadoEn = actualizadoEn;
    }
}

