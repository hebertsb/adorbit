package com.adorbit.facturacion.dominio;

/** Linea de una factura o cotizacion. */
public record ItemFactura(int numero, String descripcion, int cantidad, Dinero precioUnitario) {

    public ItemFactura {
        if (descripcion == null || descripcion.isBlank() || descripcion.length() > 200) {
            throw new ExcepcionDominio("item_invalido", "La descripcion es obligatoria (maximo 200 caracteres)");
        }
        if (cantidad < 1) {
            throw new ExcepcionDominio("item_invalido", "La cantidad debe ser al menos 1");
        }
    }

    public Dinero subtotal() {
        return precioUnitario.multiplicar(cantidad);
    }
}
