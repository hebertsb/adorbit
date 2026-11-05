import { createServer } from 'node:http';

import next from 'next';

import { IdempotenciaRepositorioMongo } from './adapters/mongo/idempotenciaRepositorioMongo';
import { OutboxRepositorioMongo } from './adapters/mongo/outboxRepositorioMongo';
import { PiezaRepositorioMongo } from './adapters/mongo/piezasRepositorioMongo';
import { UnidadDeTrabajoMongo } from './adapters/mongo/unidadDeTrabajoMongo';
import { ConsumidorComandosSaga } from './adapters/rabbitmq/consumidorComandosSaga';
import { RelevoBandejaSalida } from './adapters/rabbitmq/relevoBandejaSalida';
import { TrabajoLiberarBloqueosVencidos } from './adapters/trabajos/liberarBloqueosVencidos';
import { BloquearPiezas } from './use-cases/bloquearPiezas';
import { DesbloquearPiezas } from './use-cases/desbloquearPiezas';

/**
 * Entrypoint propio (no "next start" puro): levanta el servidor HTTP de Next.js Y el
 * consumidor SAGA + el relevo del outbox + el job de expiracion en el mismo proceso —
 * "un contenedor por servicio" (CLAUDE.md), mismo patron que el SmartLifecycle de
 * ms-facturacion. Si RabbitMQ no esta disponible (ej. dev local sin Docker), el HTTP
 * sigue funcionando igual; solo se pierde el consumo/publicacion de eventos.
 */
const dev = process.env.NODE_ENV !== 'production';
const puerto = Number(process.env.PORT ?? 8083);

async function iniciarProcesosDeFondo(): Promise<void> {
  const piezas = new PiezaRepositorioMongo();
  const outbox = new OutboxRepositorioMongo();
  const idempotencia = new IdempotenciaRepositorioMongo();
  const unidadDeTrabajo = new UnidadDeTrabajoMongo();

  const bloquearPiezas = new BloquearPiezas(piezas, idempotencia, outbox, unidadDeTrabajo);
  const desbloquearPiezas = new DesbloquearPiezas(piezas, idempotencia, outbox, unidadDeTrabajo);

  await new ConsumidorComandosSaga(bloquearPiezas, desbloquearPiezas).iniciar();
  await new RelevoBandejaSalida(outbox).iniciar();
  new TrabajoLiberarBloqueosVencidos(piezas).iniciar();

   
  console.log('[server] consumidor SAGA, relevo de outbox y job de expiracion arrancados');
}

async function main(): Promise<void> {
  const app = next({ dev });
  const manejador = app.getRequestHandler();
  await app.prepare();

  createServer((req, res) => {
    void manejador(req, res);
  }).listen(puerto, () => {
     
    console.log(`[server] ms-creatividades escuchando en :${puerto}`);
  });

  try {
    await iniciarProcesosDeFondo();
  } catch (error) {
     
    console.error(
      '[server] no se pudieron iniciar los procesos de fondo (¿RabbitMQ/Mongo no disponibles?)',
      error,
    );
  }
}

void main();
