import type { Reporte } from '../api/tipos';
import { Icono } from './iconos';

const hora = new Intl.DateTimeFormat('es-BO', { timeStyle: 'short' });

/** Reportes de esta sesion (solo en memoria: no se guardan datos del negocio en el navegador). */
export function Historial({
  reportes,
  actualId,
  alElegir,
}: {
  reportes: readonly Reporte[];
  actualId?: string;
  alElegir: (r: Reporte) => void;
}) {
  if (reportes.length === 0) return null;
  return (
    <nav className="historial" aria-label="Reportes de esta sesión">
      <h2>
        <Icono nombre="historial" tamano={18} /> Esta sesión
      </h2>
      <ul>
        {[...reportes].reverse().map((r) => (
          <li key={r.id}>
            <button
              type="button"
              className="historial__item"
              aria-current={r.id === actualId ? 'true' : undefined}
              onClick={() => alElegir(r)}
            >
              <span>{r.titulo}</span>
              <small>{hora.format(new Date(r.generado_en))}</small>
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
