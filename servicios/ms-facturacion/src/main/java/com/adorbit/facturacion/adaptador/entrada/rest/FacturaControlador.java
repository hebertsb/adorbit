package com.adorbit.facturacion.adaptador.entrada.rest;

import com.adorbit.facturacion.adaptador.entrada.rest.FacturaDtos.CobroRespuesta;
import com.adorbit.facturacion.adaptador.entrada.rest.FacturaDtos.CobroSolicitud;
import com.adorbit.facturacion.adaptador.entrada.rest.FacturaDtos.CotizacionRespuesta;
import com.adorbit.facturacion.adaptador.entrada.rest.FacturaDtos.CotizacionSolicitud;
import com.adorbit.facturacion.adaptador.entrada.rest.FacturaDtos.FacturaRespuesta;
import com.adorbit.facturacion.adaptador.entrada.rest.FacturaDtos.FacturaSolicitud;
import com.adorbit.facturacion.adaptador.entrada.rest.FacturaDtos.ItemSolicitud;
import com.adorbit.facturacion.adaptador.entrada.rest.FacturaDtos.PaginaRespuesta;
import com.adorbit.facturacion.aplicacion.puerto.entrada.ConsultarFacturasCasoDeUso;
import com.adorbit.facturacion.aplicacion.puerto.entrada.CotizarCasoDeUso;
import com.adorbit.facturacion.aplicacion.puerto.entrada.EmitirFacturaCasoDeUso;
import com.adorbit.facturacion.aplicacion.puerto.entrada.EmitirFacturaCasoDeUso.ComandoEmitirFactura;
import com.adorbit.facturacion.aplicacion.puerto.entrada.EmitirFacturaCasoDeUso.LineaComando;
import com.adorbit.facturacion.aplicacion.puerto.entrada.MarcarVencidasCasoDeUso;
import com.adorbit.facturacion.aplicacion.puerto.entrada.RegistrarCobroCasoDeUso;
import com.adorbit.facturacion.aplicacion.puerto.entrada.RegistrarCobroCasoDeUso.ComandoRegistrarCobro;
import com.adorbit.facturacion.dominio.Dinero;
import com.adorbit.facturacion.dominio.EstadoFactura;
import com.adorbit.facturacion.dominio.ExcepcionDominio;
import com.adorbit.facturacion.dominio.Factura;
import com.adorbit.facturacion.dominio.ItemFactura;
import jakarta.validation.Valid;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** API REST de facturas, cobros y cotizaciones (contrato: contratos/openapi/ms-facturacion.yaml). */
@RestController
@RequestMapping("/api/v1")
public class FacturaControlador {

    private final EmitirFacturaCasoDeUso emitir;
    private final RegistrarCobroCasoDeUso cobrar;
    private final ConsultarFacturasCasoDeUso consultar;
    private final CotizarCasoDeUso cotizar;
    private final MarcarVencidasCasoDeUso marcarVencidas;
    private final Clock reloj;

    public FacturaControlador(
            EmitirFacturaCasoDeUso emitir,
            RegistrarCobroCasoDeUso cobrar,
            ConsultarFacturasCasoDeUso consultar,
            CotizarCasoDeUso cotizar,
            MarcarVencidasCasoDeUso marcarVencidas,
            Clock reloj) {
        this.emitir = emitir;
        this.cobrar = cobrar;
        this.consultar = consultar;
        this.cotizar = cotizar;
        this.marcarVencidas = marcarVencidas;
        this.reloj = reloj;
    }

    @PostMapping("/facturas")
    public ResponseEntity<FacturaRespuesta> emitir(
            @RequestHeader("Idempotency-Key") String clave, @Valid @RequestBody FacturaSolicitud s) {
        var comando = new ComandoEmitirFactura(
                clave,
                null,
                s.clienteId(),
                s.campanaId(),
                s.moneda(),
                lineas(s.items()),
                s.totalEsperado() == null ? null : new BigDecimal(s.totalEsperado()),
                s.fechaVencimiento());
        var resultado = emitir.emitir(comando);
        HttpStatus estado = resultado.repetida() ? HttpStatus.OK : HttpStatus.CREATED;
        return ResponseEntity.status(estado).body(FacturaRespuesta.de(resultado.factura()));
    }

    @GetMapping("/facturas/{id}")
    public FacturaRespuesta obtener(@PathVariable UUID id, Authentication autenticacion) {
        Factura factura = consultar.obtener(id).orElseThrow(FacturaControlador::noEncontrada);
        UUID propio = clienteDelToken(autenticacion);
        if (propio != null && !propio.equals(factura.clienteId())) {
            throw noEncontrada(); // el cliente no debe saber que existe
        }
        return FacturaRespuesta.de(factura);
    }

