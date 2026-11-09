import { useMemo, useState } from 'react';
import { Icono } from './iconos';

type TipoConsulta = 'campanas' | 'facturas' | 'clientes';

const ESTADOS = [
  ['todos', 'Todos los estados'],
  ['activa', 'Activas'],
  ['borrador', 'Borradores'],
  ['pausada', 'Pausadas'],
  ['finalizada', 'Finalizadas'],
  ['cancelada', 'Canceladas'],
] as const;

export function FiltrosAnalisis({
  alConsultar,
  generando,
}: {
  alConsultar: (pregunta: string) => void;
  generando: boolean;
}) {
  const [tipo, setTipo] = useState<TipoConsulta>('campanas');
  const [estado, setEstado] = useState('todos');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [dias, setDias] = useState(30);
  const fechasInvalidas = Boolean(desde && hasta && desde > hasta);

  const resumen = useMemo(() => {
    if (tipo === 'facturas') return `Vencimiento en los próximos ${dias} días`;
    if (tipo === 'clientes') return 'Clientes con crédito en mora';
    const partes = [estado === 'todos' ? 'Todos los estados' : `Estado: ${estado}`];
    if (desde || hasta) partes.push(`${desde || 'Inicio'} — ${hasta || 'Hoy'}`);
    return partes.join(' · ');
  }, [tipo, estado, desde, hasta, dias]);

  const consultar = () => {
    if (tipo === 'facturas') {
      alConsultar(`Facturas que vencen en los próximos ${dias} días`);
      return;
    }
    if (tipo === 'clientes') {
      alConsultar('Clientes morosos');
      return;
    }

    const partes = ['Campañas'];
    if (estado !== 'todos') partes.push(`en estado ${estado}`);
    if (desde) partes.push(`con fecha de inicio desde ${desde}`);
    if (hasta) partes.push(`y fecha de fin hasta ${hasta}`);
    alConsultar(partes.join(' '));
  };

  return (
    <details className="explorador" open>
      <summary>
        <span className="explorador__titulo">
          <span className="explorador__icono">
            <Icono nombre="filtro" tamano={18} />
          </span>
          <span>
            <strong>Filtros de análisis</strong>
            <small>{resumen}</small>
          </span>
        </span>
        <span className="explorador__alternar">Configurar</span>
      </summary>

      <div className="explorador__contenido">
        <div className="selector-dominio" role="group" aria-label="Tipo de información">
          {(
            [
              ['campanas', 'Campañas'],
              ['facturas', 'Facturación'],
              ['clientes', 'Clientes'],
            ] as const
          ).map(([valor, etiqueta]) => (
            <button key={valor} type="button" aria-pressed={tipo === valor} onClick={() => setTipo(valor)}>
              {etiqueta}
            </button>
          ))}
        </div>

        <div className="explorador__campos">
          {tipo === 'campanas' && (
            <>
              <label className="campo-filtro">
                <span>Estado</span>
                <select value={estado} onChange={(e) => setEstado(e.target.value)}>
                  {ESTADOS.map(([valor, etiqueta]) => (
                    <option key={valor} value={valor}>
                      {etiqueta}
                    </option>
                  ))}
                </select>
              </label>
              <label className="campo-filtro">
                <span>Desde</span>
                <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
              </label>
              <label className="campo-filtro">
                <span>Hasta</span>
                <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} />
              </label>
            </>
          )}
          {tipo === 'facturas' && (
            <label className="campo-filtro campo-filtro--dias">
              <span>Próximo vencimiento</span>
              <select value={dias} onChange={(e) => setDias(Number(e.target.value))}>
                <option value={7}>Próximos 7 días</option>
                <option value={15}>Próximos 15 días</option>
                <option value={30}>Próximos 30 días</option>
                <option value={60}>Próximos 60 días</option>
                <option value={90}>Próximos 90 días</option>
              </select>
            </label>
          )}
          {tipo === 'clientes' && (
            <div className="explorador__explicacion">
              Se mostrarán clientes cuyo crédito utilizado supera el límite disponible.
            </div>
          )}
          <button
            type="button"
            className="boton boton--filtro"
            disabled={generando || fechasInvalidas}
            onClick={consultar}
          >
            <Icono nombre="destello" tamano={17} /> {generando ? 'Consultando…' : 'Aplicar filtros'}
          </button>
        </div>
        {fechasInvalidas && (
          <p className="explorador__error" role="alert">
            La fecha inicial debe ser anterior a la fecha final.
          </p>
        )}
      </div>
    </details>
  );
}
