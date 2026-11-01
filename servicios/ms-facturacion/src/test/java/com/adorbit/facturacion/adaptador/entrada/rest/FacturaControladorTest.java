package com.adorbit.facturacion.adaptador.entrada.rest;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.adorbit.facturacion.aplicacion.puerto.entrada.ConsultarFacturasCasoDeUso;
import com.adorbit.facturacion.aplicacion.puerto.entrada.CotizarCasoDeUso;
import com.adorbit.facturacion.aplicacion.puerto.entrada.EmitirFacturaCasoDeUso;
import com.adorbit.facturacion.aplicacion.puerto.entrada.EmitirFacturaCasoDeUso.ResultadoEmision;
import com.adorbit.facturacion.aplicacion.puerto.entrada.RegistrarCobroCasoDeUso;
import com.adorbit.facturacion.aplicacion.puerto.entrada.RegistrarCobroCasoDeUso.ResultadoCobro;
import com.adorbit.facturacion.aplicacion.puerto.salida.Pagina;
import com.adorbit.facturacion.dominio.Dinero;
import com.adorbit.facturacion.dominio.ExcepcionDominio;
import com.adorbit.facturacion.dominio.Factura;
import com.adorbit.facturacion.dominio.ItemFactura;
import com.adorbit.facturacion.dominio.Moneda;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

@SpringBootTest(
        properties = {
            "adorbit.facturacion.seguridad.jwks-uri=http://localhost:9/jwks",
            "adorbit.facturacion.seguridad.emisor=http://localhost:9/realms/adorbit",
            "adorbit.facturacion.seguridad.audiencia=ms-facturacion"
        })
@AutoConfigureMockMvc
class FacturaControladorTest {

    private static final UUID CLIENTE = UUID.fromString("11111111-1111-1111-1111-111111111111");
    private static final UUID CAMPANA = UUID.fromString("22222222-2222-2222-2222-222222222222");

    @Autowired
    private MockMvc mvc;

    @MockitoBean
    private EmitirFacturaCasoDeUso emitir;

    @MockitoBean
    private RegistrarCobroCasoDeUso cobrar;

    @MockitoBean
    private ConsultarFacturasCasoDeUso consultar;

    @MockitoBean
    private CotizarCasoDeUso cotizar;

    private static RequestPostProcessor rol(String rol) {
        return jwt().authorities(new SimpleGrantedAuthority("ROLE_" + rol));
    }

    private static RequestPostProcessor cliente(UUID id) {
        return jwt().authorities(new SimpleGrantedAuthority("ROLE_cliente"))
                .jwt(j -> j.claim("cliente_id", id.toString()));
    }

    private static Factura factura(UUID clienteId) {
        return Factura.emitir(
                UUID.randomUUID(),
                clienteId,
                CAMPANA,
                Moneda.BOB,
                List.of(new ItemFactura(1, "Spot", 2, Dinero.de("1000.00", Moneda.BOB))),
                new BigDecimal("0.13"),
                null,
                LocalDate.of(2026, 11, 5),
                LocalDate.of(2026, 12, 5));
    }

    private static final String CUERPO_FACTURA =
            """
            {"cliente_id":"11111111-1111-1111-1111-111111111111",
             "campana_id":"22222222-2222-2222-2222-222222222222",
             "moneda":"BOB",
             "items":[{"descripcion":"Spot","cantidad":2,"precio_unitario":"1000.00"}]}""";

    @Test
    void emitirDevuelve201ConDineroComoTextoYSnakeCase() throws Exception {
        when(emitir.emitir(any())).thenReturn(new ResultadoEmision(factura(CLIENTE), false));

        mvc.perform(post("/api/v1/facturas")
                        .with(rol("ejecutivo"))
                        .header("Idempotency-Key", "clave-0001")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(CUERPO_FACTURA))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.total").value("2260.00"))
                .andExpect(jsonPath("$.estado").value("emitida"))
                .andExpect(jsonPath("$.cliente_id").value(CLIENTE.toString()))
                .andExpect(jsonPath("$.items[0].precio_unitario").value("1000.00"));
    }

    @Test
    void repeticionDevuelve200() throws Exception {
        when(emitir.emitir(any())).thenReturn(new ResultadoEmision(factura(CLIENTE), true));
        mvc.perform(post("/api/v1/facturas")
                        .with(rol("gerente"))
                        .header("Idempotency-Key", "clave-0001")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(CUERPO_FACTURA))
                .andExpect(status().isOk());
    }

