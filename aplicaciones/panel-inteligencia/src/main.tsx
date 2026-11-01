/**
 * Arranque INDEPENDIENTE del panel (sin el portal de gestion): hace su propio login OIDC (Authorization Code + PKCE)
 * y monta el mismo `montarPanel` que usa el anfitrion. Dentro del portal de gestion este archivo no se usa.
 */
import { UserManager, WebStorageStateStore } from 'oidc-client-ts';
import type { ContextoPanel } from './contexto';
import { montarPanel } from './montar';

const autoridad = (import.meta.env.VITE_OIDC_AUTORIDAD ?? '').replace(/\/+$/, '');
const apiIaUrl = (import.meta.env.VITE_API_IA_URL ?? '').replace(/\/+$/, '');
const clienteId = import.meta.env.VITE_OIDC_CLIENTE_ID ?? 'panel-inteligencia';
const ROLES_PERMITIDOS = ['gerente', 'ejecutivo'];

const raiz = document.getElementById('raiz')!;

function pantalla(titulo: string, texto: string, boton?: { texto: string; alPulsar: () => void }) {
  raiz.replaceChildren();
  const tarjeta = document.createElement('main');
  tarjeta.style.cssText =
    'max-width:420px;margin:12vh auto;padding:24px;text-align:center;font:16px/1.5 system-ui,sans-serif';
  const h1 = document.createElement('h1');
  h1.textContent = titulo;
  const p = document.createElement('p');
  p.textContent = texto;
  tarjeta.append(h1, p);
  if (boton) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = boton.texto;
    b.style.cssText =
      'min-height:44px;padding:0 20px;border:0;border-radius:10px;background:#4f46e5;color:#fff;font:inherit;font-weight:600;cursor:pointer';
    b.addEventListener('click', boton.alPulsar);
    tarjeta.append(b);
  }
  raiz.append(tarjeta);
}

function decodificarRoles(token: string): string[] {
  try {
    const carga = token.split('.')[1] ?? '';
    const json = JSON.parse(
      new TextDecoder().decode(
        Uint8Array.from(atob(carga.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0)),
      ),
    );
    return json?.realm_access?.roles ?? [];
  } catch {
    return [];
  }
}

async function iniciar() {
  if (!autoridad || !apiIaUrl) {
    pantalla('Configuración incompleta', 'Faltan VITE_OIDC_AUTORIDAD y/o VITE_API_IA_URL.');
    return;
  }
  const administrador = new UserManager({
    authority: autoridad,
    client_id: clienteId,
    redirect_uri: `${window.location.origin}/autenticado`,
    post_logout_redirect_uri: `${window.location.origin}/`,
    response_type: 'code',
    scope: 'openid profile',
    userStore: new WebStorageStateStore({ store: window.sessionStorage }),
    automaticSilentRenew: true, // renueva el token antes de que venza (refresh token)
  });
  administrador.events.addSilentRenewError(() => {
    void administrador.removeUser().then(() => window.location.assign('/'));
  });

  if (window.location.pathname === '/autenticado') {
    try {
      await administrador.signinRedirectCallback();
    } catch {
      pantalla('No pudimos iniciar su sesión', 'El inicio de sesión no se completó.', {
        texto: 'Volver a intentar',
        alPulsar: () => window.location.assign('/'),
      });
      return;
    }
    window.history.replaceState({}, '', '/');
  }

  const usuario = await administrador.getUser();
  if (!usuario || usuario.expired) {
    pantalla('Panel de inteligencia', 'Ingrese para consultar los reportes de AdOrbit.', {
      texto: 'Ingresar',
      alPulsar: () =>
        void administrador
          .signinRedirect()
          .catch(() => pantalla('Error', 'No se pudo abrir el inicio de sesión.')),
    });
    return;
  }
  if (!decodificarRoles(usuario.access_token).some((r) => ROLES_PERMITIDOS.includes(r))) {
    pantalla('Sin acceso', 'Este panel es para gerencia y ejecutivos de la agencia.', {
      texto: 'Salir',
      alPulsar: () => void administrador.signoutRedirect(),
    });
    return;
  }

  const contexto: ContextoPanel = {
    apiIaUrl,
    usuario: { nombre: usuario.profile?.name },
    obtenerToken: async () => {
      const actual = await administrador.getUser();
      if (!actual || actual.expired) throw new Error('sin sesión');
      return actual.access_token;
    },
    alExpirarSesion: () => {
      void administrador.removeUser().then(() => window.location.assign('/'));
    },
  };
  raiz.replaceChildren();
  montarPanel(raiz, contexto);
}

void iniciar();
