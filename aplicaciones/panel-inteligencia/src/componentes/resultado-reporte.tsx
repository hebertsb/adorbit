import { useState } from 'react';
import type { ClienteIa } from '../api/cliente-ia';
import { ErrorIa } from '../api/cliente-ia';
import type { FormatoExportacion, Reporte } from '../api/tipos';
import { datosDeGrafico } from '../utilidades/datos-grafico';
import { mensajeWhatsApp } from '../utilidades/mensaje-whatsapp';
import { GraficoBarras } from './grafico-barras';
import { GraficoAnillo } from './grafico-anillo';
import { GraficoLinea } from './grafico-linea';
import { Icono } from './iconos';
import { Indicadores } from './indicadores';
import { TablaDatos } from './tabla-datos';
import { ResumenVisual } from './resumen-visual';

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
  const [vista, setVista] = useState<'grafico' | 'distribucion' | 'tarjetas'>('grafico');
  const grafico = datosDeGrafico(reporte);

  // Selección de columnas: arranca con la que eligió la IA y el usuario la ajusta.
  const disponibles = reporte.columnas_disponibles?.length ? reporte.columnas_disponibles : reporte.columnas;
  const [visibles, setVisibles] = useState<string[]>(() => reporte.columnas.map((c) => c.clave));
  const [selectorAbierto, setSelectorAbierto] = useState(false);
  const columnasMostradas = visibles
    .map((clave) => disponibles.find((c) => c.clave === clave))
    .filter((c): c is (typeof disponibles)[number] => c !== undefined);
  const seleccionPersonalizada = visibles.length !== disponibles.length;

  const alternarColumna = (clave: string) =>
    setVisibles((actuales) =>
      actuales.includes(clave)
        ? actuales.length > 1
          ? actuales.filter((c) => c !== clave)
          : actuales
        : [...actuales, clave],
    );

  const exportar = async (formato: FormatoExportacion) => {
    setExportando(formato);
    setFalloExportar(null);
    try {
      const archivo = await cliente.exportar(
        reporte.id,
        formato,
        seleccionPersonalizada ? visibles : undefined,
      );
      descargar(archivo.blob, archivo.nombre);
    } catch (e) {
      setFalloExportar(
        e instanceof ErrorIa ? e.message : 'No se pudo exportar el reporte. Intente de nuevo.',
      );
    } finally {
      setExportando(null);
    }
  };

  const compartirWhatsApp = () => {
    const enlace =
      typeof window !== 'undefined' ? `${window.location.origin}/reportes` : 'http://4.151.177.116/reportes';
    const texto = mensajeWhatsApp(reporte, columnasMostradas, enlace);
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(texto)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
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
          {(['pdf', 'xlsx', 'txt'] as const).map((formato) => (
            <button
              key={formato}
              type="button"
              className="boton boton--secundario"
              disabled={exportando !== null}
              onClick={() => void exportar(formato)}
              title={formato === 'txt' ? 'Descargar reporte detallado en formato texto estructurado' : undefined}
            >
              <Icono nombre="descargar" />{' '}
              {exportando === formato
                ? 'Preparando…'
                : formato === 'pdf'
                  ? 'PDF'
                  : formato === 'xlsx'
                    ? 'Excel'
                    : 'TXT'}
            </button>
          ))}
          <button
            type="button"
            className="boton boton--secundario boton--whatsapp"
            onClick={compartirWhatsApp}
            title="Enviar resumen del análisis a WhatsApp"
          >
            <Icono nombre="whatsapp" /> WhatsApp
          </button>
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
      {reporte.presentacion_ia && (
        <p className="interpretacion">
          <Icono nombre="bloqueo" tamano={16} />
          <span>
            La IA eligió mostrar: {reporte.columnas.map((c) => c.etiqueta).join(', ')}.
          </span>
        </p>
      )}

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
          <div className="seccion-cabecera">
            <div>
              <span className="seccion-cabecera__sobrelinea">Visualización</span>
              <h3>{grafico.titulo}</h3>
            </div>
            <span className="contador-registros">{reporte.filas.length} registros</span>
          </div>
          <div className="selector-vista" role="group" aria-label="Forma de visualizar los datos">
            <button type="button" aria-pressed={vista === 'grafico'} onClick={() => setVista('grafico')}>
              {grafico.tipo === 'barras' ? 'Barras' : 'Tendencia'}
            </button>
            {grafico.tipo === 'barras' && (
              <button type="button" aria-pressed={vista === 'distribucion'} onClick={() => setVista('distribucion')}>
                Distribución
              </button>
            )}
            <button type="button" aria-pressed={vista === 'tarjetas'} onClick={() => setVista('tarjetas')}>
              Tarjetas
            </button>
          </div>
          <div className="visualizacion-contenido" key={vista}>
            {vista === 'grafico' &&
              (grafico.tipo === 'barras' ? (
                <GraficoBarras barras={grafico.barras} titulo={grafico.titulo} />
              ) : (
                <GraficoLinea puntos={grafico.puntos} titulo={grafico.titulo} />
              ))}
            {vista === 'distribucion' && grafico.tipo === 'barras' && (
              <GraficoAnillo barras={grafico.barras} titulo={grafico.titulo} />
            )}
            {vista === 'tarjetas' && (
              <ResumenVisual
                elementos={
                  grafico.tipo === 'barras'
                    ? grafico.barras
                    : grafico.puntos.map((punto) => ({ etiqueta: punto.etiqueta, valor: punto.valor, texto: punto.texto }))
                }
              />
            )}
          </div>
        </section>
      )}

      <section aria-label="Datos" className="resultado__datos">
        <div className="seccion-cabecera">
          <div>
            <span className="seccion-cabecera__sobrelinea">Detalle</span>
            <h3>Datos del reporte</h3>
          </div>
          <div className="selector-columnas__acciones">
            <span className="contador-registros">{reporte.filas.length} registros</span>
            <button
              type="button"
              className="boton boton--secundario"
              aria-expanded={selectorAbierto}
              aria-controls="selector-columnas"
              onClick={() => setSelectorAbierto((v) => !v)}
            >
              Columnas ({visibles.length}/{disponibles.length})
            </button>
          </div>
        </div>
        {selectorAbierto && (
          <fieldset id="selector-columnas" className="selector-columnas">
            <legend>Qué datos mostrar (también se aplica a PDF, Excel y TXT)</legend>
            {disponibles.map((c) => (
              <label key={c.clave} className="selector-columnas__opcion">
                <input
                  type="checkbox"
                  checked={visibles.includes(c.clave)}
                  disabled={visibles.length === 1 && visibles.includes(c.clave)}
                  onChange={() => alternarColumna(c.clave)}
                />
                {c.etiqueta}
              </label>
            ))}
            <button
              type="button"
              className="boton boton--secundario"
              onClick={() => setVisibles(disponibles.map((c) => c.clave))}
            >
              Mostrar todas
            </button>
          </fieldset>
        )}
        <TablaDatos columnas={columnasMostradas} filas={reporte.filas} titulo={reporte.titulo} />
      </section>
    </article>
  );
}
