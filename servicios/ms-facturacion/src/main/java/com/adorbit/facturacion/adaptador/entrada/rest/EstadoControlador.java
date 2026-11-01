package com.adorbit.facturacion.adaptador.entrada.rest;

import com.adorbit.facturacion.aplicacion.puerto.entrada.ConsultarEstadoCasoDeUso;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/** Endpoints de salud (publicos, sin JWT). */
@RestController
public class EstadoControlador {

    private final ConsultarEstadoCasoDeUso consultarEstado;

    public EstadoControlador(ConsultarEstadoCasoDeUso consultarEstado) {
        this.consultarEstado = consultarEstado;
    }

    @GetMapping("/salud")
    public ResponseEntity<Map<String, String>> salud() {
        return respuesta(consultarEstado.estaVivo(), "vivo");
    }

    @GetMapping("/listo")
    public ResponseEntity<Map<String, String>> listo() {
        return respuesta(consultarEstado.estaListo(), "listo");
    }

    private ResponseEntity<Map<String, String>> respuesta(boolean ok, String etiqueta) {
        if (ok) {
            return ResponseEntity.ok(Map.of("estado", etiqueta));
        }
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(Map.of("estado", "no_" + etiqueta));
    }
}
