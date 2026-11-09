import type { Barra } from './grafico-barras';

export function ResumenVisual({ elementos }: { elementos: readonly Barra[] }) {
  const maximo = Math.max(...elementos.map((elemento) => elemento.valor), 1);
  return (
    <div className="resumen-visual" role="list" aria-label="Resumen en tarjetas">
      {elementos.slice(0, 8).map((elemento, indice) => (
        <article className="resumen-visual__tarjeta" role="listitem" key={`${elemento.etiqueta}-${indice}`}>
          <span className="resumen-visual__posicion">{String(indice + 1).padStart(2, '0')}</span>
          <div>
            <p>{elemento.etiqueta}</p>
            <strong>{elemento.texto}</strong>
          </div>
          <span className="resumen-visual__progreso" aria-hidden="true">
            <span style={{ width: `${(elemento.valor / maximo) * 100}%` }} />
          </span>
        </article>
      ))}
    </div>
  );
}
