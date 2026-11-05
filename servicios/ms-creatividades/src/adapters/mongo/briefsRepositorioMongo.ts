import type { ClientSession, Collection } from 'mongodb';

import { Brief, type EstadoBrief } from '../../domain/brief';
import type { BriefRepositorio, ResultadoPagina, Sesion } from '../../domain/puertos';
import { obtenerBaseDatos } from './cliente';

/** Documento tal cual vive en Mongo — ver base_de_datos/ms-creatividades.mongo.js. */
interface DocumentoBrief {
  id: string;
  campana_id: string;
  cliente_id?: string;
  titulo: string;
  descripcion?: string;
  estado: EstadoBrief;
  version: number;
  creado_en: Date;
  actualizado_en: Date;
}

function aDocumento(brief: Brief): DocumentoBrief {
  const p = brief.aPropiedades();
  return {
    id: p.id,
    campana_id: p.campanaId,
    cliente_id: p.clienteId,
    titulo: p.titulo,
    descripcion: p.descripcion,
    estado: p.estado,
    version: p.version,
    creado_en: p.creadoEn,
    actualizado_en: p.actualizadoEn,
  };
}

function aEntidad(doc: DocumentoBrief): Brief {
  return Brief.reconstituir({
    id: doc.id,
    campanaId: doc.campana_id,
    clienteId: doc.cliente_id,
    titulo: doc.titulo,
    descripcion: doc.descripcion,
    estado: doc.estado,
    version: doc.version,
    creadoEn: doc.creado_en,
    actualizadoEn: doc.actualizado_en,
  });
}

export class BriefRepositorioMongo implements BriefRepositorio {
  private async coleccion(): Promise<Collection<DocumentoBrief>> {
    const db = await obtenerBaseDatos();
    return db.collection<DocumentoBrief>('briefs');
  }

  async guardar(brief: Brief, sesion?: Sesion): Promise<void> {
    const coleccion = await this.coleccion();
    const doc = aDocumento(brief);
    await coleccion.updateOne(
      { id: doc.id },
      { $set: doc },
      { upsert: true, session: sesion as ClientSession | undefined },
    );
  }

  async buscarPorId(id: string): Promise<Brief | null> {
    const coleccion = await this.coleccion();
    const doc = await coleccion.findOne({ id });
    return doc ? aEntidad(doc) : null;
  }

  async listar(
    filtro: { campanaId?: string; clienteId?: string },
    pagina: number,
    tamano: number,
  ): Promise<ResultadoPagina<Brief>> {
    const coleccion = await this.coleccion();
    const consulta: Record<string, unknown> = {};
    if (filtro.campanaId) consulta.campana_id = filtro.campanaId;
    if (filtro.clienteId) consulta.cliente_id = filtro.clienteId;

    const salto = (pagina - 1) * tamano;
    const [docs, total] = await Promise.all([
      coleccion.find(consulta).sort({ creado_en: -1 }).skip(salto).limit(tamano).toArray(),
      coleccion.countDocuments(consulta),
    ]);

    return { items: docs.map(aEntidad), total, pagina, tamano };
  }
}
