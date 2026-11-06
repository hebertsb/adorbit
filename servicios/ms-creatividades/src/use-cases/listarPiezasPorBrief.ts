import type { Pieza } from '../domain/pieza';
import type { PiezaRepositorio } from '../domain/puertos';

export class ListarPiezasPorBrief {
  constructor(private readonly piezas: PiezaRepositorio) {}

  async ejecutar(briefId: string): Promise<Pieza[]> {
    return this.piezas.listarPorBrief(briefId);
  }
}
