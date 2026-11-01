package com.adorbit.facturacion.aplicacion.puerto.entrada;

import com.adorbit.facturacion.dominio.ItemFactura;
import com.adorbit.facturacion.dominio.Moneda;
import com.adorbit.facturacion.dominio.Totales;
import java.util.List;
import java.util.UUID;

/** Caso de uso de entrada: calcular una cotizacion. No persiste ni genera factura. */
public interface CotizarCasoDeUso {

    Cotizacion cotizar(UUID clienteId, Moneda moneda, List<ItemFactura> items);

    record Cotizacion(UUID id, UUID clienteId, Moneda moneda, List<ItemFactura> items, Totales totales) {}
}
