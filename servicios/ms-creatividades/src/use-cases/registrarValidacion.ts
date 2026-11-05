import { ExcepcionDominio } from '../domain/errores';
import type {
  IdempotenciaRepositorio,
  OrigenValidacion,
  PiezaRepositorio,
  ResultadoValidacion,
  UnidadDeTrabajo,
  ValidacionAuditoriaRepositorio,
} from '../domain/puertos';
import { conIdempotencia, type ResultadoIdempotente } from './compartido/idempotencia';

export interface DatosRegistrarValidacion {
  piezaId: string;
  resultado: ResultadoValidacion;
  origen: OrigenValidacion;
  usuario?: string;
  detalles?: Record<string, unknown>;
}

/**
 * Dejar constancia de una comprobacion de marca (manual o de ms-ia via PiezaAnalizada)
 * en el log de auditoria. No cambia el estado de la pieza por si sola — esa decision
 * final queda en manos de AprobarPieza; solo actualiza el resumen
 * pieza.validaciones_marca para que el revisor lo vea.
 */
export class RegistrarValidacion {
  constructor(
    private readonly piezas: PiezaRepositorio,
    private readonly auditoria: ValidacionAuditoriaRepositorio,
    private readonly idempotencia: IdempotenciaRepositorio,
    private readonly unidadDeTrabajo: UnidadDeTrabajo,
  ) {}

  async ejecutar(claveIdempotencia: string, datos: DatosRegistrarValidacion): Promise<ResultadoIdempotente<null>> {
    return conIdempotencia<null>({
      idempotencia: this.idempotencia,
      unidadDeTrabajo: this.unidadDeTrabajo,
      clave: claveIdempotencia,
      datosHuella: datos,
      reconstruirReplay: async () => null,
      ejecutar: async (sesion) => {
        const pieza = await this.piezas.buscarPorId(datos.piezaId);
        if (!pieza) {
          throw new ExcepcionDominio('pieza_no_encontrada', `No existe la pieza ${datos.piezaId}`);
        }

        await this.auditoria.registrar(
          {
            piezaId: datos.piezaId,
            resultado: datos.resultado,
            origen: datos.origen,
            usuario: datos.usuario,
            detalles: datos.detalles,
            creadoEn: new Date(),
          },
          sesion,
        );

        pieza.registrarValidacionMarca({ manualMarcaOk: datos.resultado === 'ok', detalles: datos.detalles });
        await this.piezas.guardar(pieza, sesion);

        return { resultado: null, datosGuardados: {} };
      },
    });
  }
}
