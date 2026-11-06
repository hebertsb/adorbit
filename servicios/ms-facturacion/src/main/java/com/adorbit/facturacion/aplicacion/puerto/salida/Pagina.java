package com.adorbit.facturacion.aplicacion.puerto.salida;

import java.util.List;

/** Pagina de resultados con el total de elementos. */
public record Pagina<T>(List<T> contenido, int page, int size, long totalElementos) {}
