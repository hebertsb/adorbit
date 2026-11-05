import { describe, expect, it } from 'vitest';

import { ExcepcionDominio } from '../../src/domain/errores';
import { Pieza } from '../../src/domain/pieza';

function crearPieza() {
  return Pieza.crear({
    id: 'p1',
    briefId: 'b1',
    campanaId: 'c1',
    nombre: 'Banner',
    tipo: 'imagen',
    versionNumero: 1,
  });
}

describe('Pieza', () => {
  it('se crea en estado "en_revision"', () => {
    const pieza = crearPieza();
    expect(pieza.estado).toBe('en_revision');
  });

  it('aprobar() cambia el estado y sube la version', () => {
    const pieza = crearPieza();
    pieza.aprobar();
    expect(pieza.estado).toBe('aprobada');
    expect(pieza.version).toBe(2);
  });

  it('rechazar() cambia el estado a "rechazada"', () => {
    const pieza = crearPieza();
    pieza.rechazar();
    expect(pieza.estado).toBe('rechazada');
  });

  it('una pieza bloqueada_saga no se puede aprobar de nuevo', () => {
    const pieza = Pieza.reconstituir({
      id: 'p1',
      briefId: 'b1',
      campanaId: 'c1',
      nombre: 'Banner',
      tipo: 'imagen',
      versionNumero: 1,
      estado: 'bloqueada_saga',
      bloqueoSaga: { sagaId: 's1', campanaId: 'c1', bloqueadoAt: new Date(), expiraAt: new Date() },
      version: 2,
      creadoEn: new Date(),
      actualizadoEn: new Date(),
    });

    expect(() => pieza.aprobar()).toThrow(ExcepcionDominio);
    expect(() => pieza.rechazar()).toThrow(ExcepcionDominio);
  });

  it('una pieza bloqueada_saga no acepta nuevas validaciones de marca', () => {
    const pieza = Pieza.reconstituir({
      id: 'p1',
      briefId: 'b1',
      campanaId: 'c1',
      nombre: 'Banner',
      tipo: 'imagen',
      versionNumero: 1,
      estado: 'bloqueada_saga',
      bloqueoSaga: { sagaId: 's1', campanaId: 'c1', bloqueadoAt: new Date(), expiraAt: new Date() },
      version: 2,
      creadoEn: new Date(),
      actualizadoEn: new Date(),
    });

    expect(() => pieza.registrarValidacionMarca({ manualMarcaOk: true })).toThrow(ExcepcionDominio);
  });
});
