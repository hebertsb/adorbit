import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Boton } from '../../compartido/boton/boton';
import { LogoAdorbit } from '../../compartido/logo-adorbit/logo-adorbit';
import { AutenticacionService } from '../../core/auth/autenticacion.service';

@Component({
  selector: 'ao-pagina-login',
  imports: [FormsModule, Boton, LogoAdorbit],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  private readonly auth = inject(AutenticacionService);
  private readonly router = inject(Router);

  protected email = 'ejecutivo@adorbit.com';
  protected contrasena = 'Adorbit2026!';
  protected cargando = signal(false);
  protected error = signal<string | null>(null);

  protected readonly usuariosDemo = [
    { email: 'ejecutivo@adorbit.com', nombre: 'Roly (Ejecutivo)', rol: 'ejecutivo' },
    { email: 'creativo@adorbit.com', nombre: 'Hebert (Creativo)', rol: 'creativo' },
    { email: 'gerente@adorbit.com', nombre: 'Luis (Gerente)', rol: 'gerente' },
    { email: 'admin@adorbit.com', nombre: 'Admin Global', rol: 'todos' },
  ];

  seleccionarDemo(demoEmail: string): void {
    this.email = demoEmail;
    this.contrasena = 'Adorbit2026!';
    this.iniciarSesion();
  }

  async iniciarSesion(): Promise<void> {
    this.cargando.set(true);
    this.error.set(null);

    const ok = await this.auth.iniciarSesionDirecta(this.email, this.contrasena);
    this.cargando.set(false);

    if (ok) {
      // El rol creativo no gestiona campañas/presupuesto: su pantalla de trabajo es
      // Creatividades, no el dashboard de campañas (pensado para ejecutivo/gerente).
      const esSoloCreativo = this.auth.tieneRol('creativo') && !this.auth.tieneRol('ejecutivo');
      this.router.navigateByUrl(esSoloCreativo ? '/creatividades' : '/dashboard');
    } else {
      this.error.set('Credenciales inválidas o servidor de autenticación inaccesible.');
    }
  }

  iniciarConKeycloak(): void {
    this.auth.iniciarFlujoKeycloak();
  }
}
