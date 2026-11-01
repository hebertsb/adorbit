import { fireEvent, render, screen } from '@testing-library/react';
import { GraficoLinea } from './grafico-linea';

const puntos = [
  { etiqueta: 'sep 2026', etiquetaEje: 'sep 2026', valor: 2500, texto: 'Bs 2.500,00' },
  { etiqueta: 'oct 2026', etiquetaEje: 'oct', valor: 6875, texto: 'Bs 6.875,00' },
  { etiqueta: 'nov 2026', etiquetaEje: 'nov', valor: 5000, texto: 'Bs 5.000,00' },
];

describe('GraficoLinea', () => {
  it('dibuja la linea, el punto final con su valor y las marcas del eje', () => {
    const { container } = render(<GraficoLinea puntos={puntos} titulo="Gasto" />);
    expect(container.querySelector('.linea__trazo')).toBeInTheDocument();
    expect(container.querySelector('.linea__area')).toBeInTheDocument();
    expect(container.querySelectorAll('.linea__punto')).toHaveLength(1); // solo el final: no hay un numero en cada punto
    expect(container.querySelector('.linea__valor')).toHaveTextContent('Bs 5.000,00');
    expect(container.querySelector('.linea__marca')).toHaveTextContent('0');
  });

  it('se recorre con las flechas y anuncia el punto actual', () => {
    render(<GraficoLinea puntos={puntos} titulo="Gasto" />);
    const grafico = screen.getByRole('group', { name: /3 puntos, de sep 2026 a nov 2026/ });
    fireEvent.focus(grafico);
    expect(screen.getByRole('tooltip')).toHaveTextContent('Bs 5.000,00'); // empieza en el ultimo
    fireEvent.keyDown(grafico, { key: 'ArrowLeft' });
    expect(screen.getByRole('tooltip')).toHaveTextContent('Bs 6.875,00');
    fireEvent.keyDown(grafico, { key: 'ArrowLeft' });
    fireEvent.keyDown(grafico, { key: 'ArrowLeft' }); // tope: no se sale del rango
    expect(screen.getByRole('tooltip')).toHaveTextContent('Bs 2.500,00');
    fireEvent.keyDown(grafico, { key: 'Escape' });
    expect(screen.queryByRole('tooltip')).toBeNull();
  });
});
