import { useMemo, useState } from 'react';
import type { Barra } from './grafico-barras';

const COLORES = ['#7c83ff', '#38bdf8', '#34d399', '#fbbf24', '#fb7185', '#a78bfa', '#22d3ee', '#f97316'];

export function GraficoAnillo({ barras, titulo }: { barras: readonly Barra[]; titulo: string }) {
  const visibles = barras.slice(0, 8);
  const total = visibles.reduce((suma, barra) => suma + Math.max(0, barra.valor), 0);
  const [activa, setActiva] = useState(0);
  const segmentos = useMemo(() => {
    let acumulado = 0;
    return visibles.map((barra, indice) => {
      const inicio = total ? (acumulado / total) * 100 : 0;
      acumulado += Math.max(0, barra.valor);
      const fin = total ? (acumulado / total) * 100 : 0;
      return `${COLORES[indice % COLORES.length]} ${inicio}% ${fin}%`;
    });
  }, [visibles, total]);
  const seleccionada = visibles[activa];
  const porcentaje = seleccionada && total ? (seleccionada.valor / total) * 100 : 0;

  return (
    <div className="anillo-layout">
      <figure
        className="anillo"
        aria-label={`Distribución de ${titulo}`}
        style={{ background: `conic-gradient(${segmentos.join(',')})` }}
      >
        <div className="anillo__centro">
          <strong>{porcentaje.toLocaleString('es-BO', { maximumFractionDigits: 1 })} %</strong>
          <span>{seleccionada?.texto ?? '—'}</span>
        </div>
      </figure>
      <div className="anillo__leyenda" role="list" aria-label="Categorías de la distribución">
        {visibles.map((barra, indice) => (
          <button
            key={`${barra.etiqueta}-${indice}`}
            type="button"
            role="listitem"
            className={activa === indice ? 'anillo__item anillo__item--activo' : 'anillo__item'}
            onPointerEnter={() => setActiva(indice)}
            onFocus={() => setActiva(indice)}
            onClick={() => setActiva(indice)}
          >
            <span className="anillo__punto" style={{ background: COLORES[indice % COLORES.length] }} />
            <span className="anillo__nombre">{barra.etiqueta}</span>
            <strong>{barra.texto}</strong>
          </button>
        ))}
      </div>
    </div>
  );
}
