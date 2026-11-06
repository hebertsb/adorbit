import { ExcepcionDominio } from '../domain/errores';
import type { Brief } from '../domain/brief';
import type { BriefRepositorio } from '../domain/puertos';

export class ObtenerBrief {
  constructor(private readonly briefs: BriefRepositorio) {}

  async ejecutar(id: string): Promise<Brief> {
    const brief = await this.briefs.buscarPorId(id);
    if (!brief) {
      throw new ExcepcionDominio('brief_no_encontrado', `No existe el brief ${id}`);
    }
    return brief;
  }
}
