package adorbit.campanas.infraestructura;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import adorbit.campanas.aplicacion.dto.CampanaRespuestaDto;
import adorbit.campanas.aplicacion.servicios.CalendarioServicio;
import adorbit.campanas.aplicacion.servicios.CampanaServicio;
import adorbit.campanas.aplicacion.servicios.PresupuestoServicio;
import adorbit.campanas.infraestructura.api.CampanaControlador;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import java.util.List;

class CampanaControladorAislamientoTest {
    private CampanaControlador controlador() {
        return new CampanaControlador(mock(CampanaServicio.class), mock(PresupuestoServicio.class),
                mock(CalendarioServicio.class));
    }

    private JwtAuthenticationToken cliente(Object clienteId) {
        return token(clienteId, List.of("cliente"));
    }

    private JwtAuthenticationToken token(Object clienteId, List<String> roles) {
        Jwt.Builder constructor = Jwt.withTokenValue("token").header("alg", "none")
                .claim("realm_access", Map.of("roles", roles));
        if (clienteId != null) constructor.claim("cliente_id", clienteId);
        Jwt token = constructor.build();
        return new JwtAuthenticationToken(token, List.of(new SimpleGrantedAuthority("ROLE_cliente")));
    }

    @Test
    void listadoClienteSinClaimFallaCerrado() {
        JwtAuthenticationToken token = cliente(null);
        assertThrows(AccessDeniedException.class, () -> controlador().listarCampanas(null, null, 0, 20, token));
    }

    @Test
    void detalleClienteConClaimInvalidoFallaCerrado() {
        JwtAuthenticationToken token = cliente("no-es-uuid");
        assertThrows(AccessDeniedException.class, () -> controlador().obtenerCampana(UUID.randomUUID(), token));
    }

    @Test
    void detalleDeOtroClienteSeRechaza() {
        UUID id = UUID.randomUUID();
        CampanaServicio servicio = mock(CampanaServicio.class);
        CampanaRespuestaDto campana = new CampanaRespuestaDto();
        campana.setClienteId(UUID.randomUUID());
        when(servicio.obtenerPorId(id)).thenReturn(campana);
        CampanaControlador controlador = new CampanaControlador(servicio, mock(PresupuestoServicio.class),
                mock(CalendarioServicio.class));
        assertThrows(AccessDeniedException.class,
                () -> controlador.obtenerCampana(id, cliente(UUID.randomUUID().toString())));
    }

    @Test
    void rolMixtoClienteYGerenteMantieneAislamiento() {
        UUID id = UUID.randomUUID();
        UUID clienteId = UUID.randomUUID();
        CampanaServicio servicio = mock(CampanaServicio.class);
        CampanaRespuestaDto campana = new CampanaRespuestaDto();
        campana.setClienteId(clienteId);
        when(servicio.obtenerPorId(id)).thenReturn(campana);
        CampanaControlador controlador = new CampanaControlador(servicio, mock(PresupuestoServicio.class),
                mock(CalendarioServicio.class));
        JwtAuthenticationToken mixto = token(clienteId.toString(), List.of("cliente", "gerente"));
        assertEquals(campana, controlador.obtenerCampana(id, mixto).getBody());
        JwtAuthenticationToken ajeno = token(UUID.randomUUID().toString(), List.of("cliente", "gerente"));
        assertThrows(AccessDeniedException.class, () -> controlador.obtenerCampana(id, ajeno));
        assertThrows(AccessDeniedException.class,
                () -> controlador.obtenerCampana(id, token(null, List.of("cliente", "gerente"))));
    }
}
