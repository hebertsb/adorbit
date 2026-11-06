package adorbit.campanas.infraestructura;

import adorbit.campanas.dominio.repositorio.ClaveIdempotenciaRepositorio;
import adorbit.campanas.infraestructura.api.SaludControlador;
import org.junit.jupiter.api.Test;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(SaludControlador.class)
@ActiveProfiles("test")
class SaludControladorTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private ClaveIdempotenciaRepositorio claveIdempotenciaRepositorio;

    @Test
    @WithMockUser
    void responderSaludOk() throws Exception {
        mockMvc.perform(get("/salud"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.estado").value("ok"))
                .andExpect(jsonPath("$.servicio").value("ms-campanas"));
    }
}
