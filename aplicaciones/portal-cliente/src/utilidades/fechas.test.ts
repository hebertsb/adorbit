import { desdeIso, diasHasta, formatearFecha } from './fechas';

describe('fechas', () => {
  it('interpreta la fecha en hora local (sin corrimiento de zona)', () => {
    const f = desdeIso('2026-11-05');
    expect([f.getFullYear(), f.getMonth(), f.getDate()]).toEqual([2026, 10, 5]);
  });

  it('cuenta dias respecto de hoy', () => {
    const hoy = new Date(2026, 10, 5, 18, 30);
    expect(diasHasta('2026-11-05', hoy)).toBe(0);
    expect(diasHasta('2026-11-08', hoy)).toBe(3);
    expect(diasHasta('2026-11-01', hoy)).toBe(-4);
  });

  it('muestra un guion si no hay fecha', () => {
    expect(formatearFecha(null)).toBe('—');
    expect(formatearFecha('2026-11-05')).toMatch(/2026/);
  });
});
