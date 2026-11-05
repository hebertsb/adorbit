import { Component, input } from '@angular/core';

export type TipoMedio = 'tv' | 'radio' | 'digital' | 'redes' | 'vallas' | 'prensa';

@Component({
  selector: 'ao-icono-medio',
  templateUrl: './icono-medio.html',
  styleUrl: './icono-medio.css',
})
export class IconoMedio {
  readonly medio = input.required<TipoMedio>();
}
