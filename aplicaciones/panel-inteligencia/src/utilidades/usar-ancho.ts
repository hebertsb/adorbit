import { useCallback, useState } from 'react';

/** Ancho en pixeles de un elemento, siguiendo sus cambios de tamano. Sin ResizeObserver (pruebas) devuelve el inicial. */
export function useAncho(inicial: number) {
  const [ancho, setAncho] = useState(inicial);
  const ref = useCallback(
    (elemento: HTMLElement | null) => {
      if (!elemento || typeof ResizeObserver === 'undefined') return;
      setAncho(elemento.getBoundingClientRect().width || inicial);
      const observador = new ResizeObserver((entradas) => {
        const nuevo = entradas[0]?.contentRect.width;
        if (nuevo) setAncho(nuevo);
      });
      observador.observe(elemento);
      return () => observador.disconnect();
    },
    [inicial],
  );
  return [ancho, ref] as const;
}
