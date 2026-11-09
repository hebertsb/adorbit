import { beforeEach, describe, expect, it, vi } from 'vitest';

const { identidad, listar } = vi.hoisted(() => ({ identidad: vi.fn(), listar: vi.fn() }));
vi.mock('../src/adapters/seguridad/verificarJwt', async (importar) => {
  const original = await importar<typeof import('../src/adapters/seguridad/verificarJwt')>();
  return { ...original, verificarJwt: identidad };
});
vi.mock('../src/use-cases/listarBriefs', () => ({
  ListarBriefs: class { ejecutar = listar; },
}));

import { GET } from '../src/app/api/v1/briefs/route';
import type { NextRequest } from 'next/server';

const clienteId = '123e4567-e89b-12d3-a456-426614174000';
const solicitud = (query = '') => new Request(`http://localhost/api/v1/briefs${query}`) as NextRequest;

describe('GET briefs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    identidad.mockResolvedValue({ usuarioId: 'usuario', roles: ['cliente'], clienteId });
    listar.mockResolvedValue({ items: [], total: 0, pagina: 1, tamano: 20 });
  });

  it('acota la consulta al cliente autenticado', async () => {
    const respuesta = await GET(solicitud());
    expect(respuesta.status).toBe(200);
    expect(listar).toHaveBeenCalledWith({ campanaId: undefined, clienteId, pagina: 1, tamano: 20 });
  });

  it('rechaza clientes sin identificador sin consultar datos', async () => {
    identidad.mockResolvedValue({ usuarioId: 'usuario', roles: ['cliente'] });
    expect((await GET(solicitud())).status).toBe(403);
    expect(listar).not.toHaveBeenCalled();
  });

  it.each(['?size=101', '?page=1.5', '?campana_id=no-es-uuid', '?page=1&page=2', '?otro=x'])(
    'rechaza parametros invalidos: %s', async (query) => {
      expect((await GET(solicitud(query))).status).toBe(400);
      expect(listar).not.toHaveBeenCalled();
    },
  );
});
