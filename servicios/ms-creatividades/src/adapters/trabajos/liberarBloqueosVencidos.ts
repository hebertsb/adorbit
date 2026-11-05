import type { PiezaRepositorio } from '../../domain/puertos';

const INTERVALO_MS = 60_000; // 1 minuto

/**
 * Libera piezas "bloqueada_saga" cuyo bloqueo_saga.expira_at ya paso — ver el
 * comentario de base_de_datos/ms-creatividades.mongo.js ("Un job (n8n o cron) libera
 * los bloqueos con expira_at vencido"). Implementado como loop en el mismo proceso por
 * simplicidad; reemplazable por un job de n8n mas adelante sin cambiar el metodo del
 * repositorio que ya hace el trabajo real (liberarBloqueosVencidos).
 */
export class TrabajoLiberarBloqueosVencidos {
  private temporizador?: NodeJS.Timeout;

  constructor(private readonly piezas: PiezaRepositorio) {}

  iniciar(): void {
    this.temporizador = setInterval(() => {
      this.ejecutarUnaVez().catch((error: unknown) => {
         
        console.error('[trabajo.liberar-bloqueos-vencidos] fallo', error);
      });
    }, INTERVALO_MS);
    this.temporizador.unref();
  }

  async ejecutarUnaVez(): Promise<string[]> {
    return this.piezas.liberarBloqueosVencidos(new Date());
  }

  detener(): void {
    if (this.temporizador) clearInterval(this.temporizador);
  }
}
