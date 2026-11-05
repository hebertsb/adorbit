import { describe, expect, it } from 'vitest';

import { Brief } from '../../src/domain/brief';
import { ExcepcionDominio } from '../../src/domain/errores';

describe('Brief.crear', () => {
  it('crea un brief en estado "recibido"', () => {
    const brief = Brief.crear({ id: '1', campanaId: 'c1', titulo: 'Lanzamiento' });
    expect(brief.estado).toBe('recibido');
    expect(brief.version).toBe(1);
  });

  it('rechaza un titulo vacio', () => {
    expect(() => Brief.crear({ id: '1', campanaId: 'c1', titulo: '' })).toThrow(ExcepcionDominio);
  });

  it('rechaza un titulo de mas de 200 caracteres', () => {
    const titulo = 'a'.repeat(201);
    expect(() => Brief.crear({ id: '1', campanaId: 'c1', titulo })).toThrow(ExcepcionDominio);
  });

  it('exige campana_id', () => {
    expect(() => Brief.crear({ id: '1', campanaId: '', titulo: 'ok' })).toThrow(ExcepcionDominio);
  });
});
