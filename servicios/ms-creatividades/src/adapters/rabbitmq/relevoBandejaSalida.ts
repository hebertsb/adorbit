import type { ConfirmChannel } from 'amqplib';

import type { OutboxRepositorio } from '../../domain/puertos';
import { claveEnrutamiento } from './claveEnrutamiento';
import { obtenerConexionRabbit } from './conexion';

const EXCHANGE_EVENTOS = 'adorbit.eventos';
const INTERVALO_MS = 2000;
const TAMANO_LOTE = 20;

/**
 * Relevo del outbox: lee bandeja_salida_eventos (publicado:false), publica con
 * publisher confirms en adorbit.eventos, y solo marca publicado:true tras la
 * confirmacion — si el broker cae a mitad de camino, la fila sigue pendiente y se
 * reintenta en la proxima vuelta (entrega al menos una vez; los consumidores dedupen
 * por id_evento, regla del proyecto). Mismo patron que RelevoBandejaSalida de
 * ms-facturacion, sin la parte especifica de DynamoDB Streams (Mongo no la necesita:
 * se lee la coleccion directo).
 */
export class RelevoBandejaSalida {
  private temporizador?: NodeJS.Timeout;
  private canal?: ConfirmChannel;

  constructor(private readonly outbox: OutboxRepositorio) {}

  async iniciar(): Promise<void> {
    const conexion = await obtenerConexionRabbit();
    this.canal = await conexion.createConfirmChannel();
    await this.canal.assertExchange(EXCHANGE_EVENTOS, 'topic', { durable: true });

    this.temporizador = setInterval(() => {
      this.procesarUnaVuelta().catch((error: unknown) => {
         
        console.error('[relevo.bandeja-salida] fallo', error);
      });
    }, INTERVALO_MS);
    this.temporizador.unref();
  }

  async procesarUnaVuelta(): Promise<number> {
    const canal = this.canal;
    if (!canal) return 0;

    const pendientes = await this.outbox.listarPendientes(TAMANO_LOTE);
    let publicados = 0;

    for (const evento of pendientes) {
      const sobre = {
        id_evento: evento.id,
        tipo_evento: evento.tipoEvento,
        version_esquema: 1,
        ocurrido_en: evento.creadoEn.toISOString(),
        agregado_id: evento.agregadoId,
        correlacion_id: evento.correlacionId,
        carga: evento.carga,
      };

      await this.publicarConConfirmacion(canal, claveEnrutamiento(evento.tipoEvento), sobre);
      await this.outbox.marcarPublicado(evento.id);
      publicados++;
    }

    return publicados;
  }

  private publicarConConfirmacion(
    canal: ConfirmChannel,
    claveRuta: string,
    sobre: Record<string, unknown>,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      canal.publish(
        EXCHANGE_EVENTOS,
        claveRuta,
        Buffer.from(JSON.stringify(sobre)),
        {
          contentType: 'application/json',
          messageId: sobre.id_evento as string,
          type: sobre.tipo_evento as string,
          persistent: true,
        },
        (error) => (error ? reject(error) : resolve()),
      );
    });
  }

  detener(): void {
    if (this.temporizador) clearInterval(this.temporizador);
  }
}
