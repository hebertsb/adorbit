package adorbit.campanas.infraestructura;

import adorbit.campanas.dominio.repositorio.ClaveIdempotenciaRepositorio;
import adorbit.campanas.infraestructura.api.SaludControlador;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import adorbit.campanas.infraestructura.configuracion.ConfiguracionSeguridad;
import adorbit.campanas.infraestructura.configuracion.SeguridadBandeja;
import jakarta.persistence.EntityManager;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(SaludControlador.class)
@ActiveProfiles("test")
@Import({ConfiguracionSeguridad.class, SeguridadBandeja.class})
class SaludControladorTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private ClaveIdempotenciaRepositorio claveIdempotenciaRepositorio;

    @MockBean
    private org.springframework.transaction.support.TransactionTemplate transactionTemplate;

    @MockBean
    private EntityManager entityManager;

    @Test
    void rechazarAccesoAnonimo() throws Exception {
        mockMvc.perform(get("/campanas"))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(get("/campanas").header("Authorization", "Bearer invalido"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void responderSaludOk() throws Exception {
        mockMvc.perform(get("/salud"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.estado").value("ok"))
                .andExpect(jsonPath("$.servicio").value("ms-campanas"));
    }
}
