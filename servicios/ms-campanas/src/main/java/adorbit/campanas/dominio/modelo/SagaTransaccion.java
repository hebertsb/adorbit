package adorbit.campanas.dominio.modelo;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "saga_transacciones")
public class SagaTransaccion {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @NotNull
    @Column(name = "campana_id", nullable = false)
    private UUID campanaId;

    @NotNull
    @Column(name = "clave_idempotencia", nullable = false, unique = true, length = 100)
    private String claveIdempotencia;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private EstadoSaga estado = EstadoSaga.iniciada;

    @Column(name = "paso_actual", nullable = false)
    private Integer pasoActual = 1;

    @Column(name = "motivo_fallo", columnDefinition = "TEXT")
    private String motivoFallo;

    @Column(columnDefinition = "TEXT")
    private String carga;

    @Version
    @Column(nullable = false)
    private Integer version;

    @Column(name = "limite_en", nullable = false)
    private OffsetDateTime limiteEn;

    @Column(name = "creado_en", nullable = false, updatable = false)
    private OffsetDateTime creadoEn;

    @Column(name = "actualizado_en", nullable = false)
    private OffsetDateTime actualizadoEn;

    @PrePersist
    public void prePersist() {
        if (creadoEn == null) {
            creadoEn = OffsetDateTime.now();
        }
        actualizadoEn = OffsetDateTime.now();
        if (limiteEn == null) {
            limiteEn = OffsetDateTime.now().plusMinutes(10);
        }
        if (estado == null) {
            estado = EstadoSaga.iniciada;
        }
        if (pasoActual == null) {
            pasoActual = 1;
        }
    }

    @PreUpdate
    public void preUpdate() {
        actualizadoEn = OffsetDateTime.now();
    }

    public SagaTransaccion() {
    }

    public SagaTransaccion(UUID campanaId, String claveIdempotencia, String carga) {
        this.campanaId = campanaId;
        this.claveIdempotencia = claveIdempotencia;
        this.carga = carga;
        this.estado = EstadoSaga.iniciada;
        this.pasoActual = 1;
        this.limiteEn = OffsetDateTime.now().plusMinutes(10);
    }

    // Getters y Setters
    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public UUID getCampanaId() {
        return campanaId;
    }

    public void setCampanaId(UUID campanaId) {
        this.campanaId = campanaId;
    }

    public String getClaveIdempotencia() {
        return claveIdempotencia;
    }

    public void setClaveIdempotencia(String claveIdempotencia) {
        this.claveIdempotencia = claveIdempotencia;
    }

    public EstadoSaga getEstado() {
        return estado;
    }

    public void setEstado(EstadoSaga estado) {
        this.estado = estado;
    }

    public Integer getPasoActual() {
        return pasoActual;
    }

    public void setPasoActual(Integer pasoActual) {
        this.pasoActual = pasoActual;
    }

    public String getMotivoFallo() {
        return motivoFallo;
    }

    public void setMotivoFallo(String motivoFallo) {
        this.motivoFallo = motivoFallo;
    }

    public String getCarga() {
        return carga;
    }

    public void setCarga(String carga) {
        this.carga = carga;
    }

    public Integer getVersion() {
        return version;
    }

    public void setVersion(Integer version) {
        this.version = version;
    }

    public OffsetDateTime getLimiteEn() {
        return limiteEn;
    }

    public void setLimiteEn(OffsetDateTime limiteEn) {
        this.limiteEn = limiteEn;
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
