package adorbit.campanas.dominio.modelo;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "campanas")
public class Campana {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @NotNull
    @Column(name = "cliente_id", nullable = false)
    private UUID clienteId;

    @NotBlank
    @Size(max = 200)
    @Column(nullable = false, length = 200)
    private String nombre;

    @Column(columnDefinition = "TEXT")
    private String descripcion;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 25)
    private EstadoCampana estado = EstadoCampana.borrador;

    @Column(name = "fecha_inicio")
    private LocalDate fechaInicio;

    @Column(name = "fecha_fin")
    private LocalDate fechaFin;

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
        if (estado == null) {
            estado = EstadoCampana.borrador;
        }
    }

    @PreUpdate
    public void preUpdate() {
        actualizadoEn = OffsetDateTime.now();
    }

    public Campana() {
    }

    public Campana(UUID clienteId, String nombre, String descripcion, LocalDate fechaInicio, LocalDate fechaFin) {
        this.clienteId = clienteId;
        this.nombre = nombre;
        this.descripcion = descripcion;
        this.fechaInicio = fechaInicio;
        this.fechaFin = fechaFin;
        this.estado = EstadoCampana.borrador;
    }

    // Reglas de negocio DDD
    public void validarFechas() {
        if (fechaInicio != null && fechaFin != null && fechaFin.isBefore(fechaInicio)) {
            throw new IllegalArgumentException("La fecha_fin no puede ser anterior a la fecha_inicio");
        }
    }

    public boolean puedeContratarse() {
        return this.estado == EstadoCampana.borrador || this.estado == EstadoCampana.pendiente_aprobacion;
    }

    // Getters y Setters
    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public UUID getClienteId() {
        return clienteId;
    }

    public void setClienteId(UUID clienteId) {
        this.clienteId = clienteId;
    }

    public String getNombre() {
        return nombre;
    }

    public void setNombre(String nombre) {
        this.nombre = nombre;
    }

    public String getDescripcion() {
        return descripcion;
    }

    public void setDescripcion(String descripcion) {
        this.descripcion = descripcion;
    }

    public EstadoCampana getEstado() {
        return estado;
    }

    public void setEstado(EstadoCampana estado) {
        this.estado = estado;
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
