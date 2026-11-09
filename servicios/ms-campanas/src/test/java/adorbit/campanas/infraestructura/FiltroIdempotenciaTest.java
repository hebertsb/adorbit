package adorbit.campanas.infraestructura;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import adorbit.campanas.dominio.modelo.ClaveIdempotencia;
import adorbit.campanas.dominio.repositorio.ClaveIdempotenciaRepositorio;
import adorbit.campanas.infraestructura.idempotencia.FiltroIdempotencia;
import jakarta.persistence.EntityManager;
import java.security.Principal;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.SimpleTransactionStatus;
import org.springframework.transaction.support.TransactionTemplate;

class FiltroIdempotenciaTest {
    @Test
    void insertaConPersistYReproduceUtf8() throws Exception {
        ClaveIdempotenciaRepositorio repositorio = mock(ClaveIdempotenciaRepositorio.class);
        EntityManager entidad = mock(EntityManager.class);
        PlatformTransactionManager administrador = mock(PlatformTransactionManager.class);
        when(administrador.getTransaction(any())).thenReturn(new SimpleTransactionStatus());
        TransactionTemplate transaccion = new TransactionTemplate(administrador);
        FiltroIdempotencia filtro = new FiltroIdempotencia(repositorio, transaccion, entidad);
        ClaveIdempotencia[] reserva = new ClaveIdempotencia[1];
        doAnswer(invocacion -> { reserva[0] = invocacion.getArgument(0); return null; }).when(entidad).persist(any());
        when(repositorio.findByClave("clave-123"))
                .thenReturn(Optional.empty(), Optional.empty())
                .thenAnswer(invocacion -> Optional.of(reserva[0]));
        MockHttpServletRequest solicitud = new MockHttpServletRequest("POST", "/api/v1/campanas");
        solicitud.addHeader("Idempotency-Key", "clave-123");
        solicitud.setUserPrincipal((Principal) () -> "usuario");
        MockHttpServletResponse respuesta = new MockHttpServletResponse();
        filtro.doFilter(solicitud, respuesta, (req, res) -> {
            res.setCharacterEncoding("UTF-8");
            res.getWriter().write("{\"nombre\":\"campaña\"}");
        });
        verify(entidad).persist(any(ClaveIdempotencia.class));
        verify(entidad).flush();
        verify(administrador).commit(any());
        MockHttpServletRequest repeticion = new MockHttpServletRequest("POST", "/api/v1/campanas");
        repeticion.addHeader("Idempotency-Key", "clave-123");
        repeticion.setUserPrincipal((Principal) () -> "usuario");
        MockHttpServletResponse repetida = new MockHttpServletResponse();
        filtro.doFilter(repeticion, repetida, (req, res) -> { throw new AssertionError("No debe ejecutar el negocio"); });
        assertEquals("UTF-8", repetida.getCharacterEncoding());
        assertEquals("{\"nombre\":\"campaña\"}", repetida.getContentAsString());
    }
}
