import { vi } from 'vitest';
import type { Reporte } from '../api/tipos';

export function respuestaJson(cuerpo: unknown, estado = 200): Response {
  return new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { 'Content-Type': 'application/json' },
  });
}

export const reporteCampanas: Reporte = {
  id: '11111111-1111-4111-8111-111111111111',
  pregunta: 'Campañas activas',
  titulo: 'Campañas activas',
  generado_en: '2026-11-01T20:00:00.000Z',
  interpretacion: { herramienta: 'consultar_campanas', parametros: { estado: 'activa' } },
  columnas: [
    { clave: 'nombre', etiqueta: 'Campaña', tipo: 'texto' },
    { clave: 'gasto', etiqueta: 'Gasto', tipo: 'dinero', moneda: 'BOB' },
    { clave: 'ejecucion', etiqueta: 'Ejecución', tipo: 'porcentaje' },
  ],
  filas: [
    { nombre: 'Verano 2027', gasto: '31250.00', ejecucion: '65.1' },
    { nombre: 'Navidad 2026', gasto: '5200.00', ejecucion: '6.5' },
    { nombre: 'Café Andino', gasto: '12400.50', ejecucion: '41.3' },
  ],
  indicadores: [
    { etiqueta: 'Gasto total', valor: '48850.50', tipo: 'dinero', moneda: 'BOB' },
    { etiqueta: 'Campañas', valor: '3', tipo: 'numero' },
  ],
  grafico: { tipo: 'barras', x: 'nombre', y: 'gasto' },
  advertencias: [],
};

export const reporteMensual: Reporte = {
  ...reporteCampanas,
  id: '22222222-2222-4222-8222-222222222222',
  pregunta: 'Gasto de Verano 2027 por mes',
  titulo: 'Gasto mensual · Verano 2027',
  interpretacion: { herramienta: 'resumen_gasto_campana', parametros: { campana: 'Verano 2027' } },
  columnas: [
    { clave: 'mes', etiqueta: 'Mes', tipo: 'fecha' },
    { clave: 'gasto', etiqueta: 'Gasto', tipo: 'dinero', moneda: 'BOB' },
  ],
  filas: [
    { mes: '2026-09-01', gasto: '2500.00' },
    { mes: '2026-10-01', gasto: '6875.00' },
    { mes: '2026-11-01', gasto: '5000.00' },
  ],
  indicadores: [],
  grafico: { tipo: 'linea', x: 'mes', y: 'gasto' },
};

/** Doble de la API de voz del navegador: `emitir` simula lo que el usuario dicta. */
export function instalarVozFalsa() {
  const instancias: Array<{
    onresult?: (e: unknown) => void;
    onerror?: (e: unknown) => void;
    onend?: () => void;
  }> = [];
  class VozFalsa {
    lang = '';
    continuous = true;
    interimResults = false;
    processLocally = false;
    onresult?: (e: unknown) => void;
    onerror?: (e: unknown) => void;
    onend?: () => void;
    start = vi.fn();
    stop = vi.fn(() => this.onend?.());
    abort = vi.fn();
    constructor() {
      instancias.push(this);
    }
  }
  (window as unknown as { webkitSpeechRecognition: unknown }).webkitSpeechRecognition = VozFalsa;
  return {
    instancias,
    emitir: (texto: string) => instancias.at(-1)?.onresult?.({ results: [[{ transcript: texto }]] }),
    fallar: (codigo: string) => instancias.at(-1)?.onerror?.({ error: codigo }),
    quitar: () => delete (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition,
  };
}
