import { vi } from 'vitest';

/** Doble del UserManager de oidc-client-ts: la sesion se define con fijarSesion(). */
export const administradorFalso = {
  getUser: vi.fn(),
  removeUser: vi.fn(async () => undefined),
  signinRedirect: vi.fn(async () => undefined),
  signoutRedirect: vi.fn(async () => undefined),
  signinRedirectCallback: vi.fn(),
};

export const obtenerAdministrador = () => administradorFalso;

function b64(o: object): string {
  return btoa(String.fromCharCode(...new TextEncoder().encode(JSON.stringify(o))))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

export function fijarSesion(
  opciones: { roles?: string[]; clienteId?: string; expirada?: boolean } | null,
): void {
  if (opciones === null) {
    administradorFalso.getUser.mockResolvedValue(null);
    return;
  }
  const { roles = ['cliente'], clienteId = 'cliente-1', expirada = false } = opciones;
  administradorFalso.getUser.mockResolvedValue({
    access_token: `${b64({ alg: 'RS256' })}.${b64({ name: 'Ana Rojas', realm_access: { roles }, cliente_id: clienteId })}.firma`,
    expired: expirada,
    profile: { name: 'Ana Rojas' },
  });
}
