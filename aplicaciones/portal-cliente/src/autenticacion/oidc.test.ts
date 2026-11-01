vi.mock('../configuracion', () => ({
  configuracion: {
    oidc: { autoridad: 'http://kc/realms/adorbit', clienteId: 'portal-cliente' },
    apiFacturacion: 'http://f',
    apiCrm: 'http://c',
  },
  variablesFaltantes: () => [],
}));

import { obtenerAdministrador } from './oidc';

describe('configuracion OIDC', () => {
  it('usa PKCE con codigo, sesion solo en la pestana y renovacion automatica del token', () => {
    const ajustes = obtenerAdministrador().settings;
    expect(ajustes.response_type).toBe('code');
    expect(ajustes.automaticSilentRenew).toBe(true);
    expect(ajustes.redirect_uri).toMatch(/\/autenticado$/);
    expect(ajustes.client_secret).toBeUndefined();
  });

  it('es un solo administrador para toda la aplicacion', () => {
    expect(obtenerAdministrador()).toBe(obtenerAdministrador());
  });
});
