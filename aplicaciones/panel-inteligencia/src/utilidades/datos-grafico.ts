import type { Reporte } from '../api/tipos';
import type { Barra } from '../componentes/grafico-barras';
import type { Punto } from '../componentes/grafico-linea';
import { numeroDeCelda, textoDeCelda } from './celdas';
import { desdeIso } from './fechas';

export type DatosGrafico =
  { tipo: 'barras'; titulo: string; barras: Barra[] } | { tipo: 'linea'; titulo: string; puntos: Punto[] };

const NUMERICOS = new Set(['numero', 'dinero', 'porcentaje']);
const mes = new Intl.DateTimeFormat('es-BO', { month: 'short' });
const mesYAnio = new Intl.DateTimeFormat('es-BO', { month: 'short', year: 'numeric' });

/**
 * Convierte la sugerencia de grafico del reporte en datos dibujables. Devuelve null cuando no conviene graficar:
 * la guia de visualizacion pide no hacer un grafico de una sola barra o punto (esa cifra ya sale en los indicadores).
 */
export function datosDeGrafico(reporte: Reporte): DatosGrafico | null {
  const g = reporte.grafico;
  if (!g || reporte.filas.length < 2) return null;
  const colX = reporte.columnas.find((c) => c.clave === g.x);
  const colY = reporte.columnas.find((c) => c.clave === g.y);
  if (!colX || !colY || !NUMERICOS.has(colY.tipo)) return null;

  if (g.tipo === 'barras') {
    const barras = reporte.filas
      .map((fila) => ({
        etiqueta: textoDeCelda(colX, fila[colX.clave]),
        valor: numeroDeCelda(fila[colY.clave]),
        texto: textoDeCelda(colY, fila[colY.clave]),
      }))
      .sort((a, b) => b.valor - a.valor); // ranking: de mayor a menor
    return { tipo: 'barras', titulo: colY.etiqueta, barras };
  }

  const puntos = reporte.filas.map((fila, i, todas) => {
    const crudo = fila[colX.clave];
    const esFecha = colX.tipo === 'fecha' && typeof crudo === 'string';
    const fecha = esFecha ? desdeIso(crudo) : null;
    const anterior = i > 0 && todas[i - 1] ? todas[i - 1]?.[colX.clave] : undefined;
    const cambiaAnio =
      fecha &&
      (i === 0 || (typeof anterior === 'string' && desdeIso(anterior).getFullYear() !== fecha.getFullYear()));
    return {
      etiqueta: fecha ? mesYAnio.format(fecha) : textoDeCelda(colX, crudo),
      etiquetaEje: fecha
        ? cambiaAnio
          ? mesYAnio.format(fecha)
          : mes.format(fecha)
        : textoDeCelda(colX, crudo),
      valor: numeroDeCelda(fila[colY.clave]),
      texto: textoDeCelda(colY, fila[colY.clave]),
    };
  });
  return { tipo: 'linea', titulo: colY.etiqueta, puntos };
}
