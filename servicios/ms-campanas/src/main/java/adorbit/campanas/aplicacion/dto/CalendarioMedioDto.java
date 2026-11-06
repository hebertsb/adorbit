package adorbit.campanas.aplicacion.dto;

import adorbit.campanas.dominio.modelo.CalendarioMedio;
import adorbit.campanas.dominio.modelo.EstadoMedio;
import adorbit.campanas.dominio.modelo.MedioPublicitario;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

public class CalendarioMedioDto {

    private UUID id;
    private UUID campanaId;

    @NotNull(message = "El medio es obligatorio (tv, radio, digital, redes, vallas, prensa)")
    private MedioPublicitario medio;

    @NotNull(message = "La fecha_inicio es obligatoria")
    private LocalDate fechaInicio;

    @NotNull(message = "La fecha_fin es obligatoria")
    private LocalDate fechaFin;

    @NotNull(message = "El costo es obligatorio")
    @DecimalMin(value = "0.00", message = "El costo no puede ser negativo")
    private BigDecimal costo;

    private EstadoMedio estado;
    private Integer version;
    private OffsetDateTime creadoEn;
    private OffsetDateTime actualizadoEn;

    public static CalendarioMedioDto desdeEntidad(CalendarioMedio c) {
        CalendarioMedioDto dto = new CalendarioMedioDto();
        dto.setId(c.getId());
        dto.setCampanaId(c.getCampanaId());
        dto.setMedio(c.getMedio());
        dto.setFechaInicio(c.getFechaInicio());
        dto.setFechaFin(c.getFechaFin());
        dto.setCosto(c.getCosto());
        dto.setEstado(c.getEstado());
        dto.setVersion(c.getVersion());
        dto.setCreadoEn(c.getCreadoEn());
        dto.setActualizadoEn(c.getActualizadoEn());
        return dto;
    }

    public CalendarioMedioDto() {
    }

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

