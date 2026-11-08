package adorbit.campanas.infraestructura.configuracion;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.jwt.Jwt;

class SeguridadBandejaTest {
    private Jwt.Builder token() {
        return Jwt.withTokenValue("prueba").header("alg", "RS256")
                .issuer("https://emisor.example/realms/adorbit")
                .audience(List.of("ms-campanas"));
    }

    private boolean aceptado(Jwt jwt) {
        return !SeguridadBandeja.validadores("https://emisor.example/realms/adorbit", "ms-campanas")
                .validate(jwt).hasErrors();
    }

    @Test
    void exigeExpiracionEmisorYAudiencia() {
        assertTrue(aceptado(token().expiresAt(Instant.now().plusSeconds(300)).build()));
        assertFalse(aceptado(token().build()));
        assertFalse(aceptado(token().expiresAt(Instant.now().minusSeconds(300)).build()));
        assertFalse(aceptado(token().issuer("https://otro.example").expiresAt(Instant.now().plusSeconds(300)).build()));
        assertFalse(aceptado(token().audience(List.of("otro")).expiresAt(Instant.now().plusSeconds(300)).build()));
    }
}
