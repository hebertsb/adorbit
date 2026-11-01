import type { Indicador } from '../api/tipos';
import { formatearDinero } from '../utilidades/dinero';

function texto(i: Indicador): string {
  if (i.tipo === 'dinero') return formatearDinero(i.valor, i.moneda ?? 'BOB');
  if (i.tipo === 'porcentaje') return `${i.valor.replace('.', ',')} %`;
  return Number(i.valor).toLocaleString('es-BO');
}

/** Cifras de cabecera (tarjetas de indicador): etiqueta en minuscula y valor en tipografia semibold. */
export function Indicadores({ indicadores }: { indicadores: Indicador[] }) {
  return (
    <dl className="indicadores">
      {indicadores.map((i) => (
        <div key={i.etiqueta} className="indicador">
          <dt>{i.etiqueta}</dt>
          <dd>{texto(i)}</dd>
        </div>
      ))}
    </dl>
  );
}
