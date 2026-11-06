import { useState } from 'react';
import type { ClienteIa } from '../api/cliente-ia';
import { ErrorIa } from '../api/cliente-ia';
import type { FormatoExportacion, Reporte } from '../api/tipos';
import { datosDeGrafico } from '../utilidades/datos-grafico';
import { GraficoBarras } from './grafico-barras';
import { GraficoLinea } from './grafico-linea';
import { Icono } from './iconos';
import { Indicadores } from './indicadores';
import { TablaDatos } from './tabla-datos';

const fechaHora = new Intl.DateTimeFormat('es-BO', { dateStyle: 'medium', timeStyle: 'short' });

function descargar(blob: Blob, nombre: string) {
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = nombre;
  enlace.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function describirParametros(parametros: Record<string, unknown>): string {
  const pares = Object.entries(parametros);
  return pares.length === 0 ? 'sin parámetros' : pares.map(([k, v]) => `${k} = ${String(v)}`).join(', ');
}

export function ResultadoReporte({ reporte, cliente }: { reporte: Reporte; cliente: ClienteIa }) {
  const [exportando, setExportando] = useState<FormatoExportacion | null>(null);
  const [falloExportar, setFalloExportar] = useState<string | null>(null);
  const grafico = datosDeGrafico(reporte);

  const exportar = async (formato: FormatoExportacion) => {
    setExportando(formato);
    setFalloExportar(null);
    try {
      const archivo = await cliente.exportar(reporte.id, formato);
      descargar(archivo.blob, archivo.nombre);
    } catch (e) {
      setFalloExportar(
        e instanceof ErrorIa ? e.message : 'No se pudo exportar el reporte. Intente de nuevo.',
      );
    } finally {
      setExportando(null);
    }
  };

  return (
    <article className="resultado" aria-labelledby="titulo-reporte">
      <header className="resultado__cabecera">
        <div>
          <h2 id="titulo-reporte">{reporte.titulo}</h2>
          <p className="resultado__meta">
            «{reporte.pregunta}» · {fechaHora.format(new Date(reporte.generado_en))}
          </p>
        </div>
        <div className="resultado__exportar" role="group" aria-label="Exportar reporte">
          {(['pdf', 'xlsx'] as const).map((formato) => (
            <button
              key={formato}
              type="button"
              className="boton boton--secundario"
              disabled={exportando !== null}
              onClick={() => void exportar(formato)}
            >
              <Icono nombre="descargar" />{' '}
              {exportando === formato ? 'Preparando…' : formato === 'pdf' ? 'PDF' : 'Excel'}
            </button>
          ))}
        </div>
      </header>
      {falloExportar && (
        <p className="aviso aviso--peligro" role="alert">
          {falloExportar}
        </p>
      )}

      <p className="interpretacion">
        <Icono nombre="bloqueo" tamano={16} />
        <span>
          Consulta usada: <code>{reporte.interpretacion.herramienta}</code> (
          {describirParametros(reporte.interpretacion.parametros)}). Solo lectura, sobre vistas autorizadas.
        </span>
      </p>

      {reporte.advertencias?.map((a) => (
        <p key={a} className="aviso aviso--aviso" role="status">
          {a}
        </p>
      ))}

      {reporte.indicadores && reporte.indicadores.length > 0 && (
        <Indicadores indicadores={reporte.indicadores} />
      )}

      {grafico && (
        <section aria-label="Gráfico" className="resultado__grafico">
          <h3>{grafico.titulo}</h3>
          {grafico.tipo === 'barras' ? (
            <GraficoBarras barras={grafico.barras} titulo={grafico.titulo} />
          ) : (
            <GraficoLinea puntos={grafico.puntos} titulo={grafico.titulo} />
          )}
        </section>
      )}

      <section aria-label="Datos">
        <h3>Datos</h3>
        <TablaDatos columnas={reporte.columnas} filas={reporte.filas} titulo={reporte.titulo} />
      </section>
    </article>
  );
}
