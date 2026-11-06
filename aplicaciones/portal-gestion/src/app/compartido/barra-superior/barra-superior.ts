import { Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { TemaService } from '../../core/tema.service';
import { AutenticacionService } from '../../core/auth/autenticacion.service';

@Component({
  selector: 'ao-barra-superior',
  templateUrl: './barra-superior.html',
  styleUrl: './barra-superior.css',
})
export class BarraSuperior {
  protected readonly tema = inject(TemaService);
  private readonly auth = inject(AutenticacionService);
  private readonly router = inject(Router);

  protected readonly usuario = computed(() => this.auth.usuario());

  protected readonly nombreUsuario = computed(() => {
    const u = this.usuario();
    return u ? u.nombre : 'Roly Ejecutivo';
  });

  protected readonly rolUsuario = computed(() => {
    const u = this.usuario();
    if (!u || u.roles.length === 0) return 'Ejecutivo de cuentas';
    const primerRol = u.roles[0];
    switch (primerRol) {
      case 'ejecutivo':
        return 'Ejecutivo de cuentas';
      case 'creativo':
        return 'Diseñador creativo';
      case 'gerente':
        return 'Gerente de cuentas';
      case 'cliente':
        return 'Cliente anunciante';
      default:
        return primerRol;
    }
  });

  cerrarSesion(): void {
    this.auth.cerrarSesion();
    this.router.navigateByUrl('/login');
  }
}
