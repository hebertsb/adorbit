import { randomUUID } from 'node:crypto';

import type { BloqueoSaga } from '../domain/pieza';
import type { IdempotenciaRepositorio, OutboxRepositorio, PiezaRepositorio, UnidadDeTrabajo } from '../domain/puertos';
import { conIdempotencia, type ResultadoIdempotente } from './compartido/idempotencia';

export interface DatosBloquearPiezas {
  sagaId: string;
  campanaId: string;
  expiraAt: Date;
}

/**
 * Paso 3 del SAGA de contratacion (ver documentacion/02-saga.md). El comando trae solo
 * { campana_id, expira_at } — sin pieza_ids explicitos — asi que se resuelven aqui todas
 * las piezas "aprobada" de esa campana. 0 piezas aprobadas no es un error de
 * procesamiento: se publica BloqueoFallido por el outbox (nunca un nack silencioso),
 * igual patron que FacturacionFallida en ms-facturacion.
 */
export class BloquearPiezas {
  constructor(
    private readonly piezas: PiezaRepositorio,
    private readonly idempotencia: IdempotenciaRepositorio,
    private readonly outbox: OutboxRepositorio,
    private readonly unidadDeTrabajo: UnidadDeTrabajo,
  ) {}

  async ejecutar(claveComando: string, datos: DatosBloquearPiezas): Promise<ResultadoIdempotente<string[]>> {
    return conIdempotencia<string[]>({
      idempotencia: this.idempotencia,
      unidadDeTrabajo: this.unidadDeTrabajo,
      clave: claveComando,
      datosHuella: { sagaId: datos.sagaId, campanaId: datos.campanaId, expiraAt: datos.expiraAt.toISOString() },
      reconstruirReplay: async (guardado) => (guardado.pieza_ids as string[] | undefined) ?? [],
      ejecutar: async (sesion) => {
        const bloqueo: BloqueoSaga = {
          sagaId: datos.sagaId,
          campanaId: datos.campanaId,
          bloqueadoAt: new Date(),
          expiraAt: datos.expiraAt,
        };
        const piezaIds = await this.piezas.bloquearAprobadasDeCampana(datos.campanaId, bloqueo, sesion);
        const exito = piezaIds.length > 0;

        await this.outbox.encolar(
          {
            id: randomUUID(),
            tipoAgregado: 'campana',
            agregadoId: datos.campanaId,
            tipoEvento: exito ? 'PiezasBloqueadas' : 'BloqueoFallido',
            correlacionId: datos.sagaId,
            carga: exito
              ? { saga_id: datos.sagaId, campana_id: datos.campanaId, pieza_ids: piezaIds }
              : {
                  saga_id: datos.sagaId,
                  campana_id: datos.campanaId,
                  motivo: 'sin_piezas_aprobadas',
                  detalle: 'No hay piezas en estado aprobada para esta campana',
                },
          },
          sesion,
        );

        return { resultado: piezaIds, datosGuardados: { pieza_ids: piezaIds } };
      },
    });
  }
}
