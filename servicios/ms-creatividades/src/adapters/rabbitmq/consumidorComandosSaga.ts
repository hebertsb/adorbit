import type { Channel, ConsumeMessage } from 'amqplib';

import { ExcepcionDominio } from '../../domain/errores';
import type { BloquearPiezas } from '../../use-cases/bloquearPiezas';
import type { DesbloquearPiezas } from '../../use-cases/desbloquearPiezas';
import { obtenerConexionRabbit } from './conexion';

const EXCHANGE_SAGA = 'adorbit.saga';
// Topologia real declarada por Roly en plataforma/rabbitmq/definiciones.json: UNA
// cola por servicio destino (no una por tipo de comando), enlazada con la clave de
// enrutamiento = nombre del servicio ("saga.creatividades"); ms-creatividades despacha
// internamente segun tipo_evento (ver despachar()). El dead-letter exchange es el
// COMPARTIDO adorbit.dlx (fanout) -> cola.muerta, no una DLQ propia por servicio —
// asertarlo aqui con los MISMOS argumentos que definiciones.json es idempotente
// (no choca) incluso si el broker ya los tiene declarados.
const EXCHANGE_DLX = 'adorbit.dlx';
const COLA = 'saga.creatividades';
const CLAVE_ENRUTAMIENTO = 'saga.creatividades';
const PASO_SAGA = 3;
/** Igual tope que ms-facturacion ("reintentos exponenciales, max. 5"). */
const MAX_INTENTOS = 5;

interface SobreComando {
  tipo_evento: string;
  correlacion_id: string;
  carga: Record<string, unknown>;
}

/**
 * Consumidor del paso 3 del SAGA (BloquearPiezas/DesbloquearPiezas) — misma estructura
 * de 2 niveles que ConsumidorComandosSaga de ms-facturacion: forma/datos invalidos van
 * directo a la DLQ (no tiene sentido reintentarlos); errores transitorios (ej. Mongo
 * caido) se reintentan hasta MAX_INTENTOS usando el header x-death que RabbitMQ agrega
 * en cada paso por la dead-letter-exchange.
 */
export class ConsumidorComandosSaga {
  constructor(
    private readonly bloquearPiezas: BloquearPiezas,
    private readonly desbloquearPiezas: DesbloquearPiezas,
  ) {}

  async iniciar(): Promise<void> {
    const conexion = await obtenerConexionRabbit();
    const canal = await conexion.createChannel();

    await canal.assertExchange(EXCHANGE_SAGA, 'direct', { durable: true });
    await canal.assertExchange(EXCHANGE_DLX, 'fanout', { durable: true });
    await canal.assertQueue(COLA, {
      durable: true,
      arguments: {
        'x-dead-letter-exchange': EXCHANGE_DLX,
        'x-dead-letter-routing-key': `${COLA}.dlq`,
      },
    });
    await canal.bindQueue(COLA, EXCHANGE_SAGA, CLAVE_ENRUTAMIENTO);

    await canal.prefetch(5);
    await canal.consume(COLA, (msg) => {
      if (msg) void this.procesar(canal, msg);
    });
  }

  private async procesar(canal: Channel, msg: ConsumeMessage): Promise<void> {
    let sobre: SobreComando;
    try {
      sobre = JSON.parse(msg.content.toString('utf8')) as SobreComando;
    } catch {
      canal.nack(msg, false, false); // JSON ilegible -> DLQ, sin reintento
      return;
    }

    try {
      await this.despachar(sobre);
      canal.ack(msg);
    } catch (error) {
      if (error instanceof ExcepcionDominio) {
        // Forma o datos invalidos del comando: reintentar no lo arregla.
         
        console.error('[saga.creatividades] comando invalido, va a la DLQ', error);
        canal.nack(msg, false, false);
        return;
      }
      const intentos = contarIntentosPrevios(msg);
       
      console.error(`[saga.creatividades] error transitorio (intento ${intentos + 1})`, error);
      canal.nack(msg, false, intentos < MAX_INTENTOS);
    }
  }

  private async despachar(sobre: SobreComando): Promise<void> {
    const sagaId = sobre.correlacion_id;
    if (!sagaId) {
      throw new ExcepcionDominio('comando_invalido', 'Falta correlacion_id (saga_id) en el comando');
    }
    const campanaId = exigirString(sobre.carga, 'campana_id');

    switch (sobre.tipo_evento) {
      case 'BloquearPiezas': {
        const expiraAt = new Date(exigirString(sobre.carga, 'expira_at'));
        if (Number.isNaN(expiraAt.getTime())) {
          throw new ExcepcionDominio('comando_invalido', 'expira_at no es una fecha valida');
        }
        await this.bloquearPiezas.ejecutar(`${sagaId}:${PASO_SAGA}:accion`, { sagaId, campanaId, expiraAt });
        return;
      }
      case 'DesbloquearPiezas': {
        await this.desbloquearPiezas.ejecutar(`${sagaId}:${PASO_SAGA}:compensacion`, { sagaId, campanaId });
        return;
      }
      default:
        throw new ExcepcionDominio('comando_desconocido', `Comando SAGA desconocido: ${sobre.tipo_evento}`);
    }
  }
}

function exigirString(carga: Record<string, unknown>, campo: string): string {
  const valor = carga[campo];
  if (typeof valor !== 'string' || !valor) {
    throw new ExcepcionDominio('comando_invalido', `Falta el campo "${campo}" en el comando`);
  }
  return valor;
}

function contarIntentosPrevios(msg: ConsumeMessage): number {
  const cabeceras = msg.properties.headers as Record<string, unknown> | undefined;
  const muertes = cabeceras?.['x-death'] as Array<{ count?: number }> | undefined;
  if (!muertes || muertes.length === 0) return 0;
  return muertes.reduce((acumulado, muerte) => acumulado + (muerte.count ?? 0), 0);
}
