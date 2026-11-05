import type { Brief } from '../domain/brief';
import type { BriefRepositorio, ResultadoPagina } from '../domain/puertos';

export interface FiltroListarBriefs {
  campanaId?: string;
  /** Acota por cliente — el handler lo completa con el cliente_id del token, nunca con un parametro de la URL. */
  clienteId?: string;
  pagina: number;
  tamano: number;
}

export class ListarBriefs {
  constructor(private readonly briefs: BriefRepositorio) {}

  async ejecutar(filtro: FiltroListarBriefs): Promise<ResultadoPagina<Brief>> {
    return this.briefs.listar({ campanaId: filtro.campanaId, clienteId: filtro.clienteId }, filtro.pagina, filtro.tamano);
  }
}
