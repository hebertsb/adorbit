import { randomUUID } from 'node:crypto';

import type { IdempotenciaRepositorio, OutboxRepositorio, PiezaRepositorio, UnidadDeTrabajo } from '../domain/puertos';
import { conIdempotencia, type ResultadoIdempotente } from './compartido/idempotencia';

export interface DatosDesbloquearPiezas {
  sagaId: string;
  campanaId: string;
}

/**
 * Compensacion del paso 3 del SAGA. Solo libera bloqueos de ESE saga_id (ver
 * CLAUDE.md "Reglas de negocio" y el comentario de base_de_datos/ms-creatividades.mongo.js) —
 * nunca piezas bloqueadas por otra SAGA.
 */
export class DesbloquearPiezas {
  constructor(
    private readonly piezas: PiezaRepositorio,
    private readonly idempotencia: IdempotenciaRepositorio,
    private readonly outbox: OutboxRepositorio,
    private readonly unidadDeTrabajo: UnidadDeTrabajo,
  ) {}

  async ejecutar(claveComando: string, datos: DatosDesbloquearPiezas): Promise<ResultadoIdempotente<string[]>> {
    return conIdempotencia<string[]>({
      idempotencia: this.idempotencia,
      unidadDeTrabajo: this.unidadDeTrabajo,
      clave: claveComando,
      datosHuella: datos,
      reconstruirReplay: async (guardado) => (guardado.pieza_ids as string[] | undefined) ?? [],
      ejecutar: async (sesion) => {
        const piezaIds = await this.piezas.desbloquearDeCampana(datos.campanaId, datos.sagaId, sesion);

        await this.outbox.encolar(
          {
            id: randomUUID(),
            tipoAgregado: 'campana',
            agregadoId: datos.campanaId,
            tipoEvento: 'PiezasDesbloqueadas',
            correlacionId: datos.sagaId,
            carga: { saga_id: datos.sagaId, campana_id: datos.campanaId, pieza_ids: piezaIds },
          },
          sesion,
        );

        return { resultado: piezaIds, datosGuardados: { pieza_ids: piezaIds } };
      },
    });
  }
}
