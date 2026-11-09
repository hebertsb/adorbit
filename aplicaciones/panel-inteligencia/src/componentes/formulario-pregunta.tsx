import { useDictado } from '../utilidades/usar-dictado';
import { FiltrosAnalisis } from './filtros-analisis';
import { Icono } from './iconos';

const EJEMPLOS = [
  '¿Cuánto gastó la campaña Verano 2027 por mes?',
  'Facturas que vencen en los próximos 30 días',
  'Clientes morosos',
  'Campañas activas',
];

interface Propiedades {
  texto: string;
  alCambiar: (texto: string) => void;
  alEnviar: (pregunta: string) => void;
  generando: boolean;
  ejemplos?: readonly string[];
}

export function FormularioPregunta({
  texto,
  alCambiar,
  alEnviar,
  generando,
  ejemplos = EJEMPLOS,
}: Propiedades) {
  const dictado = useDictado(alCambiar);
  const puedeEnviar = texto.trim().length >= 3 && !generando;

  const enviar = () => {
    if (puedeEnviar) alEnviar(texto.trim());
  };

  return (
    <section className="formulario" aria-labelledby="titulo-pregunta">
      <header className="formulario__cabecera">
        <div>
          <span className="formulario__sobrelinea">
            <Icono nombre="destello" tamano={14} /> Asistente analítico
          </span>
          <h2 id="titulo-pregunta">¿Qué necesita analizar?</h2>
          <p>Consulte en lenguaje natural o construya un reporte con filtros.</p>
        </div>
        <span className="estado-ia">
          <i /> IA conectada
        </span>
      </header>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          enviar();
        }}
      >
        <label htmlFor="pregunta" className="solo-lectores">
          Pregunta en lenguaje natural
        </label>
        <textarea
          id="pregunta"
          rows={2}
          maxLength={500}
          value={texto}
          placeholder="Por ejemplo: facturas que vencen en los próximos 30 días"
          onChange={(e) => alCambiar(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              enviar();
            }
          }}
        />
        <div className="formulario__acciones">
          <button type="submit" className="boton boton--primario" disabled={!puedeEnviar}>
            <Icono nombre="enviar" /> {generando ? 'Consultando…' : 'Preguntar'}
          </button>
          {dictado.soportado && (
            <button
              type="button"
              className={`boton boton--secundario ${dictado.escuchando ? 'boton--activo' : ''}`}
              aria-pressed={dictado.escuchando}
              disabled={dictado.preparando}
              onClick={dictado.escuchando ? dictado.detener : dictado.iniciar}
            >
              <Icono nombre="microfono" />{' '}
              {dictado.preparando
                ? 'Preparando micrófono…'
                : dictado.escuchando
                  ? 'Escuchando… (detener)'
                  : 'Dictar'}
            </button>
          )}
          <span className="formulario__contador" aria-hidden="true">
            {texto.length}/500
          </span>
        </div>
      </form>
      {dictado.error && (
        <p className="aviso aviso--aviso" role="alert">
          {dictado.error}
        </p>
      )}
      {dictado.soportado && (
        <p className="formulario__nota">
          El dictado usa el reconocimiento de voz de su navegador; según el navegador, el audio puede
          procesarse en el servicio de voz del proveedor.
        </p>
      )}
      <div className="ejemplos" role="group" aria-label="Preguntas de ejemplo">
        {ejemplos.map((e) => (
          <button key={e} type="button" className="chip" disabled={generando} onClick={() => alEnviar(e)}>
            {e}
          </button>
        ))}
      </div>
      <FiltrosAnalisis alConsultar={alEnviar} generando={generando} />
    </section>
  );
}
