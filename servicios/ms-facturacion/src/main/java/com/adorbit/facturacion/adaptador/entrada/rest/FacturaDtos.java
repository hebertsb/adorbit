package com.adorbit.facturacion.adaptador.entrada.rest;

import com.adorbit.facturacion.aplicacion.puerto.entrada.CotizarCasoDeUso.Cotizacion;
import com.adorbit.facturacion.dominio.Cobro;
import com.adorbit.facturacion.dominio.Factura;
import com.adorbit.facturacion.dominio.ItemFactura;
import com.adorbit.facturacion.dominio.Moneda;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/** Cuerpos de la API REST. Los campos JSON van en snake_case y el dinero como texto decimal. */
public final class FacturaDtos {

    static final String PATRON_MONTO = "^\\d{1,12}(\\.\\d{1,2})?$";

    private FacturaDtos() {}

    public record ItemSolicitud(
            @NotBlank @Size(max = 200) String descripcion,
            @NotNull @jakarta.validation.constraints.Min(1) Integer cantidad,
            @NotNull @Pattern(regexp = PATRON_MONTO) String precioUnitario) {}

    public record FacturaSolicitud(
            @NotNull UUID clienteId,
            @NotNull UUID campanaId,
            @NotNull @NotEmpty @Size(max = 90) List<@Valid @NotNull ItemSolicitud> items,
            @NotNull Moneda moneda,
            LocalDate fechaVencimiento,
            @Pattern(regexp = PATRON_MONTO) String totalEsperado) {}

    public record CobroSolicitud(
            @NotNull @Pattern(regexp = PATRON_MONTO) String monto,
            @NotNull LocalDate fecha,
            @Size(max = 200) String referencia) {}

    public record CotizacionSolicitud(
            @NotNull UUID clienteId,
            @NotNull @NotEmpty @Size(max = 90) List<@Valid @NotNull ItemSolicitud> items,
            @NotNull Moneda moneda) {}

    public record ItemRespuesta(int numero, String descripcion, int cantidad, String precioUnitario, String subtotal) {
        static ItemRespuesta de(ItemFactura i) {
            return new ItemRespuesta(
                    i.numero(),
                    i.descripcion(),
                    i.cantidad(),
                    i.precioUnitario().monto().toPlainString(),
                    i.subtotal().monto().toPlainString());
        }
    }

    public record CobroRespuesta(String id, String facturaId, String monto, LocalDate fecha, String referencia) {
        static CobroRespuesta de(Cobro c) {
            return new CobroRespuesta(
                    c.id().toString(),
                    c.facturaId().toString(),
                    c.monto().monto().toPlainString(),
                    c.fecha(),
                    c.referencia());
        }
    }

    public record FacturaRespuesta(
            String id,
            String clienteId,
            String campanaId,
            String estado,
            Moneda moneda,
            String subtotal,
            String impuestos,
            String total,
            String saldo,
            LocalDate fechaEmision,
            LocalDate fechaVencimiento,
            long version,
            List<ItemRespuesta> items,
            List<CobroRespuesta> cobros) {
        static FacturaRespuesta de(Factura f) {
            return new FacturaRespuesta(
                    f.id().toString(),
                    f.clienteId().toString(),
                    f.campanaId().toString(),
                    f.estado().name().toLowerCase(),
                    f.moneda(),
                    f.totales().subtotal().monto().toPlainString(),
                    f.totales().impuestos().monto().toPlainString(),
                    f.totales().total().monto().toPlainString(),
                    f.saldo().monto().toPlainString(),
                    f.fechaEmision(),
                    f.fechaVencimiento(),
                    f.version(),
                    f.items().stream().map(ItemRespuesta::de).toList(),
                    f.cobros().stream().map(CobroRespuesta::de).toList());
        }
    }

    public record PaginaRespuesta<T>(List<T> contenido, int page, int size, long totalElementos) {}

    public record CotizacionRespuesta(
            String id,
            String clienteId,
            Moneda moneda,
            String subtotal,
            String impuestos,
            String total,
            List<ItemRespuesta> items) {
        static CotizacionRespuesta de(Cotizacion c) {
            return new CotizacionRespuesta(
                    c.id().toString(),
                    c.clienteId().toString(),
                    c.moneda(),
                    c.totales().subtotal().monto().toPlainString(),
                    c.totales().impuestos().monto().toPlainString(),
                    c.totales().total().monto().toPlainString(),
                    c.items().stream().map(ItemRespuesta::de).toList());
        }
    }

    public record ErrorRespuesta(String codigo, String mensaje, Object detalle) {}
}
