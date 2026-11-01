import type { Factura } from '../api/tipos';
import { resumirFacturas } from './resumen';

const base: Factura = {
  id: '1',
  cliente_id: 'c',
  campana_id: 'k',
  estado: 'emitida',
  moneda: 'BOB',
  subtotal: '0.00',
  impuestos: '0.00',
  total: '100.00',
  saldo: '100.00',
  fecha_emision: '2026-10-01',
  fecha_vencimiento: '2026-12-01',
  version: 1,
  items: [],
  cobros: [],
};
const factura = (cambios: Partial<Factura>): Factura => ({ ...base, ...cambios });
const hoy = new Date(2026, 10, 5);

describe('resumirFacturas', () => {
  it('separa por moneda y no mezcla Bs con US$', () => {
    const r = resumirFacturas(
      [factura({ saldo: '100.00' }), factura({ moneda: 'USD', saldo: '30.00' })],
      hoy,
    );
    expect(r.map((x) => [x.moneda, x.saldoPendiente])).toEqual([
      ['BOB', '100.00'],
      ['USD', '30.00'],
    ]);
  });

  it('ignora pagadas y anuladas', () => {
    const r = resumirFacturas(
      [factura({ estado: 'pagada', saldo: '0.00' }), factura({ estado: 'anulada' })],
      hoy,
    );
    expect(r).toEqual([]);
  });

  it('cuenta vencidas y busca el proximo vencimiento entre las que no vencieron', () => {
    const r = resumirFacturas(
      [
        factura({ id: 'a', estado: 'vencida', saldo: '50.00', fecha_vencimiento: '2026-10-20' }),
        factura({ id: 'b', saldo: '70.00', fecha_vencimiento: '2026-11-20' }),
        factura({ id: 'c', estado: 'pagada_parcial', saldo: '10.50', fecha_vencimiento: '2026-11-10' }),
      ],
      hoy,
    );
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({
      saldoPendiente: '130.50',
      facturasAbiertas: 3,
      facturasVencidas: 1,
      saldoVencido: '50.00',
      proximoVencimiento: '2026-11-10',
    });
  });
});
