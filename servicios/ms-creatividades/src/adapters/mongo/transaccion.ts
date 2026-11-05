import type { ClientSession } from 'mongodb';

import { obtenerClienteMongo } from './cliente';

/**
 * Sesion de Mongo con transaccion ACID multi-documento — equivalente de Mongo al
 * TransactWriteItems de DynamoDB que usa ms-facturacion. Todo lo que escriba el
 * callback (idempotencia + documento de negocio + outbox) se confirma o se revierte
 * junto.
 */
export async function enTransaccion<T>(trabajo: (sesion: ClientSession) => Promise<T>): Promise<T> {
  const cliente = await obtenerClienteMongo();
  const sesion = cliente.startSession();
  try {
    let resultado!: T;
    await sesion.withTransaction(async () => {
      resultado = await trabajo(sesion);
    });
    return resultado;
  } finally {
    await sesion.endSession();
  }
}
