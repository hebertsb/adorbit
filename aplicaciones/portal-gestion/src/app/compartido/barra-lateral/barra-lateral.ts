import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AutenticacionService } from '../../core/auth/autenticacion.service';

const URL_PANEL_INTELIGENCIA = 'http://localhost:4174';

@Component({
  selector: 'ao-barra-lateral',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './barra-lateral.html',
  styleUrl: './barra-lateral.css',
})
export class BarraLateral {
  private readonly auth = inject(AutenticacionService);

  protected readonly urlReportes = URL_PANEL_INTELIGENCIA;

  // Campañas (ms-campanas) es trabajo de ejecutivo/gerente; Creatividades (ms-creatividades)
  // es trabajo del rol creativo. "todos" (usuario Admin Global de demo) ve ambas.
  protected readonly vePestanaCampanas = () =>
    this.auth.tieneRol('ejecutivo') || this.auth.tieneRol('gerente');
  protected readonly vePestanaCreatividades = () => this.auth.tieneRol('creativo');
}
