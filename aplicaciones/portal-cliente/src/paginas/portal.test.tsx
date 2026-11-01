import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { administradorFalso, fijarSesion } from '../pruebas/oidc-falso';
import { factura, renderizarAplicacion, simularApi } from '../pruebas/ayudas';

vi.mock('../autenticacion/oidc', async () => await import('../pruebas/oidc-falso'));
vi.mock('../configuracion', () => ({
  configuracion: {
    oidc: { autoridad: 'http://kc', clienteId: 'portal-cliente' },
    apiFacturacion: 'http://fact',
    apiCrm: 'http://crm',
  },
  variablesFaltantes: () => [],
}));

const credito = {
  cliente_id: 'cliente-1',
  linea_credito: { limite: '50000.00', usado: '12500.00', moneda: 'BOB' },
  disponible: '37500.00',
  reservas_activas: [
    { reserva_id: 'r1', campana_id: 'abcdef12-0000', monto: '12500.00', estado: 'reservado' },
  ],
};
const pagina = (contenido: unknown[]) => ({
  contenido,
  page: 0,
  size: 100,
  total_elementos: contenido.length,
});

describe('portal del cliente', () => {
  beforeEach(() => {
    administradorFalso.getUser.mockReset();
    administradorFalso.signinRedirect.mockClear();
  });

  it('sin sesion ofrece ingresar y no consulta ninguna API', async () => {
    fijarSesion(null);
    const { falso } = simularApi({});
    renderizarAplicacion('/facturas');
    await userEvent.click(await screen.findByRole('button', { name: 'Ingresar' }));
    expect(administradorFalso.signinRedirect).toHaveBeenCalledWith({ state: { volverA: '/facturas' } });
    expect(falso).not.toHaveBeenCalled();
  });

  it('un usuario sin rol cliente ve «Sin acceso» y no se consulta nada', async () => {
    fijarSesion({ roles: ['ejecutivo'] });
    const { falso } = simularApi({});
    renderizarAplicacion('/');
    expect(await screen.findByRole('heading', { name: 'Sin acceso a este portal' })).toBeInTheDocument();
    expect(falso).not.toHaveBeenCalled();
  });

  it('un cliente cuyo token no trae cliente_id queda sin acceso', async () => {
    fijarSesion({ clienteId: '' });
    simularApi({});
    renderizarAplicacion('/');
    expect(await screen.findByRole('heading', { name: 'Sin acceso a este portal' })).toBeInTheDocument();
  });

  it('el resumen suma saldos por moneda, resalta vencidas y muestra el credito', async () => {
    fijarSesion({});
    simularApi({
      '/api/v1/facturas': pagina([
        factura({ id: 'a', estado: 'vencida', saldo: '500.00', fecha_vencimiento: '2026-10-01' }),
        factura({ id: 'b', saldo: '1500.50', fecha_vencimiento: '2099-01-01' }),
        factura({ id: 'c', moneda: 'USD', saldo: '40.00', fecha_vencimiento: '2099-01-01' }),
        factura({ id: 'd', estado: 'pagada', saldo: '0.00' }),
      ]),
      '/credito': credito,
      '/api/v1/contratos': pagina([
        { id: 'k1', estado: 'vigente' },
        { id: 'k2', estado: 'vencido' },
      ]),
    });
    renderizarAplicacion('/');

    expect(await screen.findByText('Saldo pendiente (BOB)')).toBeInTheDocument();
    expect(screen.getByText('Bs 2.000,50')).toBeInTheDocument();
    expect(screen.getByText('US$ 40,00')).toBeInTheDocument();
    expect(screen.getByText(/1 vencida/)).toBeInTheDocument();
    expect(screen.getByText('Bs 37.500,00')).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: /linea de credito/i })).toHaveAttribute(
      'aria-valuenow',
      '25',
    );
    expect(screen.getByText('Contratos vigentes').nextElementSibling).toHaveTextContent('1');
  });

  it('las consultas usan el cliente_id del token y no uno de la URL', async () => {
    fijarSesion({ clienteId: 'mi-cliente' });
    const { llamadas } = simularApi({
      '/api/v1/facturas': pagina([]),
      '/credito': credito,
      '/api/v1/contratos': pagina([]),
    });
    renderizarAplicacion('/?cliente=otro-cliente');
    await screen.findByText('Al dia');
    expect(llamadas.some((u) => u.pathname.endsWith('/clientes/mi-cliente/credito'))).toBe(true);
    expect(llamadas.some((u) => u.toString().includes('otro-cliente'))).toBe(false);
  });

  it('lista facturas, filtra por estado y pagina', async () => {
    fijarSesion({});
    const { llamadas } = simularApi({
      '/api/v1/facturas': (url: URL) => {
        const estado = url.searchParams.get('estado');
        const todas = [factura({ id: 'a' }), factura({ id: 'b', estado: 'vencida' })];
        const lista = estado ? todas.filter((f) => f.estado === estado) : todas;
        return new Response(JSON.stringify({ contenido: lista, page: 0, size: 10, total_elementos: 25 }), {
          status: 200,
        });
      },
    });
    renderizarAplicacion('/facturas');

    const tabla = await screen.findByRole('table');
    expect(within(tabla).getAllByRole('row')).toHaveLength(3); // encabezado + 2
    expect(screen.getByText('Pagina 1 de 3')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Anterior' })).toBeDisabled();

    await userEvent.click(screen.getByRole('button', { name: 'Vencidas' }));
    await waitFor(() => expect(llamadas.some((u) => u.searchParams.get('estado') === 'vencida')).toBe(true));
    expect(screen.getByRole('button', { name: 'Vencidas' })).toHaveAttribute('aria-pressed', 'true');

    await userEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
    await waitFor(() => expect(llamadas.some((u) => u.searchParams.get('page') === '1')).toBe(true));
  });

  it('el detalle muestra items, totales y pagos', async () => {
    fijarSesion({});
    simularApi({
      '/api/v1/facturas/f1111111': factura({
        estado: 'pagada_parcial',
        saldo: '1260.00',
        cobros: [
          { id: 'p1', factura_id: 'f', monto: '700.00', fecha: '2026-11-03', referencia: 'transf-77' },
        ],
      }),
    });
    renderizarAplicacion('/facturas/f1111111-1111-1111-1111-111111111111');

    expect(await screen.findByText('Spot de radio')).toBeInTheDocument();
    expect(screen.getByText('Pago parcial')).toBeInTheDocument();
    expect(screen.getAllByText('Bs 2.260,00').length).toBeGreaterThan(0);
    expect(screen.getByText(/transf-77/)).toBeInTheDocument();
    expect(screen.getByText('Bs 700,00')).toBeInTheDocument();
  });

  it('una factura ajena (404 de la API) no revela nada y permite volver', async () => {
    fijarSesion({});
    simularApi({});
    renderizarAplicacion('/facturas/no-es-mia');
    expect(await screen.findByRole('alert')).toHaveTextContent('No encontramos lo que busca.');
    expect(within(screen.getByRole('main')).getByRole('link', { name: /Facturas/ })).toBeInTheDocument();
  });

  it('si la API falla muestra el error y permite reintentar', async () => {
    fijarSesion({});
    let intentos = 0;
    simularApi({
      '/api/v1/contratos': () => {
        intentos += 1;
        return intentos === 1
          ? new Response(
              JSON.stringify({ codigo: 'error_interno', mensaje: 'Ocurrio un error inesperado' }),
              { status: 500 },
            )
          : new Response(
              JSON.stringify(
                pagina([
                  {
                    id: 'k',
                    estado: 'vigente',
                    monto: '9000.00',
                    moneda: 'BOB',
                    fecha_inicio: '2026-11-01',
                    fecha_fin: '2027-11-01',
                  },
                ]),
              ),
              { status: 200 },
            );
      },
    });
    renderizarAplicacion('/contratos');
    expect(await screen.findByRole('alert')).toHaveTextContent('Ocurrio un error inesperado');
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByText('Bs 9.000,00')).toBeInTheDocument();
  });

  it('«Mi empresa» muestra la razon social y los contactos con enlaces', async () => {
    fijarSesion({});
    simularApi({
      '/api/v1/clientes/cliente-1': {
        id: 'cliente-1',
        razon_social: 'Distribuidora Sol SRL',
        nit: '1020304050',
        estado: 'activo',
        contactos: [{ id: 'c1', nombre: 'Ana Rojas', email: 'ana@sol.bo', rol: 'facturacion' }],
        linea_credito: { limite: '1.00', usado: '0.00', moneda: 'BOB' },
      },
    });
    renderizarAplicacion('/empresa');
    expect(await screen.findByRole('heading', { name: 'Distribuidora Sol SRL' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'ana@sol.bo' })).toHaveAttribute('href', 'mailto:ana@sol.bo');
  });

  it('salir limpia la cache de datos guardados y cierra la sesion', async () => {
    fijarSesion({});
    simularApi({ '/api/v1/facturas': pagina([]), '/credito': credito, '/api/v1/contratos': pagina([]) });
    const borrar = vi.fn(async () => true);
    vi.stubGlobal('caches', { delete: borrar });
    renderizarAplicacion('/');
    await userEvent.click(await screen.findByRole('button', { name: /Salir/ }));
    await waitFor(() => expect(administradorFalso.signoutRedirect).toHaveBeenCalled());
    expect(borrar).toHaveBeenCalledWith('api-datos');
  });
});
