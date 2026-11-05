import type { ClientSession, Collection } from 'mongodb';

import type {
  OrigenValidacion,
  RegistroValidacionAuditoria,
  ResultadoValidacion,
  Sesion,
  ValidacionAuditoriaRepositorio,
} from '../../domain/puertos';
import { obtenerBaseDatos } from './cliente';

interface DocumentoValidacionAuditoria {
  pieza_id: string;
  resultado: ResultadoValidacion;
  origen: OrigenValidacion;
  usuario?: string;
  detalles?: Record<string, unknown>;
  creado_en: Date;
}

export class ValidacionAuditoriaRepositorioMongo implements ValidacionAuditoriaRepositorio {
  private async coleccion(): Promise<Collection<DocumentoValidacionAuditoria>> {
    const db = await obtenerBaseDatos();
    return db.collection<DocumentoValidacionAuditoria>('validaciones_auditoria');
  }

  async registrar(registro: RegistroValidacionAuditoria, sesion?: Sesion): Promise<void> {
    const coleccion = await this.coleccion();
    await coleccion.insertOne(
      {
        pieza_id: registro.piezaId,
        resultado: registro.resultado,
        origen: registro.origen,
        usuario: registro.usuario,
        detalles: registro.detalles,
        creado_en: registro.creadoEn,
      },
      { session: sesion as ClientSession | undefined },
    );
  }

  async listarPorPieza(piezaId: string): Promise<RegistroValidacionAuditoria[]> {
    const coleccion = await this.coleccion();
    const docs = await coleccion.find({ pieza_id: piezaId }).sort({ creado_en: -1 }).toArray();
    return docs.map((doc) => ({
      piezaId: doc.pieza_id,
      resultado: doc.resultado,
      origen: doc.origen,
      usuario: doc.usuario,
      detalles: doc.detalles,
      creadoEn: doc.creado_en,
    }));
  }
}
