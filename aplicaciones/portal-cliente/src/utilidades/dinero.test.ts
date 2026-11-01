import { aCentavos, deCentavos, formatearDinero, porcentaje, restar, sumar } from './dinero';

describe('dinero', () => {
  it('suma sin errores de coma flotante', () => {
    expect(sumar(['0.10', '0.20'])).toBe('0.30');
    expect(sumar(['1250.50', '0.01', '99999999.99'])).toBe('100001250.50');
    expect(sumar([])).toBe('0.00');
  });

  it('normaliza a dos decimales', () => {
    expect(aCentavos('50')).toBe(5000n);
    expect(aCentavos('50.5')).toBe(5050n);
    expect(deCentavos(5n)).toBe('0.05');
  });

  it('resta y admite negativos', () => {
    expect(restar('10.00', '0.01')).toBe('9.99');
    expect(restar('1.00', '2.50')).toBe('-1.50');
  });

  it('calcula porcentajes acotados a 0..100', () => {
    expect(porcentaje('250.00', '1000.00')).toBe(25);
    expect(porcentaje('2000.00', '1000.00')).toBe(100);
    expect(porcentaje('10.00', '0.00')).toBe(0);
  });

  it('formatea con separador de miles y la moneda correcta', () => {
    expect(formatearDinero('1250.5', 'BOB')).toBe('Bs 1.250,50');
    expect(formatearDinero('1234567.00', 'USD')).toBe('US$ 1.234.567,00');
    expect(formatearDinero('-3.00', 'BOB')).toBe('-Bs 3,00');
  });
});
