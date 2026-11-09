package adorbit.campanas.infraestructura.idempotencia;

import adorbit.campanas.dominio.modelo.ClaveIdempotencia;
import adorbit.campanas.dominio.modelo.EstadoIdempotencia;
import adorbit.campanas.dominio.repositorio.ClaveIdempotenciaRepositorio;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ReadListener;
import jakarta.servlet.ServletException;
import jakarta.servlet.ServletInputStream;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletRequestWrapper;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.core.annotation.Order;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.transaction.UnexpectedRollbackException;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.web.util.ContentCachingResponseWrapper;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.Optional;

@Component
@Order(1)
public class FiltroIdempotencia extends OncePerRequestFilter {
    private final ClaveIdempotenciaRepositorio claveRepositorio;
    private final TransactionTemplate transaccion;
    private final EntityManager entityManager;

    public FiltroIdempotencia(ClaveIdempotenciaRepositorio claveRepositorio,
                              TransactionTemplate transaccion, EntityManager entityManager) {
        this.claveRepositorio = claveRepositorio;
        this.transaccion = transaccion;
        this.entityManager = entityManager;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        String metodo = request.getMethod();
        boolean escritura = metodo.equals("POST") || metodo.equals("PUT")
                || metodo.equals("PATCH") || metodo.equals("DELETE");
        if (!escritura) {
            filterChain.doFilter(request, response);
            return;
        }

        String clave = request.getHeader("Idempotency-Key");
        if (clave == null || clave.length() < 8 || clave.length() > 120) {
            escribirError(response, HttpServletResponse.SC_BAD_REQUEST, "CLAVE_IDEMPOTENCIA_INVALIDA",
                    "El header Idempotency-Key es obligatorio y debe tener entre 8 y 120 caracteres");
            return;
        }

        byte[] cuerpo = request.getInputStream().readAllBytes();
        String identidad = request.getUserPrincipal() == null
                ? "anonimo" : request.getUserPrincipal().getName();
        String huella = calcularSha256(metodo + "\n" + request.getRequestURI() + "?"
                + request.getQueryString() + "\n" + identidad + "\n"
                + new String(cuerpo, StandardCharsets.UTF_8));

        Optional<ClaveIdempotencia> existente = claveRepositorio.findByClave(clave);
        if (existente.isPresent()) {
            responderRepeticion(response, existente.get(), huella);
            return;
        }

        ContentCachingResponseWrapper envuelta = new ContentCachingResponseWrapper(response);
        try {
            transaccion.executeWithoutResult(estadoTx -> {
                if (claveRepositorio.findByClave(clave).isPresent()) {
                    throw new IdempotenciaConcurrenteException();
                }
                try {
                    // El INSERT inmediato hace competir por la PK antes de ejecutar el negocio.
                    entityManager.persist(new ClaveIdempotencia(clave, huella));
                    entityManager.flush();
                } catch (PersistenceException | DataIntegrityViolationException ex) {
                    if (!esViolacionUnicidad(ex)) throw ex;
                    throw new IdempotenciaConcurrenteException();
                }
                try {
                    filterChain.doFilter(new CuerpoReleidoRequest(request, cuerpo), envuelta);
                } catch (IOException | ServletException ex) {
                    throw new IdempotenciaFiltroException(ex);
                }

                int codigo = envuelta.getStatus();
                if (codigo < 200 || codigo >= 300) {
                    // La reserva se revierte junto con la operacion; no borrar manualmente.
                    estadoTx.setRollbackOnly();
                    return;
                }
                byte[] respuesta = envuelta.getContentAsByteArray();
                ClaveIdempotencia registro = claveRepositorio.findByClave(clave)
                        .orElseThrow(() -> new IllegalStateException("No existe la reserva de idempotencia"));
                registro.marcarCompletado(codigo, new String(respuesta, StandardCharsets.UTF_8));
                claveRepositorio.save(registro);
            });
            // Solo se exponen 2xx despues de que el commit confirmo la clave y el negocio.
            envuelta.copyBodyToResponse();
        } catch (UnexpectedRollbackException ex) {
            // Un 4xx/5xx generado por MVC conserva su respuesta; nunca se publica un 2xx.
            if (envuelta.getStatus() < 200 || envuelta.getStatus() >= 300) {
                envuelta.copyBodyToResponse();
                return;
            }
            response.reset();
            throw ex;
        } catch (IdempotenciaConcurrenteException ex) {
            Optional<ClaveIdempotencia> registrada = claveRepositorio.findByClave(clave);
            if (registrada.isPresent()) {
                responderRepeticion(response, registrada.get(), huella);
            } else {
                escribirError(response, HttpServletResponse.SC_CONFLICT, "SOLICITUD_EN_CURSO",
                        "Ya hay una solicitud en curso con esta clave");
            }
        } catch (IdempotenciaFiltroException ex) {
            if (ex.getCause() instanceof IOException causa) throw causa;
            if (ex.getCause() instanceof ServletException causa) throw causa;
            throw ex;
        } catch (RuntimeException ex) {
            response.reset();
            throw ex;
        }
    }

