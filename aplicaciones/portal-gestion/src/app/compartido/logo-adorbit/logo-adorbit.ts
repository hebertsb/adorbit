import { Component, input } from '@angular/core';

// Simbolo real de AdOrbit (A geometrica + orbita), tal cual
// documentacion/diseno/adorbit-simbolo.svg — no es un marcador de posicion.
@Component({
  selector: 'ao-logo-adorbit',
  templateUrl: './logo-adorbit.html',
  styleUrl: './logo-adorbit.css',
})
export class LogoAdorbit {
  readonly tamano = input<number>(28);
}
