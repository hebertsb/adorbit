import { UserManager, WebStorageStateStore } from 'oidc-client-ts';
import { configuracion } from '../configuracion';

let administrador: UserManager | null = null;

/**
 * Login OIDC con Authorization Code + PKCE (sin secreto en el navegador). La sesion vive en sessionStorage:
 * se pierde al cerrar la pestana, como corresponde a un portal con datos financieros.
 */
export function obtenerAdministrador(): UserManager {
  administrador ??= new UserManager({
    authority: configuracion.oidc.autoridad,
    client_id: configuracion.oidc.clienteId,
    redirect_uri: `${window.location.origin}/autenticado`,
    post_logout_redirect_uri: `${window.location.origin}/`,
    response_type: 'code',
    scope: 'openid profile',
    userStore: new WebStorageStateStore({ store: window.sessionStorage }),
    automaticSilentRenew: false,
  });
  return administrador;
}
