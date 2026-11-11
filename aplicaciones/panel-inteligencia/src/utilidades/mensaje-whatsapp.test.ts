import { describe, expect, it } from 'vitest';
import type { Reporte } from '../api/tipos';
import { limpiarAnalisis, mensajeWhatsApp } from './mensaje-whatsapp';

const reporte: Reporte = {
  id: 'r1',
  pregunta: 'Dame las facturas que vencen en los próximos 30 días',
  titulo: 'Facturas por vencer',
  generado_en: '2026-11-10T20:21:00Z',
  interpretacion: { herramienta: 'facturas_por_vencer', parametros: { dias: 30 } },
  columnas: [
    { clave: 'factura_id', etiqueta: 'ID de factura', tipo: 'texto' },
    { clave: 'estado', etiqueta: 'Estado', tipo: 'texto' },
    { clave: 'total', etiqueta: 'Total', tipo: 'dinero', moneda: 'BOB' },
    { clave: 'fecha_vencimiento', etiqueta: 'Fecha de vencimiento', tipo: 'fecha' },
  ],
  filas: [
    { factura_id: 'f9', estado: 'EMITIDA', total: '160000.00', moneda: 'BOB', fecha_vencimiento: '2026-11-13' },
    { factura_id: 'f1', estado: 'EMITIDA', total: '185000.00', moneda: 'BOB', fecha_vencimiento: '2026-11-15' },
  ],
  respuesta_nl: 'Facturas que vencen:\n\n| factura_id | total |\n|---|---|\n| f9 | 160000 |\n\n**Total:** 345.000 Bs',
};

describe('mensajeWhatsApp', () => {
  it('no incluye tablas markdown ni identificadores y suma el dinero', () => {
    const texto = mensajeWhatsApp(reporte, reporte.columnas, 'http://x/reportes');
    expect(texto).not.toContain('|');
    expect(texto).not.toContain('f9');
    expect(texto).toContain('Registros: *2*');
    expect(texto).toMatch(/345\.000,00/);
  });

  it('limpia negritas dobles', () => {
    expect(limpiarAnalisis('**Hola**')).toBe('*Hola*');
  });
});
