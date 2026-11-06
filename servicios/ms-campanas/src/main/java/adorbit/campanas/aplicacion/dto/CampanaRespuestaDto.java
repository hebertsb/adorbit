package adorbit.campanas.aplicacion.dto;

import adorbit.campanas.dominio.modelo.Campana;
import adorbit.campanas.dominio.modelo.EstadoCampana;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

public class CampanaRespuestaDto {

    private UUID id;
    private UUID clienteId;
    private String nombre;
    private String descripcion;
    private EstadoCampana estado;
    private LocalDate fechaInicio;
    private LocalDate fechaFin;
    private Integer version;
    private OffsetDateTime creadoEn;
    private OffsetDateTime actualizadoEn;

    public static CampanaRespuestaDto desdeEntidad(Campana campana) {
        CampanaRespuestaDto dto = new CampanaRespuestaDto();
        dto.setId(campana.getId());
        dto.setClienteId(campana.getClienteId());
        dto.setNombre(campana.getNombre());
        dto.setDescripcion(campana.getDescripcion());
        dto.setEstado(campana.getEstado());
        dto.setFechaInicio(campana.getFechaInicio());
        dto.setFechaFin(campana.getFechaFin());
        dto.setVersion(campana.getVersion());
        dto.setCreadoEn(campana.getCreadoEn());
        dto.setActualizadoEn(campana.getActualizadoEn());
        return dto;
    }

    public CampanaRespuestaDto() {
    }

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

