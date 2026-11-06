package com.adorbit.facturacion.aplicacion.servicio;

import com.adorbit.facturacion.aplicacion.puerto.entrada.EmitirNotaCreditoCasoDeUso;
import com.adorbit.facturacion.aplicacion.puerto.salida.ClaveIdempotenciaDuplicadaException;
import com.adorbit.facturacion.aplicacion.puerto.salida.EventoSalida;
import com.adorbit.facturacion.aplicacion.puerto.salida.FacturaRepositorioPuerto;
import com.adorbit.facturacion.aplicacion.puerto.salida.IdempotenciaPuerto;
import com.adorbit.facturacion.aplicacion.puerto.salida.RegistroIdempotencia;
import com.adorbit.facturacion.dominio.EstadoFactura;
import com.adorbit.facturacion.dominio.Factura;
import com.adorbit.facturacion.dominio.NotaCredito;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.function.Supplier;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class ServicioEmitirNotaCredito implements EmitirNotaCreditoCasoDeUso {

    private static final Logger LOG = LoggerFactory.getLogger(ServicioEmitirNotaCredito.class);

    private final FacturaRepositorioPuerto facturas;
    private final IdempotenciaPuerto idempotencia;
    private final Clock reloj;
    private final Supplier<UUID> generadorId;

    public ServicioEmitirNotaCredito(
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
    public Optional<NotaCredito> emitir(String clave, UUID sagaId, UUID facturaId, String motivo) {
        if (idempotencia.buscar(clave).isPresent()) {
            LOG.info("Nota de credito ya procesada para la clave {}", clave);
            return Optional.empty();
        }
        Optional<Factura> encontrada = facturas.buscarPorId(facturaId);
        if (encontrada.isEmpty() || encontrada.get().estado() == EstadoFactura.ANULADA) {
            LOG.info("Nada que compensar para la factura {}", facturaId);
            return Optional.empty();
        }
        Factura factura = encontrada.get();
        Instant ahora = reloj.instant();
        NotaCredito nota =
                NotaCredito.emitirPara(factura, generadorId.get(), motivo, LocalDate.ofInstant(ahora, reloj.getZone()));

        Map<String, Object> carga = new LinkedHashMap<>();
        carga.put("nota_id", nota.id().toString());
        carga.put("factura_id", factura.id().toString());
        carga.put("total", nota.total().monto().toPlainString());
        carga.put("moneda", factura.moneda().name());
        if (sagaId != null) {
            carga.put("saga_id", sagaId.toString());
        }
        String correlacion = sagaId != null ? sagaId.toString() : clave;
        var evento = new EventoSalida(generadorId.get(), "NotaCreditoEmitida", nota.id(), correlacion, ahora, carga);
        var registro = new RegistroIdempotencia(
                clave,
                "nota-credito",
                "{\"nota_id\":\"" + nota.id() + "\"}",
                ahora.plus(ServicioEmitirFactura.VIGENCIA_IDEMPOTENCIA));
        try {
            facturas.guardarNotaCredito(factura, nota, registro, evento);
            return Optional.of(nota);
        } catch (ClaveIdempotenciaDuplicadaException carrera) {
            return Optional.empty();
        }
    }
}
