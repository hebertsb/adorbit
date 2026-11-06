package adorbit.campanas.infraestructura.idempotencia;

import adorbit.campanas.dominio.excepcion.ConflictoEdicionExcepcion;
import adorbit.campanas.dominio.excepcion.IdempotenciaEnCursoExcepcion;
import adorbit.campanas.dominio.modelo.ClaveIdempotencia;
import adorbit.campanas.dominio.modelo.EstadoIdempotencia;
import adorbit.campanas.dominio.repositorio.ClaveIdempotenciaRepositorio;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.core.annotation.Order;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.web.util.ContentCachingRequestWrapper;
import org.springframework.web.util.ContentCachingResponseWrapper;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.Optional;

@Component
@Order(1)
public class FiltroIdempotencia extends OncePerRequestFilter {

    private final ClaveIdempotenciaRepositorio claveRepositorio;

    public FiltroIdempotencia(ClaveIdempotenciaRepositorio claveRepositorio) {
        this.claveRepositorio = claveRepositorio;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {

        String clave = request.getHeader("Idempotency-Key");
        String metodo = request.getMethod();

        // Solo aplica a escrituras (POST, PUT, PATCH, DELETE) que lleven el encabezado
        if (clave == null || (!metodo.equals("POST") && !metodo.equals("PUT") && !metodo.equals("DELETE"))) {
            filterChain.doFilter(request, response);
            return;
        }

        if (clave.length() < 8 || clave.length() > 120) {
            response.setStatus(HttpServletResponse.SC_BAD_REQUEST);
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            response.getWriter().write("{\"codigo\":\"CLAVE_IDEMPOTENCIA_INVALIDA\",\"mensaje\":\"El header Idempotency-Key debe tener entre 8 y 120 caracteres\"}");
            return;
        }

        ContentCachingRequestWrapper wrappedRequest = new ContentCachingRequestWrapper(request);
        ContentCachingResponseWrapper wrappedResponse = new ContentCachingResponseWrapper(response);

        // Dejar que el framework lea el cuerpo para que el wrapper cachee los bytes
        filterChain.doFilter(wrappedRequest, wrappedResponse);

        byte[] requestBody = wrappedRequest.getContentAsByteArray();
        String huella = calcularSha256(requestBody);

        Optional<ClaveIdempotencia> existente = claveRepositorio.findByClave(clave);
        if (existente.isPresent()) {
            ClaveIdempotencia registro = existente.get();
            if (registro.getEstado() == EstadoIdempotencia.COMPLETADO) {
                // Reenviar la respuesta guardada
                wrappedResponse.resetBuffer();
                wrappedResponse.setStatus(registro.getCodigoEstado() != null ? registro.getCodigoEstado() : 200);
                wrappedResponse.setContentType(MediaType.APPLICATION_JSON_VALUE);
                if (registro.getRespuesta() != null) {
                    wrappedResponse.getOutputStream().write(registro.getRespuesta().getBytes(StandardCharsets.UTF_8));
                }
                wrappedResponse.copyBodyToResponse();
                return;
            }
        }

        // Si la petición fue exitosa, guardamos la respuesta en la tabla claves_idempotencia
        int status = wrappedResponse.getStatus();
        if (status >= 200 && status < 300) {
            byte[] responseBody = wrappedResponse.getContentAsByteArray();
            String respuestaTexto = new String(responseBody, StandardCharsets.UTF_8);

            ClaveIdempotencia nuevaClave = existente.orElseGet(() -> new ClaveIdempotencia(clave, huella));
            nuevaClave.marcarCompletado(status, respuestaTexto);
            claveRepositorio.save(nuevaClave);
        }

        wrappedResponse.copyBodyToResponse();
    }

    private String calcularSha256(byte[] datos) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(datos);
            StringBuilder hexString = new StringBuilder();
            for (byte b : hash) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) hexString.append('0');
                hexString.append(hex);
            }
            return hexString.toString();
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("Error al calcular SHA-256", e);
        }
    }
}

