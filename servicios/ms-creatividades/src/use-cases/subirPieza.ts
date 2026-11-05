import { randomUUID } from 'node:crypto';

import { ExcepcionDominio } from '../domain/errores';
import { Pieza, type ArchivoPieza, type TipoPieza } from '../domain/pieza';
import type {
  BriefRepositorio,
  IdempotenciaRepositorio,
  OutboxRepositorio,
  PiezaRepositorio,
  UnidadDeTrabajo,
} from '../domain/puertos';
import { conIdempotencia, type ResultadoIdempotente } from './compartido/idempotencia';

export interface DatosSubirPieza {
  briefId: string;
  nombre: string;
  tipo: TipoPieza;
  archivo?: ArchivoPieza;
  /** Hash calculado por quien sube el archivo (el servicio nunca ve los bytes — van directo a Storage). */
  huellaImagen?: string;
}

/** (brief_id, version_numero) es unico — ver CLAUDE.md "Reglas de negocio". El indice
 * unico en Mongo es la garantia real ante condiciones de carrera; aqui se calcula el
 * numero esperado a partir del conteo de versiones existentes. */
export class SubirPieza {
  constructor(
    private readonly briefs: BriefRepositorio,
    private readonly piezas: PiezaRepositorio,
    private readonly outbox: OutboxRepositorio,
    private readonly idempotencia: IdempotenciaRepositorio,
    private readonly unidadDeTrabajo: UnidadDeTrabajo,
  ) {}

  async ejecutar(claveIdempotencia: string, datos: DatosSubirPieza): Promise<ResultadoIdempotente<Pieza>> {
    return conIdempotencia<Pieza>({
      idempotencia: this.idempotencia,
      unidadDeTrabajo: this.unidadDeTrabajo,
      clave: claveIdempotencia,
      datosHuella: datos,
      reconstruirReplay: async (guardado) => {
        const piezaId = guardado.pieza_id as string | undefined;
        if (!piezaId) return undefined;
        return (await this.piezas.buscarPorId(piezaId)) ?? undefined;
      },
      ejecutar: async (sesion) => {
        const brief = await this.briefs.buscarPorId(datos.briefId);
        if (!brief) {
          throw new ExcepcionDominio('brief_no_encontrado', `No existe el brief ${datos.briefId}`);
        }

        const versionesExistentes = await this.piezas.contarVersiones(datos.briefId);
        const pieza = Pieza.crear({
          id: randomUUID(),
          briefId: datos.briefId,
          campanaId: brief.campanaId,
          nombre: datos.nombre,
          tipo: datos.tipo,
          versionNumero: versionesExistentes + 1,
          archivo: datos.archivo,
        });

        await this.piezas.guardar(pieza, sesion);

        // Solo hay "subida" de verdad si vino un archivo inline — ver
        // servicios/ms-creatividades/README.md "Eventos" (PiezaSubida). El otro camino
        // posible es adjuntar el archivo despues via SolicitarSubidaPieza (tarea 6), que
        // publica el mismo evento en ese momento.
        if (datos.archivo) {
          await this.outbox.encolar(
            {
              id: randomUUID(),
              tipoAgregado: 'pieza',
              agregadoId: pieza.id,
              tipoEvento: 'PiezaSubida',
              correlacionId: pieza.id,
              carga: {
                pieza_id: pieza.id,
                campana_id: pieza.campanaId,
                'archivo.ruta': datos.archivo.ruta,
                huella_imagen: datos.huellaImagen ?? null,
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
