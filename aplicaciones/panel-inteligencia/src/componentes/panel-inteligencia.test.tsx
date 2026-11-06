import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ContextoPanel } from '../contexto';
import { instalarVozFalsa, reporteCampanas, reporteMensual, respuestaJson } from '../pruebas/ayudas';
import { PanelInteligencia } from './panel-inteligencia';

function contextoDePrueba(extra: Partial<ContextoPanel> = {}): ContextoPanel {
  return {
    apiIaUrl: 'http://ia',
    obtenerToken: async () => 'token-1',
    usuario: { nombre: 'Gerencia' },
    ...extra,
  };
}

/** Responde segun el metodo y la ruta; devuelve las llamadas para poder inspeccionarlas. */
function simularIa(manejadores: {
  generar?: (n: number, cuerpo: { pregunta: string }) => Response;
  exportar?: () => Response;
}) {
  let llamadasGenerar = 0;
  const falso = vi.fn(async (entrada: RequestInfo | URL, opciones?: RequestInit) => {
    const url = String(entrada);
    if (url.includes('/exportar')) return (manejadores.exportar ?? (() => new Response('x')))();
    llamadasGenerar += 1;
    return (manejadores.generar ?? (() => respuestaJson(reporteCampanas, 201)))(
      llamadasGenerar,
      JSON.parse(String(opciones?.body)),
    );
  });
  vi.stubGlobal('fetch', falso);
  return falso;
}

async function preguntar(texto: string) {
  const caja = screen.getByRole('textbox', { name: /pregunta/i });
  await userEvent.clear(caja);
  await userEvent.type(caja, texto);
  await userEvent.click(screen.getByRole('button', { name: /Preguntar/ }));
}

