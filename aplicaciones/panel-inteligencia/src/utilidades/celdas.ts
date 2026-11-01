import type { Columna, Fila } from '../api/tipos';
import { formatearDinero } from './dinero';
import { formatearFecha } from './fechas';

/** Texto que ve el usuario para el valor de una celda segun el tipo de su columna. */
export function textoDeCelda(columna: Columna, valor: Fila[string]): string {
  if (valor === null || valor === undefined || valor === '') return '—';
  const texto = String(valor);
  switch (columna.tipo) {
    case 'dinero':
      return formatearDinero(texto, columna.moneda ?? 'BOB');
    case 'porcentaje':
      return `${texto.replace('.', ',')} %`;
    case 'fecha':
      return formatearFecha(texto);
    case 'numero':
      return Number(texto).toLocaleString('es-BO');
    default:
      return texto;
  }
}

/** Numero para dibujar (solo para escalas y longitudes; el texto mostrado sale de `textoDeCelda`). */
export function numeroDeCelda(valor: Fila[string]): number {
  const n = Number(valor);
  return Number.isFinite(n) ? n : 0;
}
