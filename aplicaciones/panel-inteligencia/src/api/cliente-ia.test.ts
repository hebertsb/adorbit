import { respuestaJson, reporteCampanas } from '../pruebas/ayudas';
import { ErrorIa, crearClienteIa } from './cliente-ia';

const contexto = (extra = {}) => ({ apiIaUrl: 'http://ia', obtenerToken: async () => 'token-1', ...extra });

describe('cliente de ms-ia', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('envia el token, la clave de idempotencia y la pregunta', async () => {
    const falso = vi.fn(async () => respuestaJson(reporteCampanas, 201));
    vi.stubGlobal('fetch', falso);
    const cliente = crearClienteIa(() => contexto());

    await expect(cliente.generarReporte('Campañas activas', 'clave-fija-1')).resolves.toMatchObject({
      titulo: 'Campañas activas',
    });

    const [url, opciones] = falso.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('http://ia/api/v1/reportes');
    const h = opciones.headers as Record<string, string>;
    expect(h.Authorization).toBe('Bearer token-1');
    expect(h['Idempotency-Key']).toBe('clave-fija-1');
    expect(opciones.body).toBe('{"pregunta":"Campañas activas"}');
  });

  it('traduce los errores de la API, incluidas las sugerencias', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        respuestaJson(
          { codigo: 'pregunta_no_entendida', mensaje: 'No entendí', detalle: { sugerencias: ['A', 'B'] } },
          422,
        ),
      ),
    );
    const cliente = crearClienteIa(() => contexto());
    await expect(cliente.generarReporte('???')).rejects.toMatchObject({
      estado: 422,
      codigo: 'pregunta_no_entendida',
      sugerencias: ['A', 'B'],
    });
  });

  it('avisa al anfitrion cuando el token no sirve (401) o no hay sesion', async () => {
    const alExpirarSesion = vi.fn();
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('', { status: 401 })),
    );
    const cliente = crearClienteIa(() => contexto({ alExpirarSesion }));
    await expect(cliente.generarReporte('x y z')).rejects.toBeInstanceOf(ErrorIa);
    expect(alExpirarSesion).toHaveBeenCalledTimes(1);

    const sinSesion = vi.fn();
    const falso = vi.fn();
    vi.stubGlobal('fetch', falso);
    const c2 = crearClienteIa(() =>
      contexto({
        obtenerToken: async () => {
          throw new Error('sin sesión');
        },
        alExpirarSesion: sinSesion,
      }),
    );
    await expect(c2.generarReporte('x y z')).rejects.toMatchObject({ estado: 401 });
    expect(falso).not.toHaveBeenCalled();
    expect(sinSesion).toHaveBeenCalled();
  });

  it('exporta y toma el nombre del archivo del encabezado', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response('%PDF', {
            status: 200,
            headers: { 'Content-Disposition': 'attachment; filename="reporte-mora.pdf"' },
          }),
      ),
    );
    const archivo = await crearClienteIa(() => contexto()).exportar('id-1', 'pdf');
    expect(archivo.nombre).toBe('reporte-mora.pdf');
    expect(await archivo.blob.text()).toBe('%PDF');
  });
});
