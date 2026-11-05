import type { ClientSession, Collection } from 'mongodb';
import { randomUUID } from 'node:crypto';

import type { EventoSalida, OutboxRepositorio, RegistroOutbox, Sesion } from '../../domain/puertos';
import { obtenerBaseDatos } from './cliente';

/** Documento tal cual vive en Mongo — ver base_de_datos/ms-creatividades.mongo.js (bandeja_salida_eventos). */
interface DocumentoOutbox {
  id: string;
  tipo_agregado: string;
  agregado_id: string;
  tipo_evento: string;
  correlacion_id: string;
  carga: Record<string, unknown>;
  publicado: boolean;
  creado_en: Date;
  publicado_en?: Date;
}

export class OutboxRepositorioMongo implements OutboxRepositorio {
  private async coleccion(): Promise<Collection<DocumentoOutbox>> {
    const db = await obtenerBaseDatos();
    return db.collection<DocumentoOutbox>('bandeja_salida_eventos');
  }

  async encolar(evento: EventoSalida, sesion?: Sesion): Promise<void> {
    const coleccion = await this.coleccion();
    // El sobre completo (version_esquema, ocurrido_en...) se arma en el momento de
    // publicar (ver relevoBandejaSalida.ts); aqui solo se persiste lo minimo para
    // reconstruirlo, igual que el outbox de ms-facturacion.
    await coleccion.insertOne(
      {
        id: evento.id || randomUUID(),
        tipo_agregado: evento.tipoAgregado,
        agregado_id: evento.agregadoId,
        tipo_evento: evento.tipoEvento,
        correlacion_id: evento.correlacionId,
        carga: evento.carga,
        publicado: false,
        creado_en: new Date(),
      },
      { session: sesion as ClientSession | undefined },
    );
  }

  async listarPendientes(limite: number): Promise<RegistroOutbox[]> {
    const coleccion = await this.coleccion();
    const docs = await coleccion.find({ publicado: false }).sort({ creado_en: 1 }).limit(limite).toArray();
    return docs.map((doc) => ({
      id: doc.id,
      tipoAgregado: doc.tipo_agregado,
      agregadoId: doc.agregado_id,
      tipoEvento: doc.tipo_evento,
      correlacionId: doc.correlacion_id,
      carga: doc.carga,
      publicado: doc.publicado,
      creadoEn: doc.creado_en,
      publicadoEn: doc.publicado_en,
    }));
  }

  async marcarPublicado(id: string): Promise<void> {
    const coleccion = await this.coleccion();
    await coleccion.updateOne({ id }, { $set: { publicado: true, publicado_en: new Date() } });
  }
}
