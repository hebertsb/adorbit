import { EVENTO_SESION_EXPIRADA } from '../autenticacion/eventos';
import { obtenerAdministrador } from '../autenticacion/oidc';
import { decodificarReclamos } from '../autenticacion/reclamos';

export { EVENTO_SESION_EXPIRADA };

/** Error de la API con la forma { codigo, mensaje, detalle }. */
export class ErrorApi extends Error {
  constructor(
    readonly estado: number,
    readonly codigo: string,
    mensaje: string,
  ) {
    super(mensaje);
    this.name = 'ErrorApi';
  }
}

type Parametros = Record<string, string | number | undefined>;

function generarCorrelationId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  const bytes = new Uint8Array(16);
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x40;
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** GET autenticado. El token sale de la sesion OIDC; nunca se guarda en otro lado. */
export async function obtenerJson<T>(base: string, ruta: string, parametros: Parametros = {}): Promise<T> {
  const usuario = await obtenerAdministrador().getUser();
  if (!usuario || usuario.expired) {
    window.dispatchEvent(new Event(EVENTO_SESION_EXPIRADA));
    throw new ErrorApi(401, 'no_autenticado', 'La sesion expiro');
  }
  const url = new URL(`${base}${ruta}`);
  for (const [clave, valor] of Object.entries(parametros)) {
    if (valor !== undefined && valor !== '') url.searchParams.set(clave, String(valor));
  }

  // La cache offline del service worker se indexa por URL: se agrega el cliente para que dos usuarios del mismo
  // navegador nunca compartan una entrada (los servicios ignoran el parametro; el cliente real sale del token).
  url.searchParams.set('_u', decodificarReclamos(usuario.access_token).cliente_id ?? 'sin-cliente');

  const respuesta = await fetch(url, {
    headers: {
      Authorization: `Bearer ${usuario.access_token}`,
      Accept: 'application/json',
      'X-Correlation-Id': generarCorrelationId(),
    },
  });

  if (respuesta.ok) return (await respuesta.json()) as T;

  if (respuesta.status === 401) window.dispatchEvent(new Event(EVENTO_SESION_EXPIRADA));
  let codigo = 'error';
  let mensaje = `Error ${respuesta.status}`;
  try {
    const cuerpo = (await respuesta.json()) as { codigo?: string; mensaje?: string };
    codigo = cuerpo.codigo ?? codigo;
    mensaje = cuerpo.mensaje ?? mensaje;
  } catch {
    /* el cuerpo no era JSON */
  }
  throw new ErrorApi(respuesta.status, codigo, mensaje);
}
