import amqp, { type RecoveringChannelModel } from 'amqplib';

/**
 * Conexion unica del proceso con reconexion automatica (backoff + jitter incluidos en
 * amqplib) — el relevo del outbox y el consumidor SAGA comparten la misma conexion.
 */
let conexionPromesa: Promise<RecoveringChannelModel> | undefined;

export function obtenerConexionRabbit(): Promise<RecoveringChannelModel> {
  if (!conexionPromesa) {
    const url = process.env.ADORBIT_CREATIVIDADES_RABBITMQ_URL;
    if (!url) {
      throw new Error('Falta la variable de entorno ADORBIT_CREATIVIDADES_RABBITMQ_URL');
    }
    conexionPromesa = amqp.connect(url, { recovery: true });
  }
  return conexionPromesa;
}
