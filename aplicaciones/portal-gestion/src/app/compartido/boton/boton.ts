import { Component, input } from '@angular/core';

export type VarianteBoton = 'primario' | 'secundario' | 'fantasma' | 'peligro';

@Component({
  selector: 'ao-boton',
  templateUrl: './boton.html',
  styleUrl: './boton.css',
})
export class Boton {
  readonly variante = input<VarianteBoton>('primario');
  readonly deshabilitado = input<boolean>(false);
  readonly tipo = input<'button' | 'submit'>('button');
}
