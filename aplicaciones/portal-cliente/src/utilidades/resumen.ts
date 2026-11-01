import type { Factura, Moneda } from '../api/tipos';
import { diasHasta } from './fechas';
import { sumar } from './dinero';

export interface ResumenMoneda {
  moneda: Moneda;
  saldoPendiente: string;
  facturasAbiertas: number;
  facturasVencidas: number;
  saldoVencido: string;
  /** Vencimiento mas cercano entre las facturas abiertas que aun no vencieron. */
  proximoVencimiento: string | null;
}

const ABIERTAS = new Set(['emitida', 'pagada_parcial', 'vencida']);

/** Una fila por moneda: nunca se mezclan Bs y US$. */
export function resumirFacturas(facturas: readonly Factura[], hoy: Date = new Date()): ResumenMoneda[] {
  const porMoneda = new Map<Moneda, Factura[]>();
  for (const factura of facturas) {
    if (!ABIERTAS.has(factura.estado)) continue;
    porMoneda.set(factura.moneda, [...(porMoneda.get(factura.moneda) ?? []), factura]);
  }
  return [...porMoneda.entries()]
    .map(([moneda, abiertas]) => {
      const vencidas = abiertas.filter((f) => f.estado === 'vencida');
      const pendientes = abiertas
        .filter((f) => f.estado !== 'vencida' && diasHasta(f.fecha_vencimiento, hoy) >= 0)
        .map((f) => f.fecha_vencimiento)
        .sort();
      return {
        moneda,
        saldoPendiente: sumar(abiertas.map((f) => f.saldo)),
        facturasAbiertas: abiertas.length,
        facturasVencidas: vencidas.length,
        saldoVencido: sumar(vencidas.map((f) => f.saldo)),
        proximoVencimiento: pendientes[0] ?? null,
      };
    })
    .sort((a, b) => a.moneda.localeCompare(b.moneda));
}
