package adorbit.campanas.aplicacion.dto;

import adorbit.campanas.dominio.modelo.EstadoPasoSaga;
import adorbit.campanas.dominio.modelo.SagaPaso;
import adorbit.campanas.dominio.modelo.TipoPasoSaga;

import java.time.OffsetDateTime;
import java.util.UUID;

public class SagaPasoRespuestaDto {

    private UUID id;
    private Integer orden;
    private TipoPasoSaga tipo;
    private String servicio;
    private String accion;
    private String claveComando;
    private EstadoPasoSaga estado;
    private Integer intentos;
    private String detalle;
    private OffsetDateTime actualizadoEn;

    public static SagaPasoRespuestaDto desdeEntidad(SagaPaso p) {
        SagaPasoRespuestaDto dto = new SagaPasoRespuestaDto();
        dto.setId(p.getId());
        dto.setOrden(p.getOrden());
        dto.setTipo(p.getTipo());
        dto.setServicio(p.getServicio());
        dto.setAccion(p.getAccion());
        dto.setClaveComando(p.getClaveComando());
        dto.setEstado(p.getEstado());
        dto.setIntentos(p.getIntentos());
        dto.setDetalle(p.getDetalle());
        dto.setActualizadoEn(p.getActualizadoEn());
        return dto;
    }

    public SagaPasoRespuestaDto() {
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
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

    public OffsetDateTime getActualizadoEn() {
        return actualizadoEn;
    }

    public void setActualizadoEn(OffsetDateTime actualizadoEn) {
        this.actualizadoEn = actualizadoEn;
    }
}

