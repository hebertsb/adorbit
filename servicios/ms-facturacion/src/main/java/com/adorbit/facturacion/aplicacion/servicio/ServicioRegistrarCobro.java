package com.adorbit.facturacion.aplicacion.servicio;

import com.adorbit.facturacion.aplicacion.puerto.entrada.RegistrarCobroCasoDeUso;
import com.adorbit.facturacion.aplicacion.puerto.salida.ClaveIdempotenciaDuplicadaException;
import com.adorbit.facturacion.aplicacion.puerto.salida.EventoSalida;
import com.adorbit.facturacion.aplicacion.puerto.salida.FacturaRepositorioPuerto;
import com.adorbit.facturacion.aplicacion.puerto.salida.IdempotenciaPuerto;
import com.adorbit.facturacion.aplicacion.puerto.salida.RegistroIdempotencia;
import com.adorbit.facturacion.dominio.Cobro;
import com.adorbit.facturacion.dominio.Dinero;
import com.adorbit.facturacion.dominio.EstadoFactura;
import com.adorbit.facturacion.dominio.ExcepcionDominio;
import com.adorbit.facturacion.dominio.Factura;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Clock;
import java.time.Instant;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Supplier;

/** Registra cobros de forma idempotente; si la factura queda saldada publica FacturaPagada. */
public class ServicioRegistrarCobro implements RegistrarCobroCasoDeUso {

    private final FacturaRepositorioPuerto facturas;
    private final IdempotenciaPuerto idempotencia;
    private final Clock reloj;
    private final Supplier<UUID> generadorId;

    public ServicioRegistrarCobro(
            FacturaRepositorioPuerto facturas,
            IdempotenciaPuerto idempotencia,
            Clock reloj,
            Supplier<UUID> generadorId) {
        this.facturas = facturas;
        this.idempotencia = idempotencia;
        this.reloj = reloj;
        this.generadorId = generadorId;
    }

    @Override
    public ResultadoCobro registrar(ComandoRegistrarCobro c) {
        if (c.clave() == null || c.clave().length() < 8 || c.clave().length() > 120) {
            throw new ExcepcionDominio(
                    "clave_idempotencia_invalida", "La clave de idempotencia debe tener 8 a 120 caracteres");
        }
        Dinero.exigirCentavos(c.monto());
        String huella = huella(c);
        var previo = idempotencia.buscar(c.clave());
        if (previo.isPresent()) {
            return repetir(previo.get(), huella, c.facturaId());
        }

        Factura factura = facturas.buscarPorId(c.facturaId())
                .orElseThrow(() -> new ExcepcionDominio("factura_no_encontrada", "No existe la factura"));
        Cobro cobro = factura.registrarCobro(
                generadorId.get(), new Dinero(c.monto(), factura.moneda()), c.fecha(), c.referencia());

        Instant ahora = reloj.instant();
        List<EventoSalida> eventos = factura.estado() == EstadoFactura.PAGADA
                ? List.of(eventoPagada(factura, cobro, ahora, c.clave()))
                : List.of();
        var registro = new RegistroIdempotencia(
                c.clave(),
                huella,
                "{\"cobro_id\":\"" + cobro.id() + "\",\"factura_id\":\"" + factura.id() + "\"}",
                ahora.plus(ServicioEmitirFactura.VIGENCIA_IDEMPOTENCIA));
        try {
            facturas.guardarCobro(factura, cobro, registro, eventos);
            return new ResultadoCobro(factura, cobro, false);
        } catch (ClaveIdempotenciaDuplicadaException carrera) {
            return repetir(idempotencia.buscar(c.clave()).orElseThrow(() -> carrera), huella, c.facturaId());
        }
    }

    private ResultadoCobro repetir(RegistroIdempotencia previo, String huella, UUID facturaId) {
        if (!previo.huellaSolicitud().equals(huella)) {
            throw new ExcepcionDominio(
                    "idempotencia_conflicto", "La clave de idempotencia ya se uso con una solicitud distinta");
        }
        UUID cobroId = UUID.fromString(previo.respuesta().replaceAll(".*\"cobro_id\":\"([^\"]+)\".*", "$1"));
        Factura factura = facturas.buscarPorId(facturaId)
                .orElseThrow(() -> new ExcepcionDominio("factura_no_encontrada", "No existe la factura"));
        Cobro cobro = factura.cobros().stream()
                .filter(x -> x.id().equals(cobroId))
                .findFirst()
                .orElseThrow(() -> new ExcepcionDominio("cobro_no_encontrado", "No existe el cobro original"));
        return new ResultadoCobro(factura, cobro, true);
    }

    private EventoSalida eventoPagada(Factura f, Cobro cobro, Instant ahora, String correlacion) {
        Map<String, Object> carga = new LinkedHashMap<>();
        carga.put("factura_id", f.id().toString());
        carga.put("monto", f.totales().total().monto().toPlainString());
        carga.put("moneda", f.moneda().name());
        carga.put("fecha", cobro.fecha().toString());
        return new EventoSalida(generadorId.get(), "FacturaPagada", f.id(), correlacion, ahora, carga);
    }

    static String huella(ComandoRegistrarCobro c) {
        String base =
                c.facturaId() + "|" + c.monto().setScale(2).toPlainString() + "|" + c.fecha() + "|" + c.referencia();
        try {
            return HexFormat.of()
                    .formatHex(MessageDigest.getInstance("SHA-256").digest(base.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }
}
