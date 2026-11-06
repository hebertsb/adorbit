package adorbit.campanas.aplicacion.dto;

import adorbit.campanas.dominio.modelo.EstadoPresupuesto;
import adorbit.campanas.dominio.modelo.Presupuesto;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

public class PresupuestoDto {

    private UUID id;
    private UUID campanaId;

    @NotNull(message = "El monto_total es obligatorio")
    @DecimalMin(value = "0.00", message = "El monto_total no puede ser negativo")
    private BigDecimal montoTotal;

    private BigDecimal montoGastado;

    @Pattern(regexp = "^(BOB|USD)$", message = "La moneda solo puede ser BOB o USD")
    private String moneda = "BOB";

    private EstadoPresupuesto estado;
    private Integer version;
    private OffsetDateTime creadoEn;
    private OffsetDateTime actualizadoEn;

    public static PresupuestoDto desdeEntidad(Presupuesto p) {
        PresupuestoDto dto = new PresupuestoDto();
        dto.setId(p.getId());
        dto.setCampanaId(p.getCampanaId());
        dto.setMontoTotal(p.getMontoTotal());
        dto.setMontoGastado(p.getMontoGastado());
        dto.setMoneda(p.getMoneda());
        dto.setEstado(p.getEstado());
        dto.setVersion(p.getVersion());
        dto.setCreadoEn(p.getCreadoEn());
        dto.setActualizadoEn(p.getActualizadoEn());
        return dto;
    }

    public PresupuestoDto() {
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

    public BigDecimal getMontoTotal() {
        return montoTotal;
    }

    public void setMontoTotal(BigDecimal montoTotal) {
        this.montoTotal = montoTotal;
    }

    public BigDecimal getMontoGastado() {
        return montoGastado;
    }

    public void setMontoGastado(BigDecimal montoGastado) {
        this.montoGastado = montoGastado;
    }

    public String getMoneda() {
        return moneda;
    }

    public void setMoneda(String moneda) {
        this.moneda = moneda;
    }

    public EstadoPresupuesto getEstado() {
        return estado;
    }

    public void setEstado(EstadoPresupuesto estado) {
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

