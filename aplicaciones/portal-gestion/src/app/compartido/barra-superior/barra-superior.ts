import { Component, inject } from '@angular/core';
import { TemaService } from '../../core/tema.service';

@Component({
  selector: 'ao-barra-superior',
  templateUrl: './barra-superior.html',
  styleUrl: './barra-superior.css',
})
export class BarraSuperior {
  protected readonly tema = inject(TemaService);

  // TODO Roly: reemplazar por el usuario real del token de Keycloak (claims del JWT).
  protected readonly nombreUsuario = 'María Fernández';
  protected readonly rolUsuario = 'Ejecutiva de cuenta';
}
