import { useQuery } from '@tanstack/react-query';
import { configuracion } from '../configuracion';
import { obtenerJson } from './cliente-http';
import type { Cliente, Contacto, Contrato, Credito, EstadoFactura, Factura, Pagina } from './tipos';

/** Todas las claves incluyen el cliente: dos sesiones distintas jamas comparten cache. */
export function useFacturas(clienteId: string, estado: EstadoFactura | '', page: number, size: number) {
  return useQuery({
    queryKey: ['facturas', clienteId, estado, page, size],
    queryFn: () =>
      obtenerJson<Pagina<Factura>>(configuracion.apiFacturacion, '/api/v1/facturas', {
        estado,
        page,
        size,
      }),
  });
}

export function useFactura(clienteId: string, id: string) {
  return useQuery({
    queryKey: ['factura', clienteId, id],
    queryFn: () => obtenerJson<Factura>(configuracion.apiFacturacion, `/api/v1/facturas/${id}`),
  });
}

export function useContratos(clienteId: string, page: number, size: number) {
  return useQuery({
    queryKey: ['contratos', clienteId, page, size],
    queryFn: () => obtenerJson<Pagina<Contrato>>(configuracion.apiCrm, '/api/v1/contratos', { page, size }),
  });
}

export function useCredito(clienteId: string) {
  return useQuery({
    queryKey: ['credito', clienteId],
    queryFn: () => obtenerJson<Credito>(configuracion.apiCrm, `/api/v1/clientes/${clienteId}/credito`),
  });
}

export function useCliente(clienteId: string) {
  return useQuery({
    queryKey: ['cliente', clienteId],
    queryFn: () => obtenerJson<Cliente>(configuracion.apiCrm, `/api/v1/clientes/${clienteId}`),
  });
}

export function useContactos(clienteId: string) {
  return useQuery({
    queryKey: ['contactos', clienteId],
    queryFn: () => obtenerJson<Contacto[]>(configuracion.apiCrm, `/api/v1/clientes/${clienteId}/contactos`),
  });
}
