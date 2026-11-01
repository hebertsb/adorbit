import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import { vi } from 'vitest';
import { Aplicacion } from '../aplicacion';
import { ProveedorAutenticacion } from '../autenticacion/contexto';

export function respuestaJson(cuerpo: unknown, estado = 200): Response {
  return new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { 'Content-Type': 'application/json' },
  });
}

/** `rutas` asocia un fragmento de URL con la respuesta. Lo no declarado responde 404 como lo haria la API. */
export function simularApi(rutas: Record<string, unknown | ((url: URL) => Response)>) {
  const llamadas: URL[] = [];
  const falso = vi.fn(async (entrada: RequestInfo | URL) => {
    const url = new URL(entrada instanceof Request ? entrada.url : entrada.toString());
    llamadas.push(url);
    const clave = Object.keys(rutas)
      .sort((a, b) => b.length - a.length)
      .find((k) => url.pathname.includes(k));
    if (!clave) return respuestaJson({ codigo: 'no_encontrado', mensaje: 'No existe' }, 404);
    const valor = rutas[clave];
    return typeof valor === 'function' ? (valor as (u: URL) => Response)(url) : respuestaJson(valor);
  });
  vi.stubGlobal('fetch', falso);
  return { llamadas, falso };
}

export function renderizarAplicacion(ruta = '/') {
  window.history.pushState({}, '', ruta);
  const cliente = new QueryClient({ defaultOptions: { queries: { retry: false, networkMode: 'always' } } });
  return render(
    <QueryClientProvider client={cliente}>
      <ProveedorAutenticacion>
        <Aplicacion />
      </ProveedorAutenticacion>
    </QueryClientProvider>,
  );
}

export const factura = (cambios: Record<string, unknown> = {}) => ({
  id: 'f1111111-1111-1111-1111-111111111111',
  cliente_id: 'cliente-1',
  campana_id: 'k',
  estado: 'emitida',
  moneda: 'BOB',
  subtotal: '2000.00',
  impuestos: '260.00',
  total: '2260.00',
  saldo: '2260.00',
  fecha_emision: '2026-11-01',
  fecha_vencimiento: '2026-12-01',
  version: 1,
  items: [
    { numero: 1, descripcion: 'Spot de radio', cantidad: 2, precio_unitario: '1000.00', subtotal: '2000.00' },
  ],
  cobros: [],
  ...cambios,
});
