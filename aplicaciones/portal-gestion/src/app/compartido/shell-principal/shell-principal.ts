import { Component, inject, signal } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { BarraLateral } from '../barra-lateral/barra-lateral';
import { BarraSuperior } from '../barra-superior/barra-superior';
import { LogoAdorbit } from '../logo-adorbit/logo-adorbit';
import { TemaService } from '../../core/tema.service';

@Component({
  selector: 'ao-shell-principal',
  imports: [RouterLink, RouterOutlet, BarraLateral, BarraSuperior, LogoAdorbit],
  templateUrl: './shell-principal.html',
  styleUrl: './shell-principal.css',
})
export class ShellPrincipal {
  protected readonly tema = inject(TemaService);
  protected readonly menuAbierto = signal(false);

  alternarMenu(): void {
    this.menuAbierto.update((abierto) => !abierto);
  }

  cerrarMenu(): void {
    this.menuAbierto.set(false);
  }
}
