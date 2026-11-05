import { MongoClient, type Db } from 'mongodb';

/**
 * Cliente Mongo singleton. En dev, Next.js recarga modulos en caliente; se cachea la
 * promesa de conexion en globalThis para no abrir una conexion nueva por cada recarga
 * (patron recomendado por MongoDB para Next.js).
 */
declare global {
   
  var _clienteMongoPromesa: Promise<MongoClient> | undefined;
}

function crearClientePromesa(): Promise<MongoClient> {
  const url = process.env.ADORBIT_CREATIVIDADES_URL_BD;
  if (!url) {
    throw new Error('Falta la variable de entorno ADORBIT_CREATIVIDADES_URL_BD');
  }
  return new MongoClient(url).connect();
}

// Modulo cargado una sola vez en produccion (sin HMR); en dev se cachea en globalThis
// para sobrevivir recargas en caliente sin abrir una conexion nueva cada vez.
let clientePromesaProduccion: Promise<MongoClient> | undefined;

export function obtenerClienteMongo(): Promise<MongoClient> {
  if (process.env.NODE_ENV === 'production') {
    if (!clientePromesaProduccion) {
      clientePromesaProduccion = crearClientePromesa();
    }
    return clientePromesaProduccion;
  }
  if (!global._clienteMongoPromesa) {
    global._clienteMongoPromesa = crearClientePromesa();
  }
  return global._clienteMongoPromesa;
}

export async function obtenerBaseDatos(): Promise<Db> {
  const cliente = await obtenerClienteMongo();
  return cliente.db();
}
