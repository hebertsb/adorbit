import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AutenticacionService } from '../../core/auth/autenticacion.service';

@Component({
  selector: 'ao-estado-ruta',
  imports: [RouterLink],
  templateUrl: './estado-ruta.html',
  styleUrl: './estado-ruta.css',
})
export class EstadoRuta {
  private readonly router = inject(Router);
  private readonly auth = inject(AutenticacionService);
  protected readonly sinAcceso = this.router.url.startsWith('/sin-acceso');
  protected readonly rutaInicio =
    this.auth.tieneRol('creativo') &&
    !this.auth.tieneRol('ejecutivo') &&
    !this.auth.tieneRol('gerente')
      ? '/creatividades'
      : '/dashboard';
}
