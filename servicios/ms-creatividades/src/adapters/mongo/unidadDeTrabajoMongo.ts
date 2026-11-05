import type { UnidadDeTrabajo } from '../../domain/puertos';
import { enTransaccion } from './transaccion';

export class UnidadDeTrabajoMongo implements UnidadDeTrabajo {
  ejecutar<T>(trabajo: (sesion: unknown) => Promise<T>): Promise<T> {
    return enTransaccion(trabajo);
  }
}
