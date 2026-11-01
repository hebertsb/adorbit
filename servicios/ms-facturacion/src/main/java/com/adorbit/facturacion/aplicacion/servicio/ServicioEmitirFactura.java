package com.adorbit.facturacion.aplicacion.servicio;

import com.adorbit.facturacion.aplicacion.puerto.entrada.EmitirFacturaCasoDeUso;
import com.adorbit.facturacion.aplicacion.puerto.salida.ClaveIdempotenciaDuplicadaException;
import com.adorbit.facturacion.aplicacion.puerto.salida.EventoSalida;
import com.adorbit.facturacion.aplicacion.puerto.salida.FacturaRepositorioPuerto;
import com.adorbit.facturacion.aplicacion.puerto.salida.IdempotenciaPuerto;
import com.adorbit.facturacion.aplicacion.puerto.salida.RegistroIdempotencia;
import com.adorbit.facturacion.dominio.Dinero;
import com.adorbit.facturacion.dominio.ExcepcionDominio;
import com.adorbit.facturacion.dominio.Factura;
import com.adorbit.facturacion.dominio.ItemFactura;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Supplier;

/** Emite facturas con idempotencia: misma clave + misma solicitud = misma respuesta, sin duplicar. */
public class ServicioEmitirFactura implements EmitirFacturaCasoDeUso {

    static final Duration VIGENCIA_IDEMPOTENCIA = Duration.ofDays(7);

    private final FacturaRepositorioPuerto facturas;
    private final IdempotenciaPuerto idempotencia;
    private final Clock reloj;
    private final Supplier<UUID> generadorId;
    private final BigDecimal tasaImpuesto;
    private final int diasVencimiento;

    public ServicioEmitirFactura(
            FacturaRepositorioPuerto facturas,
            IdempotenciaPuerto idempotencia,
            Clock reloj,
            Supplier<UUID> generadorId,
            BigDecimal tasaImpuesto,
            int diasVencimiento) {
        this.facturas = facturas;
        this.idempotencia = idempotencia;
        this.reloj = reloj;
        this.generadorId = generadorId;
        this.tasaImpuesto = tasaImpuesto;
        this.diasVencimiento = diasVencimiento;
    }

    @Override
    public ResultadoEmision emitir(ComandoEmitirFactura comando) {
        validarClave(comando.clave());
        validarMontos(comando); // antes de la huella: un monto con mas de 2 decimales es un dato invalido, no un error
        // interno
        String huella = huella(comando);

        var previo = idempotencia.buscar(comando.clave());
        if (previo.isPresent()) {
            return repetir(previo.get(), huella);
        }

        Instant ahora = reloj.instant();
        LocalDate hoy = LocalDate.ofInstant(ahora, reloj.getZone());
        Factura factura = construir(comando, hoy);
        EventoSalida evento = eventoFacturaEmitida(factura, comando, ahora);
        var registro = new RegistroIdempotencia(
                comando.clave(),
                huella,
                "{\"factura_id\":\"" + factura.id() + "\"}",
                ahora.plus(VIGENCIA_IDEMPOTENCIA));
        try {
            facturas.guardarEmision(factura, registro, evento);
            return new ResultadoEmision(factura, false);
        } catch (ClaveIdempotenciaDuplicadaException carrera) {
            return repetir(idempotencia.buscar(comando.clave()).orElseThrow(() -> carrera), huella);
        }
    }

    private ResultadoEmision repetir(RegistroIdempotencia previo, String huella) {
        if (!previo.huellaSolicitud().equals(huella)) {
            throw new ExcepcionDominio(
                    "idempotencia_conflicto", "La clave de idempotencia ya se uso con una solicitud distinta");
        }
        UUID facturaId = UUID.fromString(previo.respuesta().replaceAll(".*\"factura_id\":\"([^\"]+)\".*", "$1"));
        Factura factura = facturas.buscarPorId(facturaId)
                .orElseThrow(() -> new ExcepcionDominio("factura_no_encontrada", "No existe la factura original"));
        return new ResultadoEmision(factura, true);
    }

    private Factura construir(ComandoEmitirFactura c, LocalDate hoy) {
        List<ItemFactura> items = new ArrayList<>();
        int numero = 1;
        for (LineaComando linea : c.items()) {
            items.add(new ItemFactura(
                    numero++, linea.descripcion(), linea.cantidad(), new Dinero(linea.precioUnitario(), c.moneda())));
        }
        LocalDate vencimiento = c.fechaVencimiento() != null ? c.fechaVencimiento() : hoy.plusDays(diasVencimiento);
        Dinero esperado = c.totalEsperado() == null ? null : new Dinero(c.totalEsperado(), c.moneda());
        return Factura.emitir(
                generadorId.get(),
                c.clienteId(),
                c.campanaId(),
                c.moneda(),
                items,
                tasaImpuesto,
                esperado,
                hoy,
                vencimiento);
    }

    private EventoSalida eventoFacturaEmitida(Factura f, ComandoEmitirFactura c, Instant ahora) {
        Map<String, Object> carga = new LinkedHashMap<>();
        carga.put("factura_id", f.id().toString());
        carga.put("cliente_id", f.clienteId().toString());
        carga.put("campana_id", f.campanaId().toString());
        carga.put("total", f.totales().total().monto().toPlainString());
        carga.put("moneda", f.moneda().name());
        carga.put("fecha_vencimiento", f.fechaVencimiento().toString());
        if (c.sagaId() != null) {
            carga.put("saga_id", c.sagaId().toString());
        }
        String correlacion = c.sagaId() != null ? c.sagaId().toString() : c.clave();
        return new EventoSalida(generadorId.get(), "FacturaEmitida", f.id(), correlacion, ahora, carga);
    }

    private static void validarMontos(ComandoEmitirFactura c) {
        if (c.items() == null || c.items().isEmpty()) {
            throw new ExcepcionDominio("items_invalidos", "Debe haber al menos un item");
        }
        for (LineaComando linea : c.items()) {
            Dinero.exigirCentavos(linea.precioUnitario());
        }
        if (c.totalEsperado() != null) {
            Dinero.exigirCentavos(c.totalEsperado());
        }
    }

    private static void validarClave(String clave) {
        if (clave == null || clave.length() < 8 || clave.length() > 120) {
            throw new ExcepcionDominio(
                    "clave_idempotencia_invalida", "La clave de idempotencia debe tener 8 a 120 caracteres");
        }
    }

    /** Huella SHA-256 de los campos que definen la solicitud (sin la clave misma). */
    static String huella(ComandoEmitirFactura c) {
        StringBuilder sb = new StringBuilder()
                .append(c.clienteId())
                .append('|')
                .append(c.campanaId())
                .append('|')
                .append(c.moneda())
                .append('|')
                .append(c.sagaId())
                .append('|')
                .append(
                        c.totalEsperado() == null
                                ? ""
                                : c.totalEsperado().setScale(2).toPlainString())
                .append('|')
                .append(c.fechaVencimiento());
        for (LineaComando l : c.items()) {
            sb.append('|')
                    .append(l.descripcion())
                    .append(':')
                    .append(l.cantidad())
                    .append(':')
                    .append(l.precioUnitario().setScale(2).toPlainString());
        }
        try {
            byte[] hash =
                    MessageDigest.getInstance("SHA-256").digest(sb.toString().getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }
}