    private boolean esViolacionUnicidad(Throwable ex) {
        for (Throwable causa = ex; causa != null; causa = causa.getCause()) {
            if (causa instanceof java.sql.SQLException sql && "23505".equals(sql.getSQLState())) return true;
        }
        return false;
    }

    private void responderRepeticion(HttpServletResponse response, ClaveIdempotencia registro, String huella) {
        if (!registro.getHuellaSolicitud().equals(huella)) {
            escribirError(response, 409, "IDEMPOTENCIA_CONFLICTO", "La clave ya se uso con una solicitud distinta");
            return;
        }
        if (registro.getEstado() == EstadoIdempotencia.EN_CURSO) {
            escribirError(response, 409, "SOLICITUD_EN_CURSO", "Ya hay una solicitud en curso con esta clave");
            return;
        }
        response.setStatus(registro.getCodigoEstado());
        response.setCharacterEncoding(StandardCharsets.UTF_8.name());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        try {
            if (registro.getRespuesta() != null) response.getWriter().write(registro.getRespuesta());
        } catch (IOException ex) {
            throw new IdempotenciaFiltroException(ex);
        }
    }

    private void escribirError(HttpServletResponse response, int status, String codigo, String mensaje) {
        try {
            response.setStatus(status);
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            response.getWriter().write("{\"codigo\":\"" + codigo + "\",\"mensaje\":\"" + mensaje + "\"}");
        } catch (IOException ex) {
            throw new IdempotenciaFiltroException(ex);
        }
    }

    private String calcularSha256(String texto) {
        try {
            byte[] hash = MessageDigest.getInstance("SHA-256").digest(texto.getBytes(StandardCharsets.UTF_8));
            StringBuilder resultado = new StringBuilder(64);
            for (byte b : hash) resultado.append(String.format("%02x", b));
            return resultado.toString();
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException("SHA-256 no disponible", ex);
        }
    }

    private static final class IdempotenciaFiltroException extends RuntimeException {
        IdempotenciaFiltroException(Throwable causa) { super(causa); }
    }

    private static final class IdempotenciaConcurrenteException extends RuntimeException { }

    private static final class CuerpoReleidoRequest extends HttpServletRequestWrapper {
        private final byte[] cuerpo;
        CuerpoReleidoRequest(HttpServletRequest request, byte[] cuerpo) { super(request); this.cuerpo = cuerpo; }
        @Override public ServletInputStream getInputStream() {
            ByteArrayInputStream flujo = new ByteArrayInputStream(cuerpo);
            return new ServletInputStream() {
                @Override public boolean isFinished() { return flujo.available() == 0; }
                @Override public boolean isReady() { return true; }
                @Override public void setReadListener(ReadListener listener) { }
                @Override public int read() { return flujo.read(); }
            };
        }
    }
}
