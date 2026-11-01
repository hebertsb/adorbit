/** Lo que el portal necesita del token de acceso (JWT de Keycloak). La validacion real la hacen los servicios. */
export interface Reclamos {
  sub?: string;
  name?: string;
  preferred_username?: string;
  realm_access?: { roles?: string[] };
  cliente_id?: string;
}

export function decodificarReclamos(token: string): Reclamos {
  const carga = token.split('.')[1];
  if (!carga) return {};
  try {
    const binario = atob(carga.replace(/-/g, '+').replace(/_/g, '/'));
    const bytes = Uint8Array.from(binario, (c) => c.charCodeAt(0));
    return JSON.parse(new TextDecoder().decode(bytes)) as Reclamos;
  } catch {
    return {};
  }
}

export interface UsuarioSesion {
  nombre: string;
  roles: string[];
  /** cliente_id del token: es lo UNICO que identifica al cliente (nunca viene de la URL). */
  clienteId: string | null;
}

export function usuarioDesdeToken(token: string, nombrePerfil?: string): UsuarioSesion {
  const r = decodificarReclamos(token);
  return {
    nombre: nombrePerfil ?? r.name ?? r.preferred_username ?? 'Cliente',
    roles: r.realm_access?.roles ?? [],
    clienteId: r.cliente_id ?? null,
  };
}