    @Test
    void sinIdempotencyKeyDevuelve400() throws Exception {
        mvc.perform(post("/api/v1/facturas")
                        .with(rol("ejecutivo"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(CUERPO_FACTURA))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.codigo").value("cabecera_requerida"));
    }

    @Test
    void camposDesconocidosYMontosInvalidosDevuelven400() throws Exception {
        mvc.perform(post("/api/v1/facturas")
                        .with(rol("ejecutivo"))
                        .header("Idempotency-Key", "clave-0001")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(CUERPO_FACTURA.replace("\"moneda\"", "\"extra\":1,\"moneda\"")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.codigo").value("solicitud_invalida"));

        mvc.perform(post("/api/v1/facturas")
                        .with(rol("ejecutivo"))
                        .header("Idempotency-Key", "clave-0001")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(CUERPO_FACTURA.replace("1000.00", "-5")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detalle").exists());
    }

    @Test
    void erroresDeDominioSeMapeanAEstadosHttp() throws Exception {
        when(emitir.emitir(any())).thenThrow(new ExcepcionDominio("idempotencia_conflicto", "x"));
        mvc.perform(post("/api/v1/facturas")
                        .with(rol("ejecutivo"))
                        .header("Idempotency-Key", "clave-0001")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(CUERPO_FACTURA))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.codigo").value("idempotencia_conflicto"));
    }

    @Test
    void cobroSuperiorAlSaldoDevuelve422() throws Exception {
        UUID id = UUID.randomUUID();
        when(cobrar.registrar(any())).thenThrow(new ExcepcionDominio("cobro_excede_saldo", "x"));
        mvc.perform(post("/api/v1/facturas/" + id + "/cobros")
                        .with(rol("ejecutivo"))
                        .header("Idempotency-Key", "cobro-0001")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"monto\":\"99999.00\",\"fecha\":\"2026-11-06\"}"))
                .andExpect(status().isUnprocessableEntity());
    }

    @Test
    void cobroValidoDevuelve201() throws Exception {
        Factura f = factura(CLIENTE);
        var cobro =
                f.registrarCobro(UUID.randomUUID(), Dinero.de("100.00", Moneda.BOB), LocalDate.of(2026, 11, 6), "tr-1");
        when(cobrar.registrar(any())).thenReturn(new ResultadoCobro(f, cobro, false));
        mvc.perform(post("/api/v1/facturas/" + f.id() + "/cobros")
                        .with(rol("ejecutivo"))
                        .header("Idempotency-Key", "cobro-0001")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"monto\":\"100.00\",\"fecha\":\"2026-11-06\",\"referencia\":\"tr-1\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.monto").value("100.00"))
                .andExpect(jsonPath("$.factura_id").value(f.id().toString()));
    }

    @Test
    void clienteSoloVeSusFacturasPorId() throws Exception {
        Factura ajena = factura(UUID.randomUUID());
        when(consultar.obtener(ajena.id())).thenReturn(Optional.of(ajena));
        mvc.perform(get("/api/v1/facturas/" + ajena.id()).with(cliente(CLIENTE)))
                .andExpect(status().isNotFound());

        Factura propia = factura(CLIENTE);
        when(consultar.obtener(propia.id())).thenReturn(Optional.of(propia));
        mvc.perform(get("/api/v1/facturas/" + propia.id()).with(cliente(CLIENTE)))
                .andExpect(status().isOk());
    }

    @Test
    void clienteIgnoraElParametroClienteDelListado() throws Exception {
        UUID otro = UUID.randomUUID();
        when(consultar.listar(eq(CLIENTE), any(), eq(0), eq(20)))
                .thenReturn(new Pagina<>(List.of(factura(CLIENTE)), 0, 20, 1));

        mvc.perform(get("/api/v1/facturas").param("cliente", otro.toString()).with(cliente(CLIENTE)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total_elementos").value(1));
        verify(consultar).listar(eq(CLIENTE), any(), eq(0), eq(20));
    }

    @Test
    void clienteNoPuedeEmitirFacturasNiCotizar() throws Exception {
        mvc.perform(post("/api/v1/facturas")
                        .with(cliente(CLIENTE))
                        .header("Idempotency-Key", "clave-0001")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(CUERPO_FACTURA))
                .andExpect(status().isForbidden());
        mvc.perform(post("/api/v1/cotizaciones")
                        .with(rol("creativo"))
                        .header("Idempotency-Key", "cot-00001")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isForbidden());
    }

    @Test
    void sinTokenDevuelve401() throws Exception {
        mvc.perform(get("/api/v1/facturas/" + UUID.randomUUID())).andExpect(status().isUnauthorized());
    }

    @Test
    void listarSinFiltroDevuelve400() throws Exception {
        when(consultar.listar(any(), any(), eq(0), eq(20))).thenThrow(new ExcepcionDominio("filtro_requerido", "x"));
        mvc.perform(get("/api/v1/facturas").with(rol("gerente")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.codigo").value("filtro_requerido"));
    }

    @Test
    void estadoDesconocidoDevuelve400() throws Exception {
        mvc.perform(get("/api/v1/facturas").param("estado", "inventado").with(rol("gerente")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.codigo").value("estado_invalido"));
    }
}
