import { decodificarReclamos, usuarioDesdeToken } from './reclamos';

function token(carga: object): string {
  const b64 = (o: object) =>
    btoa(String.fromCharCode(...new TextEncoder().encode(JSON.stringify(o))))
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');
  return `${b64({ alg: 'RS256' })}.${b64(carga)}.firma`;
}

describe('reclamos del token', () => {
  it('lee roles y cliente_id', () => {
    const u = usuarioDesdeToken(
      token({ preferred_username: 'ana', realm_access: { roles: ['cliente'] }, cliente_id: 'abc' }),
    );
    expect(u).toEqual({ nombre: 'ana', roles: ['cliente'], clienteId: 'abc' });
  });

  it('soporta tildes y eñes en el nombre', () => {
    expect(usuarioDesdeToken(token({ name: 'María Peña' })).nombre).toBe('María Peña');
  });

  it('un token ilegible no rompe: queda sin roles ni cliente', () => {
    expect(decodificarReclamos('basura')).toEqual({});
    expect(usuarioDesdeToken('x.%%%.y')).toMatchObject({ roles: [], clienteId: null });
  });
});
