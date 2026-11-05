import type { ClientSession, Collection } from 'mongodb';

import type { EstadoIdempotencia, IdempotenciaRepositorio, RegistroIdempotencia, Sesion } from '../../domain/puertos';
import { obtenerBaseDatos } from './cliente';

/** Documento tal cual vive en Mongo — ver base_de_datos/ms-creatividades.mongo.js (claves_idempotencia). */
interface DocumentoIdempotencia {
  clave: string;
  huella_solicitud: string;
  estado: EstadoIdempotencia;
  respuesta?: string;
  creado_en: Date;
  vence_en: Date;
}

export class IdempotenciaRepositorioMongo implements IdempotenciaRepositorio {
  private async coleccion(): Promise<Collection<DocumentoIdempotencia>> {
    const db = await obtenerBaseDatos();
    return db.collection<DocumentoIdempotencia>('claves_idempotencia');
  }

  async buscarPorClave(clave: string): Promise<RegistroIdempotencia | null> {
    const coleccion = await this.coleccion();
    const doc = await coleccion.findOne({ clave });
    if (!doc) return null;
    return {
      clave: doc.clave,
      huellaSolicitud: doc.huella_solicitud,
      estado: doc.estado,
      respuesta: doc.respuesta,
      creadoEn: doc.creado_en,
      venceEn: doc.vence_en,
    };
  }

  async crear(registro: RegistroIdempotencia, sesion?: Sesion): Promise<void> {
    const coleccion = await this.coleccion();
    await coleccion.insertOne(
      {
        clave: registro.clave,
        huella_solicitud: registro.huellaSolicitud,
        estado: registro.estado,
        respuesta: registro.respuesta,
        creado_en: registro.creadoEn,
        vence_en: registro.venceEn,
      },
      { session: sesion as ClientSession | undefined },
    );
  }
}
