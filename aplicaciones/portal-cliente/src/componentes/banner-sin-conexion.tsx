import { useSyncExternalStore } from 'react';
import { Icono } from './iconos';

function suscribir(aviso: () => void): () => void {
  window.addEventListener('online', aviso);
  window.addEventListener('offline', aviso);
  return () => {
    window.removeEventListener('online', aviso);
    window.removeEventListener('offline', aviso);
  };
}

export function useEnLinea(): boolean {
  return useSyncExternalStore(
    suscribir,
    () => navigator.onLine,
    () => true,
  );
}

export function BannerSinConexion() {
  if (useEnLinea()) return null;
  return (
    <div className="banner-sin-conexion" role="status">
      <Icono nombre="sinConexion" tamano={18} />
      <span>Sin conexion: se muestran los ultimos datos guardados en este equipo.</span>
    </div>
  );
}
