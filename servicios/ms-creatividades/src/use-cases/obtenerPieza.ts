import { ExcepcionDominio } from '../domain/errores';
import type { Pieza } from '../domain/pieza';
import type { PiezaRepositorio } from '../domain/puertos';

export class ObtenerPieza {
  constructor(private readonly piezas: PiezaRepositorio) {}

  async ejecutar(id: string): Promise<Pieza> {
    const pieza = await this.piezas.buscarPorId(id);
    if (!pieza) {
      throw new ExcepcionDominio('pieza_no_encontrada', `No existe la pieza ${id}`);
    }
    return pieza;
  }
}
