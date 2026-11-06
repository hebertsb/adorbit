import { escalaAmigable, formatoCompacto, marcasDelEje } from './escala';

describe('escala', () => {
  it('redondea el maximo a una escala limpia', () => {
    expect(escalaAmigable(31250)).toEqual({ maximo: 40000, paso: 10000 });
    expect(escalaAmigable(100)).toEqual({ maximo: 100, paso: 25 });
    expect(escalaAmigable(9)).toEqual({ maximo: 10, paso: 2.5 });
    expect(escalaAmigable(0).maximo).toBeGreaterThan(0);
  });

  it('genera marcas desde cero hasta el maximo', () => {
    expect(marcasDelEje(40000, 10000)).toEqual([0, 10000, 20000, 30000, 40000]);
    expect(marcasDelEje(1, 0.25)).toEqual([0, 0.25, 0.5, 0.75, 1]);
  });

  it('abrevia desde 1.000 con coma decimal', () => {
    expect(formatoCompacto(0)).toBe('0');
    expect(formatoCompacto(750)).toBe('750');
    expect(formatoCompacto(1000)).toBe('1K');
    expect(formatoCompacto(2500)).toBe('2,5K');
    expect(formatoCompacto(1_200_000)).toBe('1,2M');
  });
});
