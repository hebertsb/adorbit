package com.adorbit.facturacion.adaptador.entrada.rest;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.adorbit.facturacion.aplicacion.puerto.salida.VerificarAlmacenamientoPuerto;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest(
        properties = {
            "adorbit.facturacion.seguridad.jwks-uri=http://localhost:9/jwks",
            "adorbit.facturacion.seguridad.emisor=http://localhost:9/realms/adorbit",
            "adorbit.facturacion.seguridad.audiencia=ms-facturacion"
        })
@AutoConfigureMockMvc
class EstadoControladorTest {

    @Autowired
    private MockMvc mvc;

    @MockitoBean
    private VerificarAlmacenamientoPuerto almacenamiento;

    @Test
    void saludEsPublicoYResponde200() throws Exception {
        mvc.perform(get("/salud"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.estado").value("vivo"))
                .andExpect(header().exists("X-Correlation-Id"));
    }

    @Test
    void listoResponde200CuandoElAlmacenamientoEstaDisponible() throws Exception {
        when(almacenamiento.estaDisponible()).thenReturn(true);
        mvc.perform(get("/listo"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.estado").value("listo"));
    }

    @Test
    void listoResponde503CuandoElAlmacenamientoFalla() throws Exception {
        when(almacenamiento.estaDisponible()).thenReturn(false);
        mvc.perform(get("/listo"))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.estado").value("no_listo"));
    }

    @Test
    void rutaProtegidaSinTokenResponde401() throws Exception {
        mvc.perform(get("/api/v1/facturas")).andExpect(status().isUnauthorized());
    }

    @Test
    void conservaElIdDeCorrelacionRecibido() throws Exception {
        mvc.perform(get("/salud").header("X-Correlation-Id", "abc-123"))
                .andExpect(header().string("X-Correlation-Id", "abc-123"));
    }
}
