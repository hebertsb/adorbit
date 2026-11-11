import type { Columna, Moneda, Reporte } from '../api/tipos';
import { textoDeCelda } from './celdas';
import { formatearDinero, sumar } from './dinero';

const MAX_FILAS = 10;
const MAX_ANALISIS = 600;
const fechaHora = new Intl.DateTimeFormat('es-BO', { dateStyle: 'medium', timeStyle: 'short' });
const esIdentificador = (clave: string) => clave === 'id' || clave.endsWith('_id');

/**
 * Quita del texto de la IA lo que WhatsApp no sabe mostrar: tablas Markdown (que
 * llegan con UUIDs y barras), encabezados `#` y negritas dobles `**` (WhatsApp usa `*`).
 */
export function limpiarAnalisis(texto: string | null | undefined): string {
  if (!texto) return '';
  const lineas = texto
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => !l.startsWith('|') && !/^[-:| ]+$/.test(l))
    .map((l) => l.replace(/^#{1,6}\s*/, '').replace(/\*\*(.+?)\*\*/g, '*$1*').replace(/^[-•]\s+/, '• '));
  const limpio = lineas.join('\n').replace(/\n{3,}/g, '\n\n').trim();
  return limpio.length > MAX_ANALISIS ? `${limpio.slice(0, MAX_ANALISIS).trimEnd()}…` : limpio;
}

function describirParametros(parametros: Record<string, unknown>): string {
  const pares = Object.entries(parametros);
  return pares.length === 0 ? '' : ` (${pares.map(([k, v]) => `${k} = ${String(v)}`).join(', ')})`;
}

/** Suma la primera columna de dinero visible, separada por moneda (Bs y US$ nunca se mezclan). */
function totalesDinero(reporte: Reporte, columnas: Columna[]): string[] {
  const columna = columnas.find((c) => c.tipo === 'dinero');
  if (!columna) return [];
  const porMoneda = new Map<Moneda, string[]>();
  for (const fila of reporte.filas) {
    const valor = fila[columna.clave];
    if (valor === null || valor === undefined || valor === '') continue;
    const moneda = (fila['moneda'] === 'USD' ? 'USD' : (columna.moneda ?? 'BOB')) as Moneda;
    porMoneda.set(moneda, [...(porMoneda.get(moneda) ?? []), String(valor)]);
  }
  return [...porMoneda.entries()].map(
    ([moneda, montos]) => `• ${columna.etiqueta} (suma): *${formatearDinero(sumar(montos), moneda)}*`,
  );
}

/**
 * Mensaje de WhatsApp del reporte, con el mismo estilo que las alertas de n8n: cabecera,
 * resumen, detalle legible (solo las columnas visibles y sin identificadores técnicos)
 * y el análisis de la IA sin tablas.
 */
export function mensajeWhatsApp(reporte: Reporte, columnasVisibles: Columna[], enlace: string): string {
  const columnasNegocio = columnasVisibles.filter((c) => !esIdentificador(c.clave));
  const columnas = columnasNegocio.length > 0 ? columnasNegocio : columnasVisibles;
  const filas = reporte.filas.slice(0, MAX_FILAS);

  const partes: string[] = [
    '🏛️ *ADORBIT · REPORTE EJECUTIVO*',
    '━━━━━━━━━━━━━━━━━━━━',
    `📋 *${reporte.titulo}*`,
    `🔍 _«${reporte.pregunta}»_`,
    `📅 ${fechaHora.format(new Date(reporte.generado_en))}`,
    `🛡️ Consulta: ${reporte.interpretacion.herramienta}${describirParametros(reporte.interpretacion.parametros)}`,
    '',
    '📊 *RESUMEN*',
    `• Registros: *${reporte.filas.length}*`,
    ...totalesDinero(reporte, columnas),
  ];

  const [primera, ...resto] = columnas;
  if (filas.length > 0 && primera) {
    partes.push('', `🧾 *DETALLE*${reporte.filas.length > MAX_FILAS ? ` (primeros ${MAX_FILAS})` : ''}`);
    filas.forEach((fila, i) => {
      partes.push(`*${i + 1}.* ${textoDeCelda(primera, fila[primera.clave])}`);
      for (const c of resto) {
        partes.push(`     ${c.etiqueta}: ${textoDeCelda(c, fila[c.clave])}`);
      }
    });
    if (reporte.filas.length > MAX_FILAS) {
      partes.push(`_…y ${reporte.filas.length - MAX_FILAS} registros más en el reporte completo._`);
    }
  }

  const analisis = limpiarAnalisis(reporte.respuesta_nl);
  if (analisis) {
    partes.push('', '🧠 *ANÁLISIS DE LA IA*', analisis);
  }

  partes.push(
    '',
    '━━━━━━━━━━━━━━━━━━━━',
    `🌐 Ver reporte completo: ${enlace}`,
    '_AdOrbit · Dirección de Inteligencia y Operaciones_',
  );
  return partes.join('\n');
}
