import type { EstadoCliente, EstadoContrato, EstadoFactura } from '../api/tipos';

type Tono = 'ok' | 'aviso' | 'peligro' | 'info' | 'neutro';

const FACTURA: Record<EstadoFactura, [string, Tono]> = {
  emitida: ['Emitida', 'info'],
  pagada_parcial: ['Pago parcial', 'aviso'],
  pagada: ['Pagada', 'ok'],
  vencida: ['Vencida', 'peligro'],
  anulada: ['Anulada', 'neutro'],
};
const CONTRATO: Record<EstadoContrato, [string, Tono]> = {
  vigente: ['Vigente', 'ok'],
  vencido: ['Vencido', 'neutro'],
  rescindido: ['Rescindido', 'peligro'],
};
const CLIENTE: Record<EstadoCliente, [string, Tono]> = {
  activo: ['Activo', 'ok'],
  inactivo: ['Inactivo', 'neutro'],
  moroso: ['Con mora', 'peligro'],
};

/** El estado siempre va con texto: el color solo refuerza (accesible sin distinguir colores). */
export function Etiqueta({ texto, tono }: { texto: string; tono: Tono }) {
  return <span className={`etiqueta etiqueta--${tono}`}>{texto}</span>;
}

export function EtiquetaFactura({ estado }: { estado: EstadoFactura }) {
  const [texto, tono] = FACTURA[estado];
  return <Etiqueta texto={texto} tono={tono} />;
}
export function EtiquetaContrato({ estado }: { estado: EstadoContrato }) {
  const [texto, tono] = CONTRATO[estado];
  return <Etiqueta texto={texto} tono={tono} />;
}
export function EtiquetaCliente({ estado }: { estado: EstadoCliente }) {
  const [texto, tono] = CLIENTE[estado];
  return <Etiqueta texto={texto} tono={tono} />;
}

export const ESTADOS_FACTURA: { valor: EstadoFactura | ''; texto: string }[] = [
  { valor: '', texto: 'Todas' },
  { valor: 'emitida', texto: 'Emitidas' },
  { valor: 'pagada_parcial', texto: 'Pago parcial' },
  { valor: 'vencida', texto: 'Vencidas' },
  { valor: 'pagada', texto: 'Pagadas' },
  { valor: 'anulada', texto: 'Anuladas' },
];
