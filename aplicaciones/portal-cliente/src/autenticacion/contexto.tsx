import { useQueryClient } from '@tanstack/react-query';
import type { User } from 'oidc-client-ts';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { EVENTO_SESION_EXPIRADA } from '../api/cliente-http';
import { obtenerAdministrador } from './oidc';
import { usuarioDesdeToken, type UsuarioSesion } from './reclamos';

type Fase = 'cargando' | 'anonimo' | 'autenticado';

interface ValorAutenticacion {
  fase: Fase;
  usuario: UsuarioSesion | null;
  iniciarSesion: (volverA?: string) => Promise<void>;
  cerrarSesion: () => Promise<void>;
  /** Llamado por la pagina de retorno de Keycloak cuando ya hay sesion. */
  sesionIniciada: () => Promise<void>;
}

const Contexto = createContext<ValorAutenticacion | null>(null);

/** Datos guardados offline por el service worker: se borran al salir (equipos compartidos). */
async function borrarCachesDeDatos(): Promise<void> {
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

  const cerrarSesion = useCallback(async () => {
    clienteConsultas.clear();
    await borrarCachesDeDatos();
    await obtenerAdministrador().signoutRedirect();
  }, [clienteConsultas]);

  const valor = useMemo<ValorAutenticacion>(
    () => ({ fase, usuario, iniciarSesion, cerrarSesion, sesionIniciada: cargarSesion }),
    [fase, usuario, iniciarSesion, cerrarSesion, cargarSesion],
  );
  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useAutenticacion(): ValorAutenticacion {
  const valor = useContext(Contexto);
  if (!valor) throw new Error('useAutenticacion debe usarse dentro de ProveedorAutenticacion');
  return valor;
}
