/** Configuracion del portal: solo variables de entorno de build (VITE_*), nunca secretos. */
const sinBarraFinal = (url: string | undefined): string => (url ?? '').replace(/\/+$/, '');

export const configuracion = {
  oidc: {
    autoridad: sinBarraFinal(import.meta.env.VITE_OIDC_AUTORIDAD),
    clienteId: import.meta.env.VITE_OIDC_CLIENTE_ID ?? 'portal-cliente',
  },
  apiFacturacion: sinBarraFinal(import.meta.env.VITE_API_FACTURACION_URL),
  apiCrm: sinBarraFinal(import.meta.env.VITE_API_CRM_URL),
} as const;

/** Nombres de las variables que faltan (vacio = todo configurado). */
export function variablesFaltantes(): string[] {
  const faltan: string[] = [];
  if (!configuracion.oidc.autoridad) faltan.push('VITE_OIDC_AUTORIDAD');
  if (!configuracion.apiFacturacion) faltan.push('VITE_API_FACTURACION_URL');
  if (!configuracion.apiCrm) faltan.push('VITE_API_CRM_URL');
  return faltan;
}
