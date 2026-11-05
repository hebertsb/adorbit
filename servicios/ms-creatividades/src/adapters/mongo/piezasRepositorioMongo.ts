import type { ClientSession, Collection } from 'mongodb';

import {
  Pieza,
  type ArchivoPieza,
  type BloqueoSaga,
  type EstadoPieza,
  type TipoPieza,
  type ValidacionMarca,
} from '../../domain/pieza';
import type { PiezaRepositorio, Sesion } from '../../domain/puertos';
import { obtenerBaseDatos } from './cliente';

/** Documento tal cual vive en Mongo — ver base_de_datos/ms-creatividades.mongo.js. */
interface DocumentoPieza {
  id: string;
  brief_id: string;
  campana_id: string;
  nombre: string;
  tipo: TipoPieza;
  version_numero: number;
  archivo?: ArchivoPieza;
  estado: EstadoPieza;
  estado_previo?: EstadoPieza;
  bloqueo_saga?: {
    saga_id: string;
    campana_id: string;
    bloqueado_at: Date;
    expira_at: Date;
  } | null;
  validaciones_marca?: {
    manual_marca_ok: boolean;
    detalles?: Record<string, unknown>;
    validado_at: Date;
  };
  version: number;
  creado_en: Date;
  actualizado_en: Date;
}

function aDocumento(pieza: Pieza): DocumentoPieza {
  const p = pieza.aPropiedades();
  const bloqueo = p.bloqueoSaga;
  const validacion = p.validacionesMarca;
  return {
    id: p.id,
    brief_id: p.briefId,
    campana_id: p.campanaId,
    nombre: p.nombre,
    tipo: p.tipo,
    version_numero: p.versionNumero,
    archivo: p.archivo,
    estado: p.estado,
    estado_previo: p.estadoPrevio,
    bloqueo_saga: bloqueo
      ? { saga_id: bloqueo.sagaId, campana_id: bloqueo.campanaId, bloqueado_at: bloqueo.bloqueadoAt, expira_at: bloqueo.expiraAt }
      : null,
    validaciones_marca: validacion
      ? { manual_marca_ok: validacion.manualMarcaOk, detalles: validacion.detalles, validado_at: validacion.validadoAt }
      : undefined,
    version: p.version,
    creado_en: p.creadoEn,
    actualizado_en: p.actualizadoEn,
  };
}

function aEntidad(doc: DocumentoPieza): Pieza {
  const bloqueoSaga: BloqueoSaga | undefined = doc.bloqueo_saga
    ? {
        sagaId: doc.bloqueo_saga.saga_id,
        campanaId: doc.bloqueo_saga.campana_id,
        bloqueadoAt: doc.bloqueo_saga.bloqueado_at,
        expiraAt: doc.bloqueo_saga.expira_at,
      }
    : undefined;
  const validacionesMarca: ValidacionMarca | undefined = doc.validaciones_marca
    ? {
        manualMarcaOk: doc.validaciones_marca.manual_marca_ok,
        detalles: doc.validaciones_marca.detalles,
        validadoAt: doc.validaciones_marca.validado_at,
      }
    : undefined;

  return Pieza.reconstituir({
    id: doc.id,
    briefId: doc.brief_id,
    campanaId: doc.campana_id,
    nombre: doc.nombre,
    tipo: doc.tipo,
    versionNumero: doc.version_numero,
    archivo: doc.archivo,
    estado: doc.estado,
    estadoPrevio: doc.estado_previo,
    bloqueoSaga,
    validacionesMarca,
    version: doc.version,
    creadoEn: doc.creado_en,
    actualizadoEn: doc.actualizado_en,
  });
}

export class PiezaRepositorioMongo implements PiezaRepositorio {
  private async coleccion(): Promise<Collection<DocumentoPieza>> {
    const db = await obtenerBaseDatos();
    return db.collection<DocumentoPieza>('piezas');
  }

  async guardar(pieza: Pieza, sesion?: Sesion): Promise<void> {
    const coleccion = await this.coleccion();
    const doc = aDocumento(pieza);
    await coleccion.updateOne(
      { id: doc.id },
      { $set: doc },
      { upsert: true, session: sesion as ClientSession | undefined },
    );
  }

  async buscarPorId(id: string): Promise<Pieza | null> {
    const coleccion = await this.coleccion();
    const doc = await coleccion.findOne({ id });
    return doc ? aEntidad(doc) : null;
  }

  async listarPorBrief(briefId: string): Promise<Pieza[]> {
    const coleccion = await this.coleccion();
    const docs = await coleccion.find({ brief_id: briefId }).sort({ version_numero: -1 }).toArray();
    return docs.map(aEntidad);
  }

  async contarVersiones(briefId: string): Promise<number> {
    const coleccion = await this.coleccion();
    return coleccion.countDocuments({ brief_id: briefId });
  }

  async bloquearAprobadasDeCampana(
    campanaId: string,
    bloqueo: BloqueoSaga,
    sesion?: Sesion,
  ): Promise<string[]> {
    const coleccion = await this.coleccion();
    const session = sesion as ClientSession | undefined;

    const resultado = await coleccion.updateMany(
      { campana_id: campanaId, estado: 'aprobada' },
      {
        $set: {
          estado: 'bloqueada_saga',
          estado_previo: 'aprobada',
          bloqueo_saga: {
            saga_id: bloqueo.sagaId,
            campana_id: bloqueo.campanaId,
            bloqueado_at: bloqueo.bloqueadoAt,
            expira_at: bloqueo.expiraAt,
          },
          actualizado_en: new Date(),
        },
        $inc: { version: 1 },
      },
      { session },
    );

    if (resultado.modifiedCount === 0) return [];

    const docs = await coleccion
      .find({ campana_id: campanaId, 'bloqueo_saga.saga_id': bloqueo.sagaId }, { session })
      .project<{ id: string }>({ id: 1 })
      .toArray();
    return docs.map((d) => d.id);
  }

  async desbloquearDeCampana(campanaId: string, sagaId: string, sesion?: Sesion): Promise<string[]> {
    const coleccion = await this.coleccion();
    const session = sesion as ClientSession | undefined;

    const docsAntes = await coleccion
      .find({ campana_id: campanaId, estado: 'bloqueada_saga', 'bloqueo_saga.saga_id': sagaId }, { session })
      .project<{ id: string }>({ id: 1 })
      .toArray();
    const ids = docsAntes.map((d) => d.id);
    if (ids.length === 0) return [];

    await coleccion.updateMany(
      { campana_id: campanaId, estado: 'bloqueada_saga', 'bloqueo_saga.saga_id': sagaId },
      {
        $set: { estado: 'aprobada', actualizado_en: new Date() },
        $unset: { bloqueo_saga: '' },
        $inc: { version: 1 },
      },
      { session },
    );
    return ids;
  }

  async liberarBloqueosVencidos(ahora: Date): Promise<string[]> {
    const coleccion = await this.coleccion();
    const docs = await coleccion
      .find({ estado: 'bloqueada_saga', 'bloqueo_saga.expira_at': { $lt: ahora } })
      .project<{ id: string }>({ id: 1 })
      .toArray();
    const ids = docs.map((d) => d.id);
    if (ids.length === 0) return [];

    await coleccion.updateMany(
      { id: { $in: ids } },
      {
        $set: { estado: 'aprobada', actualizado_en: new Date() },
        $unset: { bloqueo_saga: '' },
        $inc: { version: 1 },
      },
    );
    return ids;
  }
}
