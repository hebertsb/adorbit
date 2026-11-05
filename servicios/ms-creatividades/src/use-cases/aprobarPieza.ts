import { randomUUID } from 'node:crypto';

import { ExcepcionDominio } from '../domain/errores';
import type { Pieza } from '../domain/pieza';
import type { IdempotenciaRepositorio, OutboxRepositorio, PiezaRepositorio, UnidadDeTrabajo } from '../domain/puertos';
import { conIdempotencia, type ResultadoIdempotente } from './compartido/idempotencia';

export type DecisionPieza = 'aprobar' | 'rechazar';

/**
 * Accion explicita del revisor humano sobre una pieza (separado de /validaciones, que
 * solo deja constancia de una comprobacion — ver RegistrarValidacion). Decision propia
 * no especificada en los docs: un solo endpoint con "decision" en el cuerpo en vez de
 * dos endpoints (/aprobar y /rechazar), por ser la opcion mas simple.
 */
export class AprobarPieza {
  constructor(
    private readonly piezas: PiezaRepositorio,
    private readonly outbox: OutboxRepositorio,
    private readonly idempotencia: IdempotenciaRepositorio,
    private readonly unidadDeTrabajo: UnidadDeTrabajo,
  ) {}

  async ejecutar(
    claveIdempotencia: string,
    piezaId: string,
    decision: DecisionPieza,
  ): Promise<ResultadoIdempotente<Pieza>> {
    return conIdempotencia<Pieza>({
      idempotencia: this.idempotencia,
      unidadDeTrabajo: this.unidadDeTrabajo,
      clave: claveIdempotencia,
      datosHuella: { piezaId, decision },
      reconstruirReplay: async () => (await this.piezas.buscarPorId(piezaId)) ?? undefined,
      ejecutar: async (sesion) => {
        const pieza = await this.piezas.buscarPorId(piezaId);
        if (!pieza) {
          throw new ExcepcionDominio('pieza_no_encontrada', `No existe la pieza ${piezaId}`);
        }

        if (decision === 'aprobar') {
          pieza.aprobar();
        } else {
          pieza.rechazar();
        }

        await this.piezas.guardar(pieza, sesion);

        // "Publica: PiezaAprobada" — el catalogo de eventos no lista un equivalente de
        // rechazo, asi que solo se publica en la rama de aprobacion.
        if (decision === 'aprobar') {
          await this.outbox.encolar(
            {
              id: randomUUID(),
              tipoAgregado: 'pieza',
              agregadoId: pieza.id,
              tipoEvento: 'PiezaAprobada',
              correlacionId: pieza.id,
              carga: {
                pieza_id: pieza.id,
                campana_id: pieza.campanaId,
                'archivo.ruta': pieza.archivo?.ruta ?? null,
              },
            },
            sesion,
          );
        }

        return { resultado: pieza, datosGuardados: { pieza_id: pieza.id } };
      },
    });
  }
}
