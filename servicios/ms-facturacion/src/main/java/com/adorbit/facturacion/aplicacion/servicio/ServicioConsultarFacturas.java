package com.adorbit.facturacion.aplicacion.servicio;

import com.adorbit.facturacion.aplicacion.puerto.entrada.ConsultarFacturasCasoDeUso;
import com.adorbit.facturacion.aplicacion.puerto.salida.FacturaRepositorioPuerto;
import com.adorbit.facturacion.aplicacion.puerto.salida.Pagina;
import com.adorbit.facturacion.dominio.EstadoFactura;
import com.adorbit.facturacion.dominio.ExcepcionDominio;
import com.adorbit.facturacion.dominio.Factura;
import java.util.Optional;
import java.util.UUID;

public class ServicioConsultarFacturas implements ConsultarFacturasCasoDeUso {

    private final FacturaRepositorioPuerto facturas;

    public ServicioConsultarFacturas(FacturaRepositorioPuerto facturas) {
        this.facturas = facturas;
    }

    @Override
    public Optional<Factura> obtener(UUID id) {
        return facturas.buscarPorId(id);
    }

    @Override
    public Pagina<Factura> listar(UUID clienteId, EstadoFactura estado, int page, int size) {
        if (page < 0 || size < 1 || size > 100) {
            throw new ExcepcionDominio("paginacion_invalida", "page >= 0 y size entre 1 y 100");
        }
        if (clienteId != null) {
            return facturas.listarPorCliente(clienteId, estado, page, size);
        }
        if (estado != null) {
            return facturas.listarPorEstado(estado, page, size);
        }
        throw new ExcepcionDominio("filtro_requerido", "Indique cliente o estado para listar facturas");
    }
}
