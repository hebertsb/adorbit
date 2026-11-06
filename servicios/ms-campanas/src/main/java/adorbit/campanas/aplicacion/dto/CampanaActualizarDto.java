package adorbit.campanas.aplicacion.dto;

import adorbit.campanas.dominio.modelo.EstadoCampana;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

public class CampanaActualizarDto {

    @Size(max = 200, message = "El nombre no puede exceder 200 caracteres")
    private String nombre;

    @Size(max = 2000, message = "La descripción no puede exceder 2000 caracteres")
    private String descripcion;

    private EstadoCampana estado;
    private LocalDate fechaInicio;
    private LocalDate fechaFin;

    @NotNull(message = "El campo version es obligatorio para control de concurrencia")
    private Integer version;

    public CampanaActualizarDto() {
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
}

