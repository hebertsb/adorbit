import { UserManager, WebStorageStateStore } from 'oidc-client-ts';
import { configuracion } from '../configuracion';
import { EVENTO_SESION_EXPIRADA } from './eventos';

let administrador: UserManager | null = null;

export function rutaBasePortal(): string {
  if (typeof window !== 'undefined' && window.location.pathname.startsWith('/portal-cliente')) {
    return '/portal-cliente';
  }
  return '';
}

/**
 * Login OIDC con Authorization Code + PKCE (sin secreto en el navegador). La sesion vive en sessionStorage:
 * se pierde al cerrar la pestana, como corresponde a un portal con datos financieros.
 */
export function obtenerAdministrador(): UserManager {
  if (administrador) return administrador;
  const base = rutaBasePortal();
  const sinSubtleCrypto = typeof window !== 'undefined' && !window.crypto?.subtle;
  const nuevo = new UserManager({
    authority: configuracion.oidc.autoridad,
    client_id: configuracion.oidc.clienteId,
    redirect_uri: `${window.location.origin}${base}/autenticado`,
    post_logout_redirect_uri: `${window.location.origin}${base}/`,
    response_type: 'code',
    scope: 'openid profile adorbit-audiencias',
    disablePKCE: sinSubtleCrypto,
    userStore: new WebStorageStateStore({ store: window.sessionStorage }),
    // Renueva el token antes de que venza (con refresh token si el servidor lo entrega): el cliente no es
    // expulsado a mitad de una consulta cuando el access token dura pocos minutos.
    automaticSilentRenew: true,
  });
  nuevo.events.addSilentRenewError(() => {
    window.dispatchEvent(new Event(EVENTO_SESION_EXPIRADA));
  });
  administrador = nuevo;
  return nuevo;
}
