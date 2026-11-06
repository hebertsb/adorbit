package adorbit.campanas.aplicacion.dto;

import adorbit.campanas.dominio.modelo.*;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

public class SagaRespuestaDto {

    private UUID id;
    private UUID campanaId;
    private String claveIdempotencia;
    private EstadoSaga estado;
    private Integer pasoActual;
    private String motivoFallo;
    private Integer version;
    private OffsetDateTime limiteEn;
    private OffsetDateTime creadoEn;
    private OffsetDateTime actualizadoEn;
    private List<SagaPasoRespuestaDto> pasos = new ArrayList<>();

    public static SagaRespuestaDto desdeEntidad(SagaTransaccion saga, List<SagaPaso> pasos) {
        SagaRespuestaDto dto = new SagaRespuestaDto();
        dto.setId(saga.getId());
        dto.setCampanaId(saga.getCampanaId());
        dto.setClaveIdempotencia(saga.getClaveIdempotencia());
        dto.setEstado(saga.getEstado());
        dto.setPasoActual(saga.getPasoActual());
        dto.setMotivoFallo(saga.getMotivoFallo());
        dto.setVersion(saga.getVersion());
        dto.setLimiteEn(saga.getLimiteEn());
        dto.setCreadoEn(saga.getCreadoEn());
        dto.setActualizadoEn(saga.getActualizadoEn());

        if (pasos != null) {
            for (SagaPaso p : pasos) {
                dto.getPasos().add(SagaPasoRespuestaDto.desdeEntidad(p));
            }
        }
        return dto;
    }

    public SagaRespuestaDto() {
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

    public List<SagaPasoRespuestaDto> getPasos() {
        return pasos;
    }

    public void setPasos(List<SagaPasoRespuestaDto> pasos) {
        this.pasos = pasos;
    }
}

