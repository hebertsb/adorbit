package adorbit.campanas.dominio.modelo;

import jakarta.persistence.*;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "calendario_medios")
public class CalendarioMedio {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @NotNull
    @Column(name = "campana_id", nullable = false)
    private UUID campanaId;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private MedioPublicitario medio;

    @NotNull
    @Column(name = "fecha_inicio", nullable = false)
    private LocalDate fechaInicio;

    @NotNull
    @Column(name = "fecha_fin", nullable = false)
    private LocalDate fechaFin;

    @NotNull
    @DecimalMin("0.00")
    @Column(nullable = false, precision = 14, scale = 2)
    private BigDecimal costo = BigDecimal.ZERO;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 15)
    private EstadoMedio estado = EstadoMedio.planificado;

    @Version
    @Column(nullable = false)
    private Integer version;

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
        if (costo == null) {
            costo = BigDecimal.ZERO;
        }
        if (estado == null) {
            estado = EstadoMedio.planificado;
        }
        validarFechas();
    }

    @PreUpdate
    public void preUpdate() {
        actualizadoEn = OffsetDateTime.now();
        validarFechas();
    }

    public void validarFechas() {
        if (fechaInicio != null && fechaFin != null && fechaFin.isBefore(fechaInicio)) {
            throw new IllegalArgumentException("La fecha_fin del calendario no puede ser anterior a la fecha_inicio");
        }
    }

    public CalendarioMedio() {
    }

    public CalendarioMedio(UUID campanaId, MedioPublicitario medio, LocalDate fechaInicio, LocalDate fechaFin, BigDecimal costo) {
        this.campanaId = campanaId;
        this.medio = medio;
        this.fechaInicio = fechaInicio;
        this.fechaFin = fechaFin;
        this.costo = costo != null ? costo : BigDecimal.ZERO;
        this.estado = EstadoMedio.planificado;
        validarFechas();
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

    public MedioPublicitario getMedio() {
        return medio;
    }

    public void setMedio(MedioPublicitario medio) {
        this.medio = medio;
    }

    public LocalDate getFechaInicio() {
        return fechaInicio;
    }

    public void setFechaInicio(LocalDate fechaInicio) {
        this.fechaInicio = fechaInicio;
    }

    public LocalDate getFechaFin() {
        return fechaFin;
    }

    public void setFechaFin(LocalDate fechaFin) {
        this.fechaFin = fechaFin;
    }

    public BigDecimal getCosto() {
        return costo;
    }

    public void setCosto(BigDecimal costo) {
        this.costo = costo;
    }

    public EstadoMedio getEstado() {
        return estado;
    }

    public void setEstado(EstadoMedio estado) {
        this.estado = estado;
    }

    public Integer getVersion() {
        return version;
    }

    public void setVersion(Integer version) {
        this.version = version;
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
