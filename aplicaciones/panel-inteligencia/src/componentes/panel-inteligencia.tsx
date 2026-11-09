import { useMemo, useState } from 'react';
import { ErrorIa, crearClienteIa } from '../api/cliente-ia';
import type { Reporte } from '../api/tipos';
import type { ContextoPanel } from '../contexto';
import { FormularioPregunta } from './formulario-pregunta';
import { Historial } from './historial';
import { Icono } from './iconos';
import { ResultadoReporte } from './resultado-reporte';

type Fallo = { tipo: 'no_entendida' | 'bloqueada' | 'otro'; mensaje: string; sugerencias: string[] };

function aFallo(e: unknown): Fallo {
  if (e instanceof ErrorIa) {
    if (e.codigo === 'pregunta_no_entendida')
      return { tipo: 'no_entendida', mensaje: e.message, sugerencias: e.sugerencias };
    if (e.codigo === 'consulta_bloqueada') return { tipo: 'bloqueada', mensaje: e.message, sugerencias: [] };
    return { tipo: 'otro', mensaje: e.message, sugerencias: [] };
  }
  return {
    tipo: 'otro',
    mensaje: 'No pudimos conectar con el servicio de reportes. Intente de nuevo en unos minutos.',
    sugerencias: [],
  };
}

export function PanelInteligencia({ contexto }: { contexto: ContextoPanel }) {
  // El cliente no guarda estado: si el anfitrion actualiza el token o la URL, simplemente se vuelve a crear.
  const cliente = useMemo(() => crearClienteIa(() => contexto), [contexto]);

  const [texto, setTexto] = useState('');
  const [generando, setGenerando] = useState(false);
  const [actual, setActual] = useState<Reporte | null>(null);
  const [reportes, setReportes] = useState<Reporte[]>([]);
  const [fallo, setFallo] = useState<Fallo | null>(null);

  const preguntar = async (pregunta: string) => {
    setTexto(pregunta);
    setGenerando(true);
    setFallo(null);
    try {
      const reporte = await cliente.generarReporte(pregunta);
      setActual(reporte);
      setReportes((previos) => (previos.some((r) => r.id === reporte.id) ? previos : [...previos, reporte]));
    } catch (e) {
      // Se oculta el reporte anterior: no debe parecer la respuesta a esta pregunta. Sigue en el historial.
      setActual(null);
      setFallo(aFallo(e));
    } finally {
      setGenerando(false);
    }
  };

  return (
    <div
      className="panel"
      data-tema={contexto.tema === 'claro' || contexto.tema === 'oscuro' ? contexto.tema : undefined}
    >
      <header className="panel__cabecera">
        <div>
          <span className="panel__sobrelinea">AdOrbit Intelligence</span>
          <h1>Centro de análisis</h1>
          <p>Decisiones claras a partir de campañas, clientes y facturación.</p>
        </div>
        {contexto.usuario?.nombre && (
          <span className="panel__usuario">
            <i>{contexto.usuario.nombre.charAt(0).toUpperCase()}</i>
            <span>
              Vista de
              <br />
              <strong>{contexto.usuario.nombre}</strong>
            </span>
          </span>
        )}
      </header>

      <div className="panel__cuerpo">
        <div className="panel__principal">
          <FormularioPregunta
            texto={texto}
            alCambiar={setTexto}
            alEnviar={(p) => void preguntar(p)}
            generando={generando}
          />

          <div aria-live="polite" aria-busy={generando}>
            {generando && <p className="cargando">Consultando los datos…</p>}
            {fallo && (
              <div
                className={`aviso ${fallo.tipo === 'bloqueada' ? 'aviso--peligro' : 'aviso--aviso'}`}
                role="alert"
              >
                <p>
                  <Icono nombre={fallo.tipo === 'bloqueada' ? 'bloqueo' : 'alerta'} tamano={18} />{' '}
                  {fallo.mensaje}
                </p>
                {fallo.tipo === 'bloqueada' && <p>La solicitud quedó registrada para auditoría.</p>}
                {fallo.sugerencias.length > 0 && (
                  <div className="ejemplos" role="group" aria-label="Preguntas que sí puedo responder">
                    {fallo.sugerencias.map((s) => (
                      <button key={s} type="button" className="chip" onClick={() => void preguntar(s)}>
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {actual ? (
            <ResultadoReporte key={actual.id} reporte={actual} cliente={cliente} />
          ) : (
            !generando &&
            !fallo && (
              <p className="vacio">
                Escriba o dicte una pregunta, o elija un ejemplo, para generar su primer reporte.
              </p>
            )
          )}
        </div>
        <aside className="panel__lateral">
          <Historial
            reportes={reportes}
            actualId={actual?.id}
            alElegir={(r) => {
              setActual(r);
              setFallo(null);
              setTexto(r.pregunta);
            }}
          />
        </aside>
      </div>
    </div>
  );
}
