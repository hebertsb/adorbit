import { describe, expect, it } from 'vitest';

import { ExcepcionDominio } from '../../src/domain/errores';
import type { IdempotenciaRepositorio, RegistroIdempotencia, UnidadDeTrabajo } from '../../src/domain/puertos';
import { conIdempotencia } from '../../src/use-cases/compartido/idempotencia';

function crearIdempotenciaFalsa(): IdempotenciaRepositorio & { registros: Map<string, RegistroIdempotencia> } {
  const registros = new Map<string, RegistroIdempotencia>();
  return {
    registros,
    async buscarPorClave(clave) {
      return registros.get(clave) ?? null;
    },
    async crear(registro) {
      registros.set(registro.clave, registro);
    },
  };
}

const unidadDeTrabajoFalsa: UnidadDeTrabajo = {
  async ejecutar(trabajo) {
    return trabajo(undefined);
  },
};

describe('conIdempotencia', () => {
  it('ejecuta el trabajo y guarda el registro cuando la clave es nueva', async () => {
    const idempotencia = crearIdempotenciaFalsa();
    let vecesEjecutado = 0;

    const { resultado, repetida } = await conIdempotencia<string>({
      idempotencia,
      unidadDeTrabajo: unidadDeTrabajoFalsa,
      clave: 'clave-1',
      datosHuella: { x: 1 },
      reconstruirReplay: async () => undefined,
      ejecutar: async () => {
        vecesEjecutado++;
        return { resultado: 'creado', datosGuardados: { id: 'r1' } };
      },
    });

    expect(resultado).toBe('creado');
    expect(repetida).toBe(false);
    expect(vecesEjecutado).toBe(1);
    expect(idempotencia.registros.has('clave-1')).toBe(true);
  });

  it('con la misma clave y los mismos datos, hace replay sin re-ejecutar', async () => {
    const idempotencia = crearIdempotenciaFalsa();
    let vecesEjecutado = 0;

    const args = {
      idempotencia,
      unidadDeTrabajo: unidadDeTrabajoFalsa,
      clave: 'clave-2',
      datosHuella: { x: 1 },
      reconstruirReplay: async (guardado: Record<string, unknown>) => `replay:${guardado.id}`,
      ejecutar: async () => {
        vecesEjecutado++;
        return { resultado: 'creado', datosGuardados: { id: 'r2' } };
      },
    };

    await conIdempotencia(args);
    const segunda = await conIdempotencia(args);

    expect(segunda.repetida).toBe(true);
    expect(segunda.resultado).toBe('replay:r2');
    expect(vecesEjecutado).toBe(1); // no se repitio el trabajo real
  });

  it('con la misma clave y datos distintos, lanza idempotencia_conflicto', async () => {
    const idempotencia = crearIdempotenciaFalsa();

    const base = {
      idempotencia,
      unidadDeTrabajo: unidadDeTrabajoFalsa,
      clave: 'clave-3',
      reconstruirReplay: async () => 'x',
      ejecutar: async () => ({ resultado: 'creado', datosGuardados: {} }),
    };

    await conIdempotencia({ ...base, datosHuella: { monto: 100 } });

    await expect(conIdempotencia({ ...base, datosHuella: { monto: 999 } })).rejects.toThrow(ExcepcionDominio);
  });
});
