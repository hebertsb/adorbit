import type { ContextoPanel } from '../contexto';
import type { FormatoExportacion, Reporte } from './tipos';

export class ErrorIa extends Error {
  constructor(
    readonly estado: number,
    readonly codigo: string,
    mensaje: string,
    readonly sugerencias: string[] = [],
  ) {
    super(mensaje);
    this.name = 'ErrorIa';
  }
}

export interface ArchivoExportado {
  blob: Blob;
  nombre: string;
}

export function crearClienteIa(contexto: () => ContextoPanel) {
  async function pedir(ruta: string, opciones: RequestInit = {}): Promise<Response> {
    const { apiIaUrl, obtenerToken, alExpirarSesion } = contexto();
    let token: string;
    try {
      token = await obtenerToken();
    } catch {
      alExpirarSesion?.();
      throw new ErrorIa(401, 'no_autenticado', 'Su sesión expiró. Vuelva a ingresar.');
    }
    const respuesta = await fetch(`${apiIaUrl}${ruta}`, {
      ...opciones,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
        'X-Correlation-Id': crypto.randomUUID(),
        ...opciones.headers,
      },
    });
    if (respuesta.ok) return respuesta;

    if (respuesta.status === 401) alExpirarSesion?.();
    let cuerpo: { codigo?: string; mensaje?: string; detalle?: { sugerencias?: string[] } | null } = {};
    try {
      cuerpo = (await respuesta.json()) as typeof cuerpo;
    } catch {
      /* el cuerpo no era JSON */
    }
    throw new ErrorIa(
      respuesta.status,
      cuerpo.codigo ?? 'error',
      cuerpo.mensaje ?? `Error ${respuesta.status}`,
      cuerpo.detalle?.sugerencias ?? [],
    );
  }

  return {
    /** Una clave de idempotencia por pregunta enviada: reintentar el mismo envio no genera otro reporte. */
    async generarReporte(
      pregunta: string,
      claveIdempotencia: string = crypto.randomUUID(),
    ): Promise<Reporte> {
      const respuesta = await pedir('/api/v1/reportes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Idempotency-Key': claveIdempotencia },
        body: JSON.stringify({ pregunta }),
      });
      return (await respuesta.json()) as Reporte;
    },

    async exportar(
      id: string,
      formato: FormatoExportacion,
      columnas?: string[],
    ): Promise<ArchivoExportado> {
      const seleccion = columnas?.length ? `&columnas=${encodeURIComponent(columnas.join(','))}` : '';
      const respuesta = await pedir(`/api/v1/reportes/${id}/exportar?formato=${formato}${seleccion}`, {
        headers: { Accept: '*/*' },
      });
      const cabecera = respuesta.headers.get('Content-Disposition') ?? '';
      const nombre = /filename="?([^";]+)"?/.exec(cabecera)?.[1] ?? `reporte.${formato}`;
      return { blob: await respuesta.blob(), nombre };
    },
  };
}

export type ClienteIa = ReturnType<typeof crearClienteIa>;
