import { DegradadoPieza } from './campana.modelo';

// Degradado visual por tipo de pieza (video/banner/historia/valla), compartido entre
// todas las pantallas que muestran piezas de creatividad.
export const DEGRADADO_PIEZA: Record<DegradadoPieza, string> = {
  video: 'linear-gradient(135deg, #4338ca, #2a78d6)',
  banner: 'linear-gradient(135deg, #0284c7, #4f46e5)',
  historia: 'linear-gradient(135deg, #9333ea, #db2777)',
  valla: 'linear-gradient(135deg, #334155, #0f172a)',
};