describe('PanelInteligencia', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    delete (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition;
  });

  it('invita a preguntar y no consulta nada al abrirse', () => {
    const falso = simularIa({});
    render(<PanelInteligencia contexto={contextoDePrueba()} />);
    expect(screen.getByText(/Escriba o dicte una pregunta/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Preguntar/ })).toBeDisabled();
    expect(falso).not.toHaveBeenCalled();
  });

  it('genera un reporte: indicadores, grafico, tabla y la consulta usada', async () => {
    simularIa({});
    render(<PanelInteligencia contexto={contextoDePrueba()} />);
    await preguntar('Campañas activas');

    expect(await screen.findByRole('heading', { level: 2, name: 'Campañas activas' })).toBeInTheDocument();
    expect(screen.getByText('Gasto total').nextElementSibling).toHaveTextContent('Bs 48.850,50');
    expect(screen.getByText(/consultar_campanas/)).toBeInTheDocument();
    expect(screen.getByText(/estado = activa/)).toBeInTheDocument();

    const grafico = screen.getByRole('region', { name: 'Gráfico' });
    expect(within(grafico).getAllByRole('listitem')).toHaveLength(3);
    const tabla = screen.getByRole('table');
    expect(within(tabla).getAllByRole('row')).toHaveLength(4); // encabezado + 3
    expect(within(tabla).getByText('65,1 %')).toBeInTheDocument();
  });

  it('manda el token del anfitrion y una clave de idempotencia por pregunta', async () => {
    const falso = simularIa({});
    render(<PanelInteligencia contexto={contextoDePrueba()} />);
    await preguntar('Campañas activas');
    await screen.findByRole('table');
    const [url, opciones] = falso.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('http://ia/api/v1/reportes');
    const h = opciones.headers as Record<string, string>;
    expect(h.Authorization).toBe('Bearer token-1');
    expect(h['Idempotency-Key']).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('una linea de tiempo se dibuja como linea', async () => {
    simularIa({ generar: () => respuestaJson(reporteMensual, 201) });
    const { container } = render(<PanelInteligencia contexto={contextoDePrueba()} />);
    await preguntar('Gasto de Verano 2027 por mes');
    await screen.findByRole('group', { name: /3 puntos/ });
    expect(container.querySelector('.linea__trazo')).toBeInTheDocument();
  });

  it('si no hay nada que graficar solo muestra indicadores y tabla', async () => {
    simularIa({ generar: () => respuestaJson({ ...reporteCampanas, grafico: null }, 201) });
    render(<PanelInteligencia contexto={contextoDePrueba()} />);
    await preguntar('Campañas activas');
    await screen.findByRole('table');
    expect(screen.queryByRole('region', { name: 'Gráfico' })).toBeNull();
  });

  it('una pregunta bloqueada se explica y queda registrada, sin mostrar datos', async () => {
    simularIa({
      generar: () =>
        respuestaJson(
          { codigo: 'consulta_bloqueada', mensaje: 'La pregunta contiene instrucciones que no se permiten.' },
          403,
        ),
    });
    render(<PanelInteligencia contexto={contextoDePrueba()} />);
    await preguntar('campañas; drop table clientes');
    const alerta = await screen.findByRole('alert');
    expect(alerta).toHaveTextContent('no se permiten');
    expect(alerta).toHaveTextContent('registrada para auditoría');
    expect(screen.queryByRole('table')).toBeNull();
  });

  it('tras una pregunta que falla no queda a la vista el reporte anterior, pero sigue en el historial', async () => {
    simularIa({
      generar: (n) =>
        n === 1
          ? respuestaJson(reporteCampanas, 201)
          : respuestaJson({ codigo: 'consulta_bloqueada', mensaje: 'Bloqueada' }, 403),
    });
    render(<PanelInteligencia contexto={contextoDePrueba()} />);
    await preguntar('Campañas activas');
    await screen.findByRole('table');
    await preguntar('campañas; drop table clientes');
    expect(await screen.findByRole('alert')).toHaveTextContent('Bloqueada');
    expect(screen.queryByRole('table')).toBeNull();
    const historial = screen.getByRole('navigation', { name: /Reportes de esta sesión/ });
    await userEvent.click(within(historial).getByRole('button', { name: /Campañas activas/ }));
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('si no entiende la pregunta ofrece sugerencias que se pueden pulsar', async () => {
    simularIa({
      generar: (n) =>
        n === 1
          ? respuestaJson(
              {
                codigo: 'pregunta_no_entendida',
                mensaje: 'No pude relacionar la pregunta.',
                detalle: { sugerencias: ['Clientes morosos'] },
              },
              422,
            )
          : respuestaJson({ ...reporteCampanas, titulo: 'Clientes con facturas vencidas' }, 201),
    });
    render(<PanelInteligencia contexto={contextoDePrueba()} />);
    await preguntar('cual es el sentido de la vida');
    const grupo = await screen.findByRole('group', { name: /que sí puedo responder|sí puedo responder/i });
    await userEvent.click(within(grupo).getByRole('button', { name: 'Clientes morosos' }));
    expect(
      await screen.findByRole('heading', { level: 2, name: 'Clientes con facturas vencidas' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('un fallo de red o 500 muestra un mensaje y permite volver a intentar', async () => {
    let intento = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        intento += 1;
        if (intento === 1) throw new TypeError('network');
        return respuestaJson(reporteCampanas, 201);
      }),
    );
    render(<PanelInteligencia contexto={contextoDePrueba()} />);
    await preguntar('Campañas activas');
    expect(await screen.findByRole('alert')).toHaveTextContent(/No pudimos conectar/);
    await userEvent.click(screen.getByRole('button', { name: /Preguntar/ }));
    expect(await screen.findByRole('table')).toBeInTheDocument();
  });

  it('avisa al anfitrion cuando la sesion expira', async () => {
    const alExpirarSesion = vi.fn();
    simularIa({ generar: () => new Response('', { status: 401 }) });
    render(<PanelInteligencia contexto={contextoDePrueba({ alExpirarSesion })} />);
    await preguntar('Campañas activas');
    await waitFor(() => expect(alExpirarSesion).toHaveBeenCalled());
  });

  it('exporta a PDF y Excel con el token y descarga el archivo', async () => {
    const falso = simularIa({
      exportar: () =>
        new Response('%PDF', {
          status: 200,
          headers: { 'Content-Disposition': 'attachment; filename="reporte.pdf"' },
        }),
    });
    const crear = vi.fn(() => 'blob:prueba');
    const revocar = vi.fn();
    vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: crear, revokeObjectURL: revocar }));
    const clic = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);

    render(<PanelInteligencia contexto={contextoDePrueba()} />);
    await preguntar('Campañas activas');
    await screen.findByRole('table');
    await userEvent.click(screen.getByRole('button', { name: 'PDF' }));
    await waitFor(() => expect(clic).toHaveBeenCalled());
    const llamada = falso.mock.calls.find((c) => String(c[0]).includes('/exportar'))!;
    expect(String(llamada[0])).toContain(`/api/v1/reportes/${reporteCampanas.id}/exportar?formato=pdf`);
    expect((llamada[1]?.headers as Record<string, string>).Authorization).toBe('Bearer token-1');

    await userEvent.click(screen.getByRole('button', { name: 'Excel' }));
    await waitFor(() =>
      expect(falso.mock.calls.some((c) => String(c[0]).includes('formato=xlsx'))).toBe(true),
    );
    clic.mockRestore();
  });

  it('si la exportacion falla lo dice sin perder el reporte', async () => {
    simularIa({
      exportar: () => respuestaJson({ codigo: 'no_encontrado', mensaje: 'No existe el reporte' }, 404),
    });
    render(<PanelInteligencia contexto={contextoDePrueba()} />);
    await preguntar('Campañas activas');
    await screen.findByRole('table');
    await userEvent.click(screen.getByRole('button', { name: 'PDF' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('No existe el reporte');
    expect(screen.getByRole('table')).toBeInTheDocument();
  });

  it('guarda los reportes de la sesion y permite volver a uno anterior sin consultar de nuevo', async () => {
    const falso = simularIa({
      generar: (n) => respuestaJson(n === 1 ? reporteCampanas : reporteMensual, 201),
    });
    render(<PanelInteligencia contexto={contextoDePrueba()} />);
    await preguntar('Campañas activas');
    await screen.findByRole('heading', { level: 2, name: 'Campañas activas' });
    await preguntar('Gasto de Verano 2027 por mes');
    await screen.findByRole('heading', { level: 2, name: /Gasto mensual/ });

    const historial = screen.getByRole('navigation', { name: /Reportes de esta sesión/ });
    expect(within(historial).getAllByRole('button')).toHaveLength(2);
    await userEvent.click(within(historial).getByRole('button', { name: /Campañas activas/ }));
    expect(screen.getByRole('heading', { level: 2, name: 'Campañas activas' })).toBeInTheDocument();
    expect(falso).toHaveBeenCalledTimes(2);
  });

  it('dicta por voz: el texto reconocido llena la pregunta y se pide reconocimiento local', async () => {
    const voz = instalarVozFalsa();
    simularIa({});
    render(<PanelInteligencia contexto={contextoDePrueba()} />);
    await userEvent.click(screen.getByRole('button', { name: /Dictar/ }));
    expect(voz.instancias[0]).toMatchObject({
      lang: 'es-BO',
      continuous: false,
      interimResults: true,
      processLocally: true,
    });

    act(() => voz.emitir('clientes morosos'));
    expect(screen.getByRole('textbox', { name: /pregunta/i })).toHaveValue('clientes morosos');
    await userEvent.click(screen.getByRole('button', { name: /Escuchando/ }));
    expect(screen.getByRole('button', { name: /Dictar/ })).toBeInTheDocument();
  });

  it('si no se permite el microfono lo explica; sin soporte de voz no muestra el boton', async () => {
    const voz = instalarVozFalsa();
    const { unmount } = render(<PanelInteligencia contexto={contextoDePrueba()} />);
    await userEvent.click(screen.getByRole('button', { name: /Dictar/ }));
    act(() => voz.fallar('not-allowed'));
    expect(await screen.findByRole('alert')).toHaveTextContent(/No se permitió el micrófono/);
    unmount();
    voz.quitar();
    render(<PanelInteligencia contexto={contextoDePrueba()} />);
    expect(screen.queryByRole('button', { name: /Dictar/ })).toBeNull();
  });

  it('Ctrl+Enter envia la pregunta', async () => {
    const falso = simularIa({});
    render(<PanelInteligencia contexto={contextoDePrueba()} />);
    await userEvent.type(
      screen.getByRole('textbox', { name: /pregunta/i }),
      'Campañas activas{Control>}{Enter}{/Control}',
    );
    await screen.findByRole('table');
    expect(falso).toHaveBeenCalledTimes(1);
  });
});
