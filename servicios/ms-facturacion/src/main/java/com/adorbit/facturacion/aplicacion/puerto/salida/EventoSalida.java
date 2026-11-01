package com.adorbit.facturacion.aplicacion.puerto.salida;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

/** Evento de dominio a publicar. Se guarda en la bandeja de salida dentro de la misma transaccion. */
public record EventoSalida(
        UUID idEvento,
        String tipoEvento,
        UUID agregadoId,
        String correlacionId,
        Instant ocurridoEn,
        Map<String, Object> carga) {}
