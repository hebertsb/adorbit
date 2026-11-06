/**
 * Contrato con quien aloja el panel (el contenedor Angular del portal de gestion, o `main.tsx` cuando corre solo).
 * El panel nunca guarda ni pide credenciales: le pide el token al anfitrion cada vez que llama a ms-ia.
 */
export interface ContextoPanel {
  /** URL base de ms-ia o del gateway, sin barra final. */
  apiIaUrl: string;
  /** Devuelve un token de acceso vigente; debe lanzar si no hay sesion. */
  obtenerToken: () => Promise<string>;
  /** El panel lo llama cuando ms-ia responde 401: el anfitrion decide como volver a autenticar. */
  alExpirarSesion?: () => void;
  usuario?: { nombre?: string };
  /** 'sistema' (por defecto) sigue el tema del sistema operativo. */
  tema?: 'claro' | 'oscuro' | 'sistema';
}

export interface PanelMontado {
  desmontar: () => void;
  /** Cambia partes del contexto en caliente (p. ej. el tema) sin perder el estado del panel. */
  actualizarContexto: (cambios: Partial<ContextoPanel>) => void;
}
