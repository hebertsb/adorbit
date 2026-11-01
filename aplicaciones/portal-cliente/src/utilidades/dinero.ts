import type { Moneda } from '../api/tipos';

/** El dinero viaja como texto decimal ("1250.50"). Las sumas se hacen en centavos enteros: nunca con float. */
export function aCentavos(monto: string): bigint {
  const [entero = '0', decimales = ''] = monto.split('.');
  const signo = entero.startsWith('-') ? -1n : 1n;
  const parteEntera = BigInt(entero.replace('-', '') || '0');
  return signo * (parteEntera * 100n + BigInt((decimales + '00').slice(0, 2)));
}

export function deCentavos(centavos: bigint): string {
  const negativo = centavos < 0n;
  const absoluto = negativo ? -centavos : centavos;
  const texto = `${absoluto / 100n}.${(absoluto % 100n).toString().padStart(2, '0')}`;
  return negativo ? `-${texto}` : texto;
}

export function sumar(montos: readonly string[]): string {
  return deCentavos(montos.reduce((acumulado, monto) => acumulado + aCentavos(monto), 0n));
}

export function restar(a: string, b: string): string {
  return deCentavos(aCentavos(a) - aCentavos(b));
}

/** Porcentaje entero 0..100 de `parte` sobre `total` (para barras de uso). */
export function porcentaje(parte: string, total: string): number {
  const t = aCentavos(total);
  if (t <= 0n) return 0;
  const p = (aCentavos(parte) * 100n) / t;
  return Number(p > 100n ? 100n : p < 0n ? 0n : p);
}

const SIMBOLOS: Record<Moneda, string> = { BOB: 'Bs', USD: 'US$' };

/** Solo para mostrar: "Bs 1.250,50". El formato numerico se hace sobre el texto, sin pasar por Number. */
export function formatearDinero(monto: string, moneda: Moneda): string {
  const centavos = aCentavos(monto);
  const negativo = centavos < 0n;
  const absoluto = negativo ? -centavos : centavos;
  const entero = (absoluto / 100n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const decimales = (absoluto % 100n).toString().padStart(2, '0');
  return `${negativo ? '-' : ''}${SIMBOLOS[moneda]} ${entero},${decimales}`;
}
