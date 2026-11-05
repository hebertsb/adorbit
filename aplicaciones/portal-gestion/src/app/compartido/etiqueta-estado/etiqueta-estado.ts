import { Component, input } from '@angular/core';

export type TonoEtiqueta = 'ok' | 'aviso' | 'peligro' | 'info' | 'neutro';

@Component({
  selector: 'ao-etiqueta-estado',
  templateUrl: './etiqueta-estado.html',
  styleUrl: './etiqueta-estado.css',
})
export class EtiquetaEstado {
  readonly texto = input.required<string>();
  readonly tono = input<TonoEtiqueta>('neutro');
}
