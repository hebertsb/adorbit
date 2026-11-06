package com.adorbit.facturacion.configuracion;

import com.adorbit.facturacion.aplicacion.puerto.entrada.ConsultarEstadoCasoDeUso;
import com.adorbit.facturacion.aplicacion.puerto.entrada.ConsultarFacturasCasoDeUso;
import com.adorbit.facturacion.aplicacion.puerto.entrada.CotizarCasoDeUso;
import com.adorbit.facturacion.aplicacion.puerto.entrada.EmitirFacturaCasoDeUso;
import com.adorbit.facturacion.aplicacion.puerto.entrada.EmitirNotaCreditoCasoDeUso;
import com.adorbit.facturacion.aplicacion.puerto.entrada.MarcarVencidasCasoDeUso;
import com.adorbit.facturacion.aplicacion.puerto.entrada.RegistrarCobroCasoDeUso;
import com.adorbit.facturacion.aplicacion.puerto.salida.FacturaRepositorioPuerto;
import com.adorbit.facturacion.aplicacion.puerto.salida.IdempotenciaPuerto;
import com.adorbit.facturacion.aplicacion.puerto.salida.VerificarAlmacenamientoPuerto;
import com.adorbit.facturacion.aplicacion.servicio.ServicioConsultarFacturas;
import com.adorbit.facturacion.aplicacion.servicio.ServicioCotizar;
import com.adorbit.facturacion.aplicacion.servicio.ServicioEmitirFactura;
import com.adorbit.facturacion.aplicacion.servicio.ServicioEmitirNotaCredito;
import com.adorbit.facturacion.aplicacion.servicio.ServicioEstado;
import com.adorbit.facturacion.aplicacion.servicio.ServicioMarcarVencidas;
import com.adorbit.facturacion.aplicacion.servicio.ServicioRegistrarCobro;
import java.math.BigDecimal;
import java.time.Clock;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/** Cablea los casos de uso con sus puertos de salida (el nucleo no conoce Spring). */
@Configuration
public class AplicacionConfiguracion {

    @Bean
    ConsultarEstadoCasoDeUso consultarEstado(VerificarAlmacenamientoPuerto almacenamiento) {
        return new ServicioEstado(almacenamiento);
    }

    @Bean
    Clock reloj() {
        return Clock.systemUTC();
    }

    @Bean
    EmitirFacturaCasoDeUso emitirFactura(
            FacturaRepositorioPuerto facturas,
            IdempotenciaPuerto idempotencia,
            Clock reloj,
            @Value("${adorbit.facturacion.negocio.tasa-impuesto}") BigDecimal tasaImpuesto,
            @Value("${adorbit.facturacion.negocio.dias-vencimiento}") int diasVencimiento) {
        return new ServicioEmitirFactura(
                facturas, idempotencia, reloj, UUID::randomUUID, tasaImpuesto, diasVencimiento);
    }

    @Bean
    RegistrarCobroCasoDeUso registrarCobro(
            FacturaRepositorioPuerto facturas, IdempotenciaPuerto idempotencia, Clock reloj) {
        return new ServicioRegistrarCobro(facturas, idempotencia, reloj, UUID::randomUUID);
    }

    @Bean
    ConsultarFacturasCasoDeUso consultarFacturas(FacturaRepositorioPuerto facturas) {
        return new ServicioConsultarFacturas(facturas);
    }

    @Bean
    CotizarCasoDeUso cotizar(@Value("${adorbit.facturacion.negocio.tasa-impuesto}") BigDecimal tasaImpuesto) {
        return new ServicioCotizar(tasaImpuesto, UUID::randomUUID);
    }

    @Bean
    EmitirNotaCreditoCasoDeUso emitirNotaCredito(
            FacturaRepositorioPuerto facturas, IdempotenciaPuerto idempotencia, Clock reloj) {
        return new ServicioEmitirNotaCredito(facturas, idempotencia, reloj, UUID::randomUUID);
    }

    @Bean
    MarcarVencidasCasoDeUso marcarVencidas(FacturaRepositorioPuerto facturas) {
        return new ServicioMarcarVencidas(facturas);
    }
}
