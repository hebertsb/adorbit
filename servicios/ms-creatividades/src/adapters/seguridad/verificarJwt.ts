import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose';

type PayloadKeycloak = JWTPayload & {
  realm_access?: { roles?: string[] };
  cliente_id?: string;
};

/**
 * Validacion de JWT contra Keycloak (JWKS remoto) — firma, iss, aud y expiracion.
 * Mismo patron que SeguridadConfiguracion de ms-facturacion, portado a una funcion
 * simple en vez de un filtro de framework (los handlers de app/api/ la llaman al
 * principio; ver manejadorErrores.ts para como se traduce a HTTP).
 */

export type Rol = 'ejecutivo' | 'creativo' | 'cliente' | 'gerente';

export interface IdentidadAutenticada {
  usuarioId: string;
  roles: Rol[];
  /** Solo presente para usuarios con rol "cliente" — acota sus consultas, nunca un parametro de la URL. */
  clienteId?: string;
}

export class ErrorAutenticacion extends Error {
  readonly status: 401 | 403;

  constructor(mensaje: string, status: 401 | 403 = 401) {
    super(mensaje);
    this.name = 'ErrorAutenticacion';
    this.status = status;
  }
}

let jwksCache: ReturnType<typeof createRemoteJWKSet> | undefined;

function obtenerJwks(): ReturnType<typeof createRemoteJWKSet> {
  if (!jwksCache) {
    const jwksUri = process.env.ADORBIT_CREATIVIDADES_JWKS_URI;
    if (!jwksUri) {
      throw new Error('Falta la variable de entorno ADORBIT_CREATIVIDADES_JWKS_URI');
    }
    jwksCache = createRemoteJWKSet(new URL(jwksUri));
  }
  return jwksCache;
}

function esRolValido(valor: string): valor is Rol {
  return valor === 'ejecutivo' || valor === 'creativo' || valor === 'cliente' || valor === 'gerente';
}

/** Verifica el token Bearer del request y devuelve la identidad autenticada. */
export async function verificarJwt(req: Request): Promise<IdentidadAutenticada> {
  const encabezado = req.headers.get('authorization') ?? '';
  const [esquema, token] = encabezado.split(' ');
  if (esquema?.toLowerCase() !== 'bearer' || !token) {
    throw new ErrorAutenticacion('Falta el encabezado Authorization: Bearer <token>');
  }

  let payload: PayloadKeycloak;
  try {
    const resultado = await jwtVerify(token, obtenerJwks(), {
      issuer: process.env.ADORBIT_CREATIVIDADES_EMISOR,
      audience: process.env.ADORBIT_CREATIVIDADES_AUDIENCIA ?? 'ms-creatividades',
    });
    payload = resultado.payload as PayloadKeycloak;
  } catch {
    throw new ErrorAutenticacion('Token invalido o expirado');
  }

  if (!payload.sub) {
    throw new ErrorAutenticacion('El token no tiene subject');
  }

  const roles = (payload.realm_access?.roles ?? []).filter(esRolValido);
  const clienteId = typeof payload.cliente_id === 'string' ? payload.cliente_id : undefined;

  return { usuarioId: payload.sub, roles, clienteId };
}

/** Lanza 403 si la identidad no tiene ninguno de los roles permitidos para el endpoint. */
export function exigirRol(identidad: IdentidadAutenticada, rolesPermitidos: Rol[]): void {
  const tienePermiso = identidad.roles.some((rol) => rolesPermitidos.includes(rol));
  if (!tienePermiso) {
    throw new ErrorAutenticacion('No tienes permiso para esta accion', 403);
  }
}
