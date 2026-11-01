package com.adorbit.facturacion.configuracion;

import com.adorbit.facturacion.aplicacion.puerto.entrada.ConsultarEstadoCasoDeUso;
import com.adorbit.facturacion.aplicacion.puerto.salida.VerificarAlmacenamientoPuerto;
import com.adorbit.facturacion.aplicacion.servicio.ServicioEstado;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/** Cablea los casos de uso con sus puertos de salida (el nucleo no conoce Spring). */
@Configuration
public class AplicacionConfiguracion {

    @Bean
    ConsultarEstadoCasoDeUso consultarEstado(VerificarAlmacenamientoPuerto almacenamiento) {
        return new ServicioEstado(almacenamiento);
    }
}
