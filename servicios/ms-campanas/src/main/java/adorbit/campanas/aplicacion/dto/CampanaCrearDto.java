package adorbit.campanas.aplicacion.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;
import java.util.UUID;

public class CampanaCrearDto {

    @NotNull(message = "El cliente_id es obligatorio")
    private UUID clienteId;

    @NotBlank(message = "El nombre de la campaña es obligatorio")
    @Size(max = 200, message = "El nombre no puede exceder 200 caracteres")
    private String nombre;

    @Size(max = 2000, message = "La descripción no puede exceder 2000 caracteres")
    private String descripcion;

    private LocalDate fechaInicio;
    private LocalDate fechaFin;

    public CampanaCrearDto() {
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
}

