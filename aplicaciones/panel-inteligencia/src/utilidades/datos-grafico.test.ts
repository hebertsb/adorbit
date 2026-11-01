import { reporteCampanas, reporteMensual } from '../pruebas/ayudas';
import { datosDeGrafico } from './datos-grafico';

describe('datosDeGrafico', () => {
  it('ordena las barras de mayor a menor y formatea el valor', () => {
    const d = datosDeGrafico(reporteCampanas);
    expect(d?.tipo).toBe('barras');
    if (d?.tipo !== 'barras') return;
    expect(d.barras.map((b) => b.etiqueta)).toEqual(['Verano 2027', 'Café Andino', 'Navidad 2026']);
    expect(d.barras[0]).toMatchObject({ valor: 31250, texto: 'Bs 31.250,00' });
  });

  it('mantiene el orden cronologico de la linea y abrevia los meses', () => {
    const d = datosDeGrafico(reporteMensual);
    expect(d?.tipo).toBe('linea');
    if (d?.tipo !== 'linea') return;
    expect(d.puntos.map((p) => p.valor)).toEqual([2500, 6875, 5000]);
    expect(d.puntos[0]?.etiquetaEje).toMatch(/sep/i);
    expect(d.puntos[0]?.etiquetaEje).toMatch(/2026/); // el primer punto lleva el año
    expect(d.puntos[1]?.etiquetaEje).toMatch(/oct/i);
    expect(d.puntos[1]?.etiquetaEje).not.toMatch(/2026/);
  });

  it('no grafica una sola fila ni un grafico sin sugerencia', () => {
    expect(datosDeGrafico({ ...reporteCampanas, filas: reporteCampanas.filas.slice(0, 1) })).toBeNull();
    expect(datosDeGrafico({ ...reporteCampanas, grafico: null })).toBeNull();
  });

  it('descarta una medida que no es numerica o una columna inexistente', () => {
    expect(
      datosDeGrafico({ ...reporteCampanas, grafico: { tipo: 'barras', x: 'nombre', y: 'nombre' } }),
    ).toBeNull();
    expect(
      datosDeGrafico({ ...reporteCampanas, grafico: { tipo: 'barras', x: 'nope', y: 'gasto' } }),
    ).toBeNull();
  });
});
