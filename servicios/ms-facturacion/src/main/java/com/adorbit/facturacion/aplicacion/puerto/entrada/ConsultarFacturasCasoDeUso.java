package com.adorbit.facturacion.aplicacion.puerto.entrada;

import com.adorbit.facturacion.aplicacion.puerto.salida.Pagina;
import com.adorbit.facturacion.dominio.EstadoFactura;
import com.adorbit.facturacion.dominio.Factura;
import java.util.Optional;
import java.util.UUID;

/** Caso de uso de entrada: consultar facturas. */
public interface ConsultarFacturasCasoDeUso {

    Optional<Factura> obtener(UUID id);

    /** Requiere cliente o estado; sin ninguno lanza {@code filtro_requerido}. */
    Pagina<Factura> listar(UUID clienteId, EstadoFactura estado, int page, int size);
}