    @GetMapping("/facturas")
    public PaginaRespuesta<FacturaRespuesta> listar(
            @RequestParam(required = false) UUID cliente,
            @RequestParam(required = false) String estado,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            Authentication autenticacion) {
        UUID propio = clienteDelToken(autenticacion);
        UUID filtroCliente = propio != null ? propio : cliente; // el rol cliente ignora el parametro
        var pagina = consultar.listar(filtroCliente, parsearEstado(estado), page, size);
        return new PaginaRespuesta<>(
                pagina.contenido().stream().map(FacturaRespuesta::de).toList(),
                pagina.page(),
                pagina.size(),
                pagina.totalElementos());
    }

    @PostMapping("/facturas/{id}/cobros")
    public ResponseEntity<CobroRespuesta> cobrar(
            @PathVariable UUID id,
            @RequestHeader("Idempotency-Key") String clave,
            @Valid @RequestBody CobroSolicitud s) {
        var resultado = cobrar.registrar(
                new ComandoRegistrarCobro(clave, id, new BigDecimal(s.monto()), s.fecha(), s.referencia()));
        HttpStatus estado = resultado.repetida() ? HttpStatus.OK : HttpStatus.CREATED;
        return ResponseEntity.status(estado).body(CobroRespuesta.de(resultado.cobro()));
    }

    /**
     * Marca como vencidas las facturas abiertas cuyo vencimiento ya paso. Lo dispara una tarea programada
     * (n8n, a diario). Es idempotente por naturaleza; la clave se exige solo por uniformidad de la API.
     */
    @PostMapping("/facturas/vencimientos")
    public ResultadoVencimientosRespuesta vencimientos(@RequestHeader("Idempotency-Key") String clave) {
        if (clave == null || clave.length() < 8 || clave.length() > 120) {
            throw new ExcepcionDominio(
                    "clave_idempotencia_invalida", "La clave de idempotencia debe tener 8 a 120 caracteres");
        }
        var r = marcarVencidas.marcar(LocalDate.now(reloj));
        return new ResultadoVencimientosRespuesta(r.revisadas(), r.marcadasVencidas(), r.conflictos());
    }

    public record ResultadoVencimientosRespuesta(int revisadas, int marcadasVencidas, int conflictos) {}

    @PostMapping("/cotizaciones")
    public ResponseEntity<CotizacionRespuesta> cotizar(
            @RequestHeader("Idempotency-Key") String clave, @Valid @RequestBody CotizacionSolicitud s) {
        List<ItemFactura> items = new ArrayList<>();
        int numero = 1;
        for (ItemSolicitud i : s.items()) {
            items.add(new ItemFactura(
                    numero++, i.descripcion(), i.cantidad(), Dinero.de(i.precioUnitario(), s.moneda())));
        }
        var cotizacion = cotizar.cotizar(s.clienteId(), s.moneda(), items);
        return ResponseEntity.status(HttpStatus.CREATED).body(CotizacionRespuesta.de(cotizacion));
    }

    private static List<LineaComando> lineas(List<ItemSolicitud> items) {
        return items.stream()
                .map(i -> new LineaComando(i.descripcion(), i.cantidad(), new BigDecimal(i.precioUnitario())))
                .toList();
    }

    private static EstadoFactura parsearEstado(String estado) {
        if (estado == null || estado.isBlank()) {
            return null;
        }
        try {
            return EstadoFactura.valueOf(estado.toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException e) {
            throw new ExcepcionDominio("estado_invalido", "Estado de factura desconocido: " + estado);
        }
    }

    /** Si el token tiene rol cliente devuelve su cliente_id (nunca se toma del request); si no, null. */
    private static UUID clienteDelToken(Authentication autenticacion) {
        boolean esCliente = autenticacion.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_cliente"));
        if (!esCliente) {
            return null;
        }
        if (autenticacion.getPrincipal() instanceof Jwt jwt && jwt.getClaimAsString("cliente_id") != null) {
            return UUID.fromString(jwt.getClaimAsString("cliente_id"));
        }
        throw new ExcepcionDominio("sin_permiso", "El token no identifica a un cliente");
    }

    private static ExcepcionDominio noEncontrada() {
        return new ExcepcionDominio("factura_no_encontrada", "No existe la factura");
    }
}
