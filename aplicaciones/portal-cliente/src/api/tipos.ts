/** Tipos de las respuestas REST. Fuente: contratos/openapi/ms-facturacion.yaml y ms-clientes-crm.yaml. */
export type Moneda = 'BOB' | 'USD';

export type EstadoFactura = 'emitida' | 'pagada_parcial' | 'pagada' | 'vencida' | 'anulada';
export type EstadoContrato = 'vigente' | 'vencido' | 'rescindido';
export type EstadoCliente = 'activo' | 'inactivo' | 'moroso';

export interface ItemFactura {
  numero: number;
  descripcion: string;
  cantidad: number;
  precio_unitario: string;
  subtotal: string;
}

export interface Cobro {
  id: string;
  factura_id: string;
  monto: string;
  fecha: string;
  referencia?: string | null;
}

export interface Factura {
  id: string;
  cliente_id: string;
  campana_id: string;
  estado: EstadoFactura;
  moneda: Moneda;
  subtotal: string;
  impuestos: string;
  total: string;
  saldo: string;
  fecha_emision: string;
  fecha_vencimiento: string;
  version: number;
  items: ItemFactura[];
  cobros: Cobro[];
}

export interface Pagina<T> {
  contenido: T[];
  page: number;
  size: number;
  total_elementos: number;
}

export interface Contacto {
  id: string;
  nombre: string;
  email?: string;
  telefono?: string;
  rol?: string;
}

export interface LineaCredito {
  limite: string;
  usado: string;
  moneda: Moneda;
}

export interface Cliente {
  id: string;
  razon_social: string;
  nit: string | null;
  estado: EstadoCliente;
  contactos: Contacto[];
  linea_credito: LineaCredito;
}

export interface Contrato {
  id: string;
  cliente_id: string;
  estado: EstadoContrato;
  fecha_inicio: string;
  fecha_fin: string;
  monto: string;
  moneda: Moneda;
}

export interface ReservaActiva {
  reserva_id: string;
  campana_id: string;
  monto: string;
  estado: string;
}

export interface Credito {
  cliente_id: string;
  linea_credito: LineaCredito;
  disponible: string;
  reservas_activas: ReservaActiva[];
}
