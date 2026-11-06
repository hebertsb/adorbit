import { fireEvent, render, screen } from '@testing-library/react';
import { GraficoBarras, MAXIMO_BARRAS } from './grafico-barras';

const barras = [
  { etiqueta: 'Verano 2027', valor: 100, texto: 'Bs 100,00' },
  { etiqueta: 'Navidad 2026', valor: 50, texto: 'Bs 50,00' },
];

describe('GraficoBarras', () => {
  it('dibuja una fila por categoria con el largo proporcional a su valor', () => {
    const { container } = render(<GraficoBarras barras={barras} titulo="Gasto" />);
    const filas = screen.getAllByRole('listitem');
    expect(filas).toHaveLength(2);
    const anchos = [...container.querySelectorAll<HTMLElement>('.barras__barra')].map((b) => b.style.width);
    expect(anchos).toEqual(['100%', '50%']);
  });

  it('cada fila tiene nombre accesible con categoria y valor, y se puede enfocar', () => {
    render(<GraficoBarras barras={barras} titulo="Gasto" />);
    const fila = screen.getByRole('listitem', { name: 'Navidad 2026: Bs 50,00' });
    expect(fila).toHaveAttribute('tabindex', '0');
  });

  it('muestra el valor y la categoria en un tooltip al enfocar con el teclado, y lo oculta al salir', () => {
    render(<GraficoBarras barras={barras} titulo="Gasto" />);
    const fila = screen.getByRole('listitem', { name: 'Verano 2027: Bs 100,00' });
    fireEvent.focus(fila);
    const tip = screen.getByRole('tooltip');
    expect(tip).toHaveTextContent('Bs 100,00');
    expect(tip).toHaveTextContent('Verano 2027');
    fireEvent.blur(fila);
    expect(screen.queryByRole('tooltip')).toBeNull();
  });

  it('el tooltip tambien responde al puntero', () => {
    render(<GraficoBarras barras={barras} titulo="Gasto" />);
    fireEvent.pointerMove(screen.getByRole('listitem', { name: /Navidad/ }), { clientX: 30, clientY: 20 });
    expect(screen.getByRole('tooltip')).toHaveTextContent('Bs 50,00');
  });

  it('limita las barras y avisa que el detalle completo esta en la tabla', () => {
    const muchas = Array.from({ length: 15 }, (_, i) => ({
      etiqueta: `Cat ${i}`,
      valor: 100 - i,
      texto: `Bs ${100 - i},00`,
    }));
    render(<GraficoBarras barras={muchas} titulo="Gasto" />);
    expect(screen.getAllByRole('listitem')).toHaveLength(MAXIMO_BARRAS);
    expect(screen.getByText(/primeras 12 de 15/)).toBeInTheDocument();
  });

  it('las etiquetas se insertan como texto (nunca como HTML)', () => {
    const { container } = render(
      <GraficoBarras
        barras={[
          { etiqueta: '<img src=x onerror=alert(1)>', valor: 5, texto: '5' },
          { etiqueta: 'b', valor: 1, texto: '1' },
        ]}
        titulo="t"
      />,
    );
    expect(container.querySelector('img')).toBeNull();
    expect(screen.getByText('<img src=x onerror=alert(1)>')).toBeInTheDocument();
  });
});
