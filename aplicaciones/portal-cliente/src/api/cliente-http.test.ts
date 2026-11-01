import { administradorFalso, fijarSesion } from '../pruebas/oidc-falso';
import { respuestaJson } from '../pruebas/ayudas';
import { EVENTO_SESION_EXPIRADA, ErrorApi, obtenerJson } from './cliente-http';

vi.mock('../autenticacion/oidc', async () => await import('../pruebas/oidc-falso'));

describe('obtenerJson', () => {
  beforeEach(() => {
    administradorFalso.getUser.mockReset();
    vi.unstubAllGlobals();
  });

  it('envia el token Bearer, la correlacion y solo los parametros con valor', async () => {
    fijarSesion({});
    const falso = vi.fn(async () => respuestaJson({ ok: true }));
    vi.stubGlobal('fetch', falso);

    await expect(
      obtenerJson('http://api', '/v1/x', { estado: 'vencida', page: 0, vacio: '', nulo: undefined }),
    ).resolves.toEqual({ ok: true });

    const [url, opciones] = falso.mock.calls[0] as unknown as [URL, RequestInit];
    expect(url.toString()).toBe('http://api/v1/x?estado=vencida&page=0');
    const cabeceras = opciones.headers as Record<string, string>;
    expect(cabeceras.Authorization).toMatch(/^Bearer .+\..+\..+$/);
    expect(cabeceras['X-Correlation-Id']).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('traduce el error de la API a ErrorApi', async () => {
    fijarSesion({});
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        respuestaJson({ codigo: 'factura_no_encontrada', mensaje: 'No existe la factura' }, 404),
      ),
    );
    await expect(obtenerJson('http://api', '/v1/facturas/x')).rejects.toMatchObject({
      estado: 404,
      codigo: 'factura_no_encontrada',
      message: 'No existe la factura',
    });
  });

  it('sin sesion no llama a la API y avisa que expiro', async () => {
    fijarSesion(null);
    const falso = vi.fn();
    vi.stubGlobal('fetch', falso);
    const alExpirar = vi.fn();
    window.addEventListener(EVENTO_SESION_EXPIRADA, alExpirar);

    await expect(obtenerJson('http://api', '/v1/x')).rejects.toBeInstanceOf(ErrorApi);
    expect(falso).not.toHaveBeenCalled();
    expect(alExpirar).toHaveBeenCalledTimes(1);
    window.removeEventListener(EVENTO_SESION_EXPIRADA, alExpirar);
  });

  it('un 401 del servidor tambien cierra la sesion local', async () => {
    fijarSesion({});
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('', { status: 401 })),
    );
    const alExpirar = vi.fn();
    window.addEventListener(EVENTO_SESION_EXPIRADA, alExpirar);
    await expect(obtenerJson('http://api', '/v1/x')).rejects.toMatchObject({ estado: 401 });
    expect(alExpirar).toHaveBeenCalled();
    window.removeEventListener(EVENTO_SESION_EXPIRADA, alExpirar);
  });
});
