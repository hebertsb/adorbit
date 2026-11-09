package adorbit.campanas.infraestructura.api;

import adorbit.campanas.dominio.excepcion.ConflictoEdicionExcepcion;
import adorbit.campanas.dominio.excepcion.IdempotenciaEnCursoExcepcion;
import adorbit.campanas.dominio.excepcion.RecursoNoEncontradoExcepcion;
import adorbit.campanas.dominio.excepcion.ReglaNegocioExcepcion;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingRequestHeaderException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.HashMap;
import java.util.Map;

@RestControllerAdvice
public class ManejadorGlobalErrores {

    @ExceptionHandler(RecursoNoEncontradoExcepcion.class)
    public ResponseEntity<Map<String, Object>> manejarNoEncontrado(RecursoNoEncontradoExcepcion ex) {
        return construirRespuesta(HttpStatus.NOT_FOUND, "RECURSO_NO_ENCONTRADO", ex.getMessage(), null);
    }

    @ExceptionHandler(ConflictoEdicionExcepcion.class)
    public ResponseEntity<Map<String, Object>> manejarConflicto(ConflictoEdicionExcepcion ex) {
        return construirRespuesta(HttpStatus.CONFLICT, "CONFLICTO_CONCURRENCIA", ex.getMessage(), null);
    }

    @ExceptionHandler(IdempotenciaEnCursoExcepcion.class)
    public ResponseEntity<Map<String, Object>> manejarIdempotenciaEnCurso(IdempotenciaEnCursoExcepcion ex) {
        return construirRespuesta(HttpStatus.CONFLICT, "SOLICITUD_EN_CURSO", ex.getMessage(), null);
    }

    @ExceptionHandler(ReglaNegocioExcepcion.class)
    public ResponseEntity<Map<String, Object>> manejarReglaNegocio(ReglaNegocioExcepcion ex) {
        return construirRespuesta(HttpStatus.UNPROCESSABLE_ENTITY, "REGLA_NEGOCIO_VIOLADA", ex.getMessage(), null);
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, Object>> manejarArgumentoInvalido(IllegalArgumentException ex) {
        return construirRespuesta(HttpStatus.BAD_REQUEST, "PARAMETRO_INVALIDO", ex.getMessage(), null);
    }

    @ExceptionHandler(MissingRequestHeaderException.class)
    public ResponseEntity<Map<String, Object>> manejarCabeceraFaltante(MissingRequestHeaderException ex) {
        return construirRespuesta(HttpStatus.BAD_REQUEST, "CABECERA_FALTANTE",
                "Falta el encabezado obligatorio: " + ex.getHeaderName(), null);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> manejarValidacion(MethodArgumentNotValidException ex) {
        Map<String, String> detalles = new HashMap<>();
        for (FieldError error : ex.getBindingResult().getFieldErrors()) {
            detalles.put(error.getField(), error.getDefaultMessage());
        }
        return construirRespuesta(HttpStatus.BAD_REQUEST, "VALIDACION_FALLIDA",
                "Los datos enviados contienen errores de validación", detalles);
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<Map<String, Object>> manejarAccesoDenegado(AccessDeniedException ex) {
        return construirRespuesta(HttpStatus.FORBIDDEN, "ACCESO_DENEGADO", "Acceso denegado", null);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> manejarGeneral(Exception ex) {
        return construirRespuesta(HttpStatus.INTERNAL_SERVER_ERROR, "ERROR_INTERNO",
                "Ocurrió un error inesperado en el servidor", ex.getMessage());
    }

    private ResponseEntity<Map<String, Object>> construirRespuesta(HttpStatus status, String codigo, String mensaje, Object detalle) {
        Map<String, Object> cuerpo = new HashMap<>();
        cuerpo.put("codigo", codigo);
        cuerpo.put("mensaje", mensaje);
        if (detalle != null) {
            cuerpo.put("detalle", detalle);
        }
        return ResponseEntity.status(status).body(cuerpo);
    }
}

