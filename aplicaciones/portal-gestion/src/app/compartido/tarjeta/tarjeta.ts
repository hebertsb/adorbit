import { Component, input } from '@angular/core';

@Component({
  selector: 'ao-tarjeta',
  templateUrl: './tarjeta.html',
  styleUrl: './tarjeta.css',
})
export class Tarjeta {
  readonly compacta = input<boolean>(false);
}
