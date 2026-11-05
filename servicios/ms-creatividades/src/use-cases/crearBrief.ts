import { randomUUID } from 'node:crypto';

import { Brief } from '../domain/brief';
import type { BriefRepositorio, IdempotenciaRepositorio, OutboxRepositorio, UnidadDeTrabajo } from '../domain/puertos';
import { conIdempotencia, type ResultadoIdempotente } from './compartido/idempotencia';

export interface DatosCrearBrief {
  campanaId: string;
  clienteId?: string;
  titulo: string;
  descripcion?: string;
}

export class CrearBrief {
  constructor(
    private readonly briefs: BriefRepositorio,
    private readonly outbox: OutboxRepositorio,
    private readonly idempotencia: IdempotenciaRepositorio,
    private readonly unidadDeTrabajo: UnidadDeTrabajo,
  ) {}

  async ejecutar(claveIdempotencia: string, datos: DatosCrearBrief): Promise<ResultadoIdempotente<Brief>> {
    return conIdempotencia<Brief>({
      idempotencia: this.idempotencia,
      unidadDeTrabajo: this.unidadDeTrabajo,
      clave: claveIdempotencia,
      datosHuella: datos,
      reconstruirReplay: async (guardado) => {
        const briefId = guardado.brief_id as string | undefined;
        if (!briefId) return undefined;
        return (await this.briefs.buscarPorId(briefId)) ?? undefined;
      },
      ejecutar: async (sesion) => {
        const brief = Brief.crear({ id: randomUUID(), ...datos });
        await this.briefs.guardar(brief, sesion);

        // Evento "Publica: BriefRecibido" — ver servicios/ms-creatividades/README.md "Eventos".
        await this.outbox.encolar(
          {
            id: randomUUID(),
            tipoAgregado: 'brief',
            agregadoId: brief.id,
            tipoEvento: 'BriefRecibido',
            correlacionId: brief.id,
            carga: { brief_id: brief.id, campana_id: brief.campanaId, titulo: brief.titulo },
          },
          sesion,
        );

        return { resultado: brief, datosGuardados: { brief_id: brief.id } };
      },
    });
  }
}
