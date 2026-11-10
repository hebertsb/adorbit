import { useQueryClient } from '@tanstack/react-query';
import { User } from 'oidc-client-ts';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { configuracion } from '../configuracion';
import { EVENTO_SESION_EXPIRADA } from './eventos';
import { obtenerAdministrador } from './oidc';
import { usuarioDesdeToken, type UsuarioSesion } from './reclamos';

type Fase = 'cargando' | 'anonimo' | 'autenticado';

interface ValorAutenticacion {
  fase: Fase;
  usuario: UsuarioSesion | null;
  iniciarSesion: (volverA?: string) => Promise<void>;
  iniciarSesionDemoCliente?: () => Promise<void>;
  cerrarSesion: () => Promise<void>;
  /** Llamado por la pagina de retorno de Keycloak cuando ya hay sesion. */
  sesionIniciada: () => Promise<void>;
}

const Contexto = createContext<ValorAutenticacion | null>(null);

/** Datos guardados offline por el service worker: se borran al salir (equipos compartidos). */
export async function borrarCachesDeDatos(): Promise<void> {
  if ('caches' in window) await caches.delete('api-datos');
}

export function ProveedorAutenticacion({ children }: { children: ReactNode }) {
  const [fase, setFase] = useState<Fase>('cargando');
  const [usuario, setUsuario] = useState<UsuarioSesion | null>(null);
  const clienteConsultas = useQueryClient();

  const aplicarUsuario = useCallback((actual: User | null) => {
    if (actual && !actual.expired) {
      setUsuario(usuarioDesdeToken(actual.access_token, actual.profile?.name));
      setFase('autenticado');
    } else {
      setUsuario(null);
      setFase('anonimo');
      // Sin sesion no debe quedar nada del usuario anterior en este equipo.
      void borrarCachesDeDatos();
    }
  }, []);

  const cargarSesion = useCallback(async () => {
    aplicarUsuario(await obtenerAdministrador().getUser());
  }, [aplicarUsuario]);

  useEffect(() => {
    let cancelado = false;
    void obtenerAdministrador()
      .getUser()
      .then((actual) => {
        if (!cancelado) aplicarUsuario(actual);
      });
    return () => {
      cancelado = true;
    };
  }, [aplicarUsuario]);

  useEffect(() => {
    const alExpirar = () => {
      void obtenerAdministrador().removeUser();
      void borrarCachesDeDatos();
      clienteConsultas.clear();
      setUsuario(null);
      setFase('anonimo');
    };
    window.addEventListener(EVENTO_SESION_EXPIRADA, alExpirar);
    return () => window.removeEventListener(EVENTO_SESION_EXPIRADA, alExpirar);
  }, [clienteConsultas]);

  const iniciarSesion = useCallback(async (volverA?: string) => {
    await obtenerAdministrador().signinRedirect({ state: { volverA: volverA ?? '/' } });
  }, []);

  const iniciarSesionDemoCliente = useCallback(async () => {
    const cuerpo = new URLSearchParams({
      grant_type: 'password',
      client_id: configuracion.oidc.clienteId,
      username: 'cliente@adorbit.com',
      password: 'AdOrbit2026!',
      scope: 'openid profile adorbit-audiencias',
    });
    const res = await fetch(`${configuracion.oidc.autoridad}/protocol/openid-connect/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: cuerpo.toString(),
    });
    if (!res.ok) throw new Error('No se pudo autenticar cuenta demo de cliente');
    const datos = (await res.json()) as {
      access_token: string;
      id_token?: string;
      refresh_token?: string;
      token_type?: string;
      expires_in?: number;
      scope?: string;
    };
    const ahora = Math.floor(Date.now() / 1000);
    const usuarioOidc = new User({
      access_token: datos.access_token,
      id_token: datos.id_token,
      refresh_token: datos.refresh_token,
      token_type: datos.token_type ?? 'Bearer',
      scope: datos.scope ?? 'openid profile adorbit-audiencias',
      expires_at: ahora + (datos.expires_in ?? 1800),
      profile: {
        sub: 'cliente-demo',
        name: 'Carlos Anunciante (Banco Mercantil Santa Cruz S.A.)',
        preferred_username: 'cliente@adorbit.com',
      } as any,
    });
    const admin = obtenerAdministrador() as any;
    if (typeof admin.storeUser === 'function') {
      await admin.storeUser(usuarioOidc);
    }
    clienteConsultas.clear();
    aplicarUsuario(usuarioOidc);
  }, [aplicarUsuario, clienteConsultas]);

  const cerrarSesion = useCallback(async () => {
    clienteConsultas.clear();
    await borrarCachesDeDatos();
    const admin = obtenerAdministrador() as any;
    if (typeof admin.removeUser === 'function') {
      await admin.removeUser();
    }
    await obtenerAdministrador().signoutRedirect();
  }, [clienteConsultas]);

  const valor = useMemo<ValorAutenticacion>(
    () => ({
      fase,
      usuario,
      iniciarSesion,
      iniciarSesionDemoCliente,
      cerrarSesion,
      sesionIniciada: cargarSesion,
    }),
    [fase, usuario, iniciarSesion, iniciarSesionDemoCliente, cerrarSesion, cargarSesion],
  );
  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useAutenticacion(): ValorAutenticacion {
  const valor = useContext(Contexto);
  if (!valor) throw new Error('useAutenticacion debe usarse dentro de ProveedorAutenticacion');
  return valor;
}
