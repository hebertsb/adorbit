package adorbit.campanas.infraestructura.idempotencia;

import adorbit.campanas.dominio.modelo.ClaveIdempotencia;
import adorbit.campanas.dominio.modelo.EstadoIdempotencia;
import adorbit.campanas.dominio.repositorio.ClaveIdempotenciaRepositorio;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ReadListener;
import jakarta.servlet.ServletException;
import jakarta.servlet.ServletInputStream;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletRequestWrapper;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.core.annotation.Order;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
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

        // Leemos el cuerpo nosotros mismos (una sola vez) para poder calcular la huella y
        // revisar/reclamar la clave ANTES de dejar pasar la peticion al controlador -- antes
        // esto se hacia despues de filterChain.doFilter(...), asi que un reintento con la
        // misma clave ya habia ejecutado el controlador (y duplicado el recurso) para cuando
        // recien se revisaba si esa clave ya existia.
        byte[] requestBody = request.getInputStream().readAllBytes();
        String huella = calcularSha256(requestBody);
        HttpServletRequest requestConCuerpoReleido = new CuerpoReleidoRequest(request, requestBody);

        Optional<ClaveIdempotencia> existente = claveRepositorio.findByClave(clave);
        if (existente.isPresent()) {
            ClaveIdempotencia registro = existente.get();

            if (!registro.getHuellaSolicitud().equals(huella)) {
                escribirError(response, HttpServletResponse.SC_CONFLICT, "IDEMPOTENCIA_CONFLICTO",
                        "La clave de idempotencia ya se uso con una solicitud distinta");
                return;
            }

            if (registro.getEstado() == EstadoIdempotencia.EN_CURSO) {
                escribirError(response, HttpServletResponse.SC_CONFLICT, "SOLICITUD_EN_CURSO",
                        "Ya hay una solicitud en curso con esta clave de idempotencia");
                return;
            }

            // COMPLETADO con la misma huella: reenviar la respuesta guardada sin re-ejecutar.
            response.setStatus(registro.getCodigoEstado() != null ? registro.getCodigoEstado() : 200);
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            if (registro.getRespuesta() != null) {
                response.getWriter().write(registro.getRespuesta());
            }
            return;
        }

        // Clave nueva: la reclamamos (EN_CURSO) antes de ejecutar, para que una peticion
        // concurrente con la misma clave caiga en la rama de arriba en vez de duplicar.
        claveRepositorio.save(new ClaveIdempotencia(clave, huella));

        ContentCachingResponseWrapper wrappedResponse = new ContentCachingResponseWrapper(response);
        try {
            filterChain.doFilter(requestConCuerpoReleido, wrappedResponse);
        } finally {
            int status = wrappedResponse.getStatus();
            if (status >= 200 && status < 300) {
                byte[] responseBody = wrappedResponse.getContentAsByteArray();
                String respuestaTexto = new String(responseBody, StandardCharsets.UTF_8);
                claveRepositorio.findByClave(clave).ifPresent(registro -> {
                    registro.marcarCompletado(status, respuestaTexto);
                    claveRepositorio.save(registro);
                });
            } else {
                // La peticion fallo: liberamos la clave para que un reintento real pueda
                // volver a ejecutar el controlador, en vez de quedar EN_CURSO para siempre.
                claveRepositorio.deleteById(clave);
            }
            wrappedResponse.copyBodyToResponse();
        }
    }

    private void escribirError(HttpServletResponse response, int status, String codigo, String mensaje) throws IOException {
        response.setStatus(status);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.getWriter().write("{\"codigo\":\"" + codigo + "\",\"mensaje\":\"" + mensaje + "\"}");
    }

    /** Re-sirve los bytes del cuerpo ya leidos, para que el controlador los pueda leer normal. */
    private static class CuerpoReleidoRequest extends HttpServletRequestWrapper {
        private final byte[] cuerpo;

        CuerpoReleidoRequest(HttpServletRequest request, byte[] cuerpo) {
            super(request);
            this.cuerpo = cuerpo;
        }

        @Override
        public ServletInputStream getInputStream() {
            ByteArrayInputStream flujo = new ByteArrayInputStream(cuerpo);
            return new ServletInputStream() {
                @Override
                public boolean isFinished() {
                    return flujo.available() == 0;
                }

                @Override
                public boolean isReady() {
                    return true;
                }

                @Override
                public void setReadListener(ReadListener readListener) {
                }

                @Override
                public int read() {
                    return flujo.read();
                }
            };
        }
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

