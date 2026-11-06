import { useState, type PointerEvent } from 'react';
import { escalaAmigable, formatoCompacto, marcasDelEje } from '../utilidades/escala';
import { useAncho } from '../utilidades/usar-ancho';

export interface Barra {
  etiqueta: string;
  valor: number;
  /** Texto ya formateado del valor (p. ej. "Bs 31.250,00"). */
  texto: string;
}

interface Propiedades {
  barras: readonly Barra[];
  /** Nombre de la medida, para el nombre accesible. */
  titulo: string;
}

interface Sugerencia {
  indice: number;
  x: number;
  y: number;
}

/** Ancho aproximado en px de un texto de 13 px en negrita (para decidir si cabe dentro de la barra). */
const anchoDelTexto = (texto: string) => texto.length * 7.4;
export const MAXIMO_BARRAS = 12;

/**
 * Barras horizontales (categorias con nombre largo). Marcas de la guia: <= 24 px de grosor, extremo de datos
 * redondeado a 4 px y base recta, valor en la punta (dentro solo si cabe), rejilla de 1 px, un solo color.
 */
export function GraficoBarras({ barras, titulo }: Propiedades) {
  const visibles = barras.slice(0, MAXIMO_BARRAS);
  const [anchoPista, referenciaPista] = useAncho(0);
  const [activa, setActiva] = useState<Sugerencia | null>(null);

  const { maximo: tope, paso } = escalaAmigable(Math.max(...visibles.map((b) => b.valor), 0), 4);
  const marcas = marcasDelEje(tope, paso);

  const mostrar = (indice: number, evento: PointerEvent<HTMLElement>) => {
    const caja = evento.currentTarget.closest('.grafico')?.getBoundingClientRect();
    if (caja) setActiva({ indice, x: evento.clientX - caja.left, y: evento.clientY - caja.top });
  };
  const mostrarPorTeclado = (indice: number, elemento: HTMLElement) => {
    const caja = elemento.closest('.grafico')?.getBoundingClientRect();
    const fila = elemento.getBoundingClientRect();
    if (caja) setActiva({ indice, x: Math.min(fila.width * 0.5, fila.width - 8), y: fila.top - caja.top });
  };

  const seleccionada = activa ? visibles[activa.indice] : undefined;

  return (
    <figure className="grafico grafico--barras">
      <div className="barras" role="list" aria-label={titulo}>
        <div className="barras__rejilla" aria-hidden="true">
          {marcas.map((m) => (
            <span key={m} style={{ left: `${(m / tope) * 100}%` }} />
          ))}
        </div>
        {visibles.map((b, i) => {
          const porcentaje = (b.valor / tope) * 100;
          const dentro = (anchoPista * porcentaje) / 100 >= anchoDelTexto(b.texto) + 16;
          return (
            <div
              key={`${b.etiqueta}-${i}`}
              role="listitem"
              tabIndex={0}
              className={`barras__fila ${activa?.indice === i ? 'barras__fila--activa' : ''}`}
              aria-label={`${b.etiqueta}: ${b.texto}`}
              onPointerMove={(e) => mostrar(i, e)}
              onPointerLeave={() => setActiva(null)}
              onFocus={(e) => mostrarPorTeclado(i, e.currentTarget)}
              onBlur={() => setActiva(null)}
            >
              <span className="barras__etiqueta" title={b.etiqueta}>
                {b.etiqueta}
              </span>
              <span className="barras__pista" ref={i === 0 ? referenciaPista : undefined}>
                <span className="barras__barra" style={{ width: `${porcentaje}%` }}>
                  {dentro && <span className="barras__valor barras__valor--dentro">{b.texto}</span>}
                </span>
                {!dentro && (
                  <span className="barras__valor" style={{ left: `calc(${porcentaje}% + 8px)` }}>
                    {b.texto}
                  </span>
                )}
              </span>
            </div>
          );
        })}
      </div>
      <div className="barras__eje" aria-hidden="true">
        <span />
        <span className="barras__marcas">
          {marcas.map((m) => (
            <span key={m} style={{ left: `${(m / tope) * 100}%` }}>
              {formatoCompacto(m)}
            </span>
          ))}
        </span>
      </div>
      {barras.length > visibles.length && (
        <figcaption className="grafico__nota">
          Se grafican las primeras {MAXIMO_BARRAS} de {barras.length}; el detalle completo está en la tabla.
        </figcaption>
      )}
      {activa && seleccionada && (
        <div className="sugerencia" role="tooltip" style={{ left: activa.x, top: activa.y }}>
          <strong>{seleccionada.texto}</strong>
          <span>{seleccionada.etiqueta}</span>
        </div>
      )}
    </figure>
  );
}
