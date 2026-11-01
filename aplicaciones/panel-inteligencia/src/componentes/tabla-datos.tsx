import type { Columna, Fila } from '../api/tipos';
import { textoDeCelda } from '../utilidades/celdas';

const NUMERICAS = new Set(['numero', 'dinero', 'porcentaje']);

/** La tabla siempre acompana al grafico: es la vista accesible y completa de los mismos datos. */
export function TablaDatos({
  columnas,
  filas,
  titulo,
}: {
  columnas: Columna[];
  filas: Fila[];
  titulo: string;
}) {
  if (filas.length === 0) return <p className="sin-datos">La consulta no devolvió filas.</p>;
  return (
    <div className="tabla-envoltura" role="region" aria-label={`Datos: ${titulo}`} tabIndex={0}>
      <table className="tabla">
        <caption className="solo-lectores">{titulo}</caption>
        <thead>
          <tr>
            {columnas.map((c) => (
              <th key={c.clave} scope="col" className={NUMERICAS.has(c.tipo) ? 'num' : undefined}>
                {c.etiqueta}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filas.map((fila, i) => (
            <tr key={i}>
              {columnas.map((c) => (
                <td
                  key={c.clave}
                  data-etiqueta={c.etiqueta}
                  className={NUMERICAS.has(c.tipo) ? 'num' : undefined}
                >
                  {textoDeCelda(c, fila[c.clave])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
