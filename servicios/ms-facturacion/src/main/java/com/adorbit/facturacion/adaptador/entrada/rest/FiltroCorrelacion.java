package com.adorbit.facturacion.adaptador.entrada.rest;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.UUID;
import org.slf4j.MDC;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/** Propaga X-Correlation-Id a los logs (MDC) y a la respuesta; lo genera si no viene. */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class FiltroCorrelacion extends OncePerRequestFilter {

    public static final String CABECERA = "X-Correlation-Id";
    public static final String CLAVE_MDC = "correlacion_id";

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        String id = request.getHeader(CABECERA);
        if (id == null || id.isBlank() || id.length() > 100) {
            id = UUID.randomUUID().toString();
        }
        MDC.put(CLAVE_MDC, id);
        response.setHeader(CABECERA, id);
        try {
            chain.doFilter(request, response);
        } finally {
            MDC.remove(CLAVE_MDC);
        }
    }
}
