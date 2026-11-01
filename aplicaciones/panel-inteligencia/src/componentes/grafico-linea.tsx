import { useState, type KeyboardEvent, type PointerEvent } from 'react';
import { escalaAmigable, formatoCompacto, marcasDelEje } from '../utilidades/escala';
import { useAncho } from '../utilidades/usar-ancho';

export interface Punto {
  etiqueta: string;
  /** Etiqueta corta para el eje X (p. ej. "jun"). */
  etiquetaEje: string;
  valor: number;
  texto: string;
}

interface Propiedades {
  puntos: readonly Punto[];
  titulo: string;
}

const ALTO = 240;
const MARGEN = { arriba: 28, derecha: 20, abajo: 28, izquierda: 44 };

/**
 * Linea de un solo serie. Marcas de la guia: linea de 2 px con extremos redondeados, area al ~10 %, punto final de
 * r = 4 con anillo de 2 px del color de la superficie, rejilla de 1 px, cruz y tooltip que se ajustan al punto
 * mas cercano (con raton o con flechas del teclado).
 */
export function GraficoLinea({ puntos, titulo }: Propiedades) {
  const [ancho, referencia] = useAncho(640);
  const [indice, setIndice] = useState<number | null>(null);

  const interior = {
    ancho: Math.max(ancho - MARGEN.izquierda - MARGEN.derecha, 10),
    alto: ALTO - MARGEN.arriba - MARGEN.abajo,
  };
  const { maximo: tope, paso } = escalaAmigable(Math.max(...puntos.map((p) => p.valor), 0), 4);
  const marcas = marcasDelEje(tope, paso);
  const x = (i: number) =>
    MARGEN.izquierda +
    (puntos.length === 1 ? interior.ancho / 2 : (i / (puntos.length - 1)) * interior.ancho);
  const y = (v: number) => MARGEN.arriba + interior.alto - (v / tope) * interior.alto;

  const trazo = puntos
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(p.valor).toFixed(1)}`)
    .join(' ');
  const area = `${trazo} L${x(puntos.length - 1).toFixed(1)},${y(0)} L${x(0).toFixed(1)},${y(0)} Z`;
  const cadaCuantos = Math.ceil(puntos.length / Math.max(Math.floor(interior.ancho / 56), 1));
  const ultimo = puntos[puntos.length - 1];

  const masCercano = (evento: PointerEvent<SVGRectElement>) => {
    const caja = evento.currentTarget.getBoundingClientRect();
    const relativo = ((evento.clientX - caja.left) / caja.width) * interior.ancho;
    const i = Math.round((relativo / interior.ancho) * (puntos.length - 1));
    setIndice(Math.min(Math.max(i, 0), puntos.length - 1));
  };
  const alTeclear = (evento: KeyboardEvent<HTMLElement>) => {
    if (evento.key === 'ArrowRight' || evento.key === 'ArrowLeft') {
      evento.preventDefault();
      const delta = evento.key === 'ArrowRight' ? 1 : -1;
      setIndice((actual) =>
        Math.min(Math.max((actual ?? (delta > 0 ? -1 : puntos.length)) + delta, 0), puntos.length - 1),
      );
    } else if (evento.key === 'Escape') {
      setIndice(null);
    }
  };

  const activo = indice !== null ? puntos[indice] : undefined;

  return (
    <figure className="grafico grafico--linea" ref={referencia}>
      <div
        className="linea"
        role="group"
        tabIndex={0}
        aria-label={`${titulo}: ${puntos.length} puntos, de ${puntos[0]?.etiqueta ?? ''} a ${ultimo?.etiqueta ?? ''}. Use las flechas para recorrerlos.`}
        onKeyDown={alTeclear}
        onFocus={() => setIndice((i) => i ?? puntos.length - 1)}
        onBlur={() => setIndice(null)}
      >
        <svg
          width={ancho}
          height={ALTO}
          viewBox={`0 0 ${ancho} ${ALTO}`}
          aria-hidden="true"
          focusable="false"
        >
          {marcas.map((m) => (
            <g key={m}>
              <line
                className="linea__rejilla"
                x1={MARGEN.izquierda}
                x2={MARGEN.izquierda + interior.ancho}
                y1={y(m)}
                y2={y(m)}
              />
              <text
                className="linea__marca"
                x={MARGEN.izquierda - 8}
                y={y(m)}
                textAnchor="end"
                dominantBaseline="middle"
              >
                {formatoCompacto(m)}
              </text>
            </g>
          ))}
          <line
            className="linea__eje"
            x1={MARGEN.izquierda}
            x2={MARGEN.izquierda + interior.ancho}
            y1={y(0)}
            y2={y(0)}
          />
          {puntos.map((p, i) =>
            i % cadaCuantos === 0 ? (
              <text key={i} className="linea__marca" x={x(i)} y={ALTO - 8} textAnchor="middle">
                {p.etiquetaEje}
              </text>
            ) : null,
          )}
          <path className="linea__area" d={area} />
          <path className="linea__trazo" d={trazo} />
          {ultimo && (
            <>
              <circle className="linea__punto" cx={x(puntos.length - 1)} cy={y(ultimo.valor)} r={4} />
              <text
                className="linea__valor"
                x={x(puntos.length - 1)}
                y={y(ultimo.valor) - 12}
                textAnchor="end"
              >
                {ultimo.texto}
              </text>
            </>
          )}
          {activo && indice !== null && (
            <>
              <line className="linea__cruz" x1={x(indice)} x2={x(indice)} y1={MARGEN.arriba} y2={y(0)} />
              <circle
                className="linea__punto linea__punto--activo"
                cx={x(indice)}
                cy={y(activo.valor)}
                r={4}
              />
            </>
          )}
          <rect
            className="linea__captura"
            x={MARGEN.izquierda}
            y={MARGEN.arriba}
            width={interior.ancho}
            height={interior.alto}
            onPointerMove={masCercano}
            onPointerLeave={() => setIndice(null)}
          />
        </svg>
        {activo && indice !== null && (
          <div
            className="sugerencia"
            role="tooltip"
            style={{
              left: Math.min(Math.max(x(indice), 70), ancho - 70),
              top: Math.max(y(activo.valor) - 8, 0),
            }}
          >
            <strong>{activo.texto}</strong>
            <span>{activo.etiqueta}</span>
          </div>
        )}
      </div>
      <div className="solo-lectores" aria-live="polite">
        {activo ? `${activo.etiqueta}: ${activo.texto}` : ''}
      </div>
    </figure>
  );
}
