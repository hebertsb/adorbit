package com.adorbit.facturacion.adaptador.entrada.rest;

import com.adorbit.facturacion.adaptador.entrada.rest.FacturaDtos.ErrorRespuesta;
import com.adorbit.facturacion.aplicacion.puerto.salida.ConflictoVersionException;
import com.adorbit.facturacion.dominio.ExcepcionDominio;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingRequestHeaderException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

/** Traduce errores a {@code { codigo, mensaje, detalle }} sin filtrar trazas ni datos internos. */
@RestControllerAdvice
public class ManejadorErrores {

    private static final Logger LOG = LoggerFactory.getLogger(ManejadorErrores.class);

    private static final Set<String> NO_ENCONTRADO = Set.of("factura_no_encontrada", "cobro_no_encontrado");
    private static final Set<String> SIN_PERMISO = Set.of("sin_permiso");
    private static final Set<String> CONFLICTO = Set.of("factura_anulada", "factura_pagada", "conflicto_version");
    private static final Set<String> NO_PROCESABLE =
            Set.of("idempotencia_conflicto", "total_no_coincide", "cobro_excede_saldo");

    @ExceptionHandler(ExcepcionDominio.class)
    ResponseEntity<ErrorRespuesta> dominio(ExcepcionDominio e) {
        HttpStatus estado = HttpStatus.BAD_REQUEST;
        if (NO_ENCONTRADO.contains(e.codigo())) {
            estado = HttpStatus.NOT_FOUND;
        } else if (SIN_PERMISO.contains(e.codigo())) {
            estado = HttpStatus.FORBIDDEN;
        } else if (CONFLICTO.contains(e.codigo())) {
            estado = HttpStatus.CONFLICT;
        } else if (NO_PROCESABLE.contains(e.codigo())) {
            estado = HttpStatus.UNPROCESSABLE_ENTITY;
        }
        return ResponseEntity.status(estado).body(new ErrorRespuesta(e.codigo(), e.getMessage(), null));
    }

    @ExceptionHandler(ConflictoVersionException.class)
    ResponseEntity<ErrorRespuesta> version(ConflictoVersionException e) {
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(new ErrorRespuesta("conflicto_version", e.getMessage(), null));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    ResponseEntity<ErrorRespuesta> validacion(MethodArgumentNotValidException e) {
        Map<String, String> campos = new LinkedHashMap<>();
        e.getBindingResult().getFieldErrors().forEach(f -> campos.put(f.getField(), f.getDefaultMessage()));
        return ResponseEntity.badRequest()
                .body(new ErrorRespuesta("solicitud_invalida", "Hay campos invalidos", campos));
    }

    @ExceptionHandler({HttpMessageNotReadableException.class, MethodArgumentTypeMismatchException.class})
    ResponseEntity<ErrorRespuesta> ilegible(Exception e) {
        return ResponseEntity.badRequest()
                .body(new ErrorRespuesta(
                        "solicitud_invalida", "Cuerpo o parametro ilegible o con campos desconocidos", null));
    }

    @ExceptionHandler(MissingRequestHeaderException.class)
    ResponseEntity<ErrorRespuesta> cabecera(MissingRequestHeaderException e) {
        return ResponseEntity.badRequest()
                .body(new ErrorRespuesta("cabecera_requerida", "Falta la cabecera " + e.getHeaderName(), null));
    }

    @ExceptionHandler(Exception.class)
    ResponseEntity<ErrorRespuesta> inesperado(Exception e) {
        LOG.error("Error no controlado", e);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new ErrorRespuesta("error_interno", "Ocurrio un error inesperado", null));
    }
}
