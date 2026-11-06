package adorbit.campanas.dominio.modelo;

import jakarta.persistence.*;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "presupuestos")
public class Presupuesto {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @NotNull
    @Column(name = "campana_id", nullable = false)
    private UUID campanaId;

    @NotNull
    @DecimalMin("0.00")
    @Column(name = "monto_total", nullable = false, precision = 14, scale = 2)
    private BigDecimal montoTotal;

    @NotNull
    @DecimalMin("0.00")
    @Column(name = "monto_gastado", nullable = false, precision = 14, scale = 2)
    private BigDecimal montoGastado = BigDecimal.ZERO;

    @NotNull
    @Column(nullable = false, length = 3)
    private String moneda = "BOB";

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 15)
    private EstadoPresupuesto estado = EstadoPresupuesto.borrador;

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
        if (montoGastado == null) {
            montoGastado = BigDecimal.ZERO;
        }
        if (estado == null) {
            estado = EstadoPresupuesto.borrador;
        }
        if (moneda == null) {
            moneda = "BOB";
        }
        validarInvariantes();
    }

    @PreUpdate
    public void preUpdate() {
        actualizadoEn = OffsetDateTime.now();
        validarInvariantes();
    }

    public void validarInvariantes() {
        if (montoTotal != null && montoGastado != null && montoGastado.compareTo(montoTotal) > 0) {
            throw new IllegalStateException("Invariante violada: monto_gastado (" + montoGastado +
                    ") no puede superar monto_total (" + montoTotal + ")");
        }
        if (moneda != null && !moneda.equals("BOB") && !moneda.equals("USD")) {
            throw new IllegalArgumentException("Moneda inválida. Solo se admite 'BOB' o 'USD'");
        }
    }

    public Presupuesto() {
    }

    public Presupuesto(UUID campanaId, BigDecimal montoTotal, String moneda) {
        this.campanaId = campanaId;
        this.montoTotal = montoTotal;
        this.montoGastado = BigDecimal.ZERO;
        this.moneda = moneda != null ? moneda : "BOB";
        this.estado = EstadoPresupuesto.borrador;
        validarInvariantes();
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
