import type { Columna, Fila } from '../api/tipos';
import { textoDeCelda } from '../utilidades/celdas';

const NUMERICAS = new Set(['numero', 'dinero', 'porcentaje']);
const esIdentificadorTecnico = (clave: string) => clave === 'id' || clave.endsWith('_id');
const claseEstado = (valor: unknown) =>
  `estado-dato estado-dato--${String(valor ?? 'desconocido').toLowerCase().replace(/[^a-z0-9_-]/g, '-')}`;

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
  const columnasNegocio = columnas.filter((columna) => !esIdentificadorTecnico(columna.clave));
  const visibles = columnasNegocio.length >= 2 ? columnasNegocio : columnas;
  return (
    <div className="tabla-envoltura" role="region" aria-label={`Datos: ${titulo}`} tabIndex={0}>
      <table className="tabla">
        <caption className="solo-lectores">{titulo}</caption>
        <thead>
          <tr>
            {visibles.map((c) => (
              <th key={c.clave} scope="col" className={`${NUMERICAS.has(c.tipo) ? 'num ' : ''}columna--${c.clave}`}>
                {c.etiqueta}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filas.map((fila, i) => (
            <tr key={i}>
              {visibles.map((c) => (
                <td
                  key={c.clave}
                  data-etiqueta={c.etiqueta}
                  className={`${NUMERICAS.has(c.tipo) ? 'num ' : ''}columna--${c.clave}`}
                >
                  {c.clave === 'estado' ? (
                    <span className={claseEstado(fila[c.clave])}>{textoDeCelda(c, fila[c.clave])}</span>
                  ) : (
                    textoDeCelda(c, fila[c.clave])
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {columnas.length !== visibles.length && (
        <p className="tabla__nota">Los identificadores técnicos se conservan en las exportaciones PDF y Excel.</p>
      )}
    </div>
  );
}
