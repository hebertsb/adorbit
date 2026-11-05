import { randomUUID } from 'node:crypto';

import { extensionPara, validarArchivo } from '../domain/archivoPermitido';
import { ExcepcionDominio } from '../domain/errores';
import type {
  AlmacenamientoPuerto,
  IdempotenciaRepositorio,
  OutboxRepositorio,
  PiezaRepositorio,
  UnidadDeTrabajo,
} from '../domain/puertos';
import { conIdempotencia, type ResultadoIdempotente } from './compartido/idempotencia';

export interface DatosSolicitarSubidaPieza {
  piezaId: string;
  mime: string;
  tamano: number;
  /** Hash calculado por quien sube el archivo (el servicio nunca ve los bytes — van directo a Storage). */
  huellaImagen?: string;
}

export interface ResultadoSolicitarSubidaPieza {
  ruta: string;
  urlSubida: string;
  token?: string;
}

/**
 * Genera una URL firmada de subida (Supabase Storage) y deja la pieza apuntando a esa
 * ruta — el archivo en si nunca pasa por este servicio, solo la ruta (ver CLAUDE.md
 * "Validacion de entrada": whitelist de mime types, tamano maximo, nombre de archivo
 * regenerado como UUID).
 */
export class SolicitarSubidaPieza {
  constructor(
    private readonly piezas: PiezaRepositorio,
    private readonly almacenamiento: AlmacenamientoPuerto,
    private readonly outbox: OutboxRepositorio,
    private readonly idempotencia: IdempotenciaRepositorio,
    private readonly unidadDeTrabajo: UnidadDeTrabajo,
  ) {}

  async ejecutar(
    claveIdempotencia: string,
    datos: DatosSolicitarSubidaPieza,
  ): Promise<ResultadoIdempotente<ResultadoSolicitarSubidaPieza>> {
    validarArchivo(datos.mime, datos.tamano);

    return conIdempotencia<ResultadoSolicitarSubidaPieza>({
      idempotencia: this.idempotencia,
      unidadDeTrabajo: this.unidadDeTrabajo,
      clave: claveIdempotencia,
      datosHuella: datos,
      reconstruirReplay: async (guardado) => guardado as unknown as ResultadoSolicitarSubidaPieza,
      ejecutar: async (sesion) => {
        const pieza = await this.piezas.buscarPorId(datos.piezaId);
        if (!pieza) {
          throw new ExcepcionDominio('pieza_no_encontrada', `No existe la pieza ${datos.piezaId}`);
        }

        const ruta = `piezas/${pieza.briefId}/${datos.piezaId}-${randomUUID()}.${extensionPara(datos.mime)}`;
        const solicitud = await this.almacenamiento.crearUrlSubida(ruta);

        pieza.adjuntarArchivo({ ruta: solicitud.ruta, mime: datos.mime, tamano: datos.tamano });
        await this.piezas.guardar(pieza, sesion);

        // "Publica: PiezaSubida" — ver servicios/ms-creatividades/README.md "Eventos".
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
              'archivo.ruta': solicitud.ruta,
              huella_imagen: datos.huellaImagen ?? null,
            },
          },
          sesion,
        );

        const resultado: ResultadoSolicitarSubidaPieza = {
          ruta: solicitud.ruta,
          urlSubida: solicitud.urlSubida,
          token: solicitud.token,
        };
        return { resultado, datosGuardados: { ...resultado } };
      },
    });
  }
}
