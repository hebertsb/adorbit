import { Component, inject, OnInit, signal } from '@angular/core';
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
export class Login implements OnInit {
  private readonly auth = inject(AutenticacionService);
  private readonly router = inject(Router);

  protected email = 'ejecutivo@adorbit.com';
  protected contrasena = 'admin';
  protected cargando = signal(false);
  protected error = signal<string | null>(null);

  protected readonly usuariosDemo = [
    { email: 'ejecutivo@adorbit.com', nombre: 'Roly (Ejecutivo)', rol: 'ejecutivo' },
    { email: 'creativo@adorbit.com', nombre: 'Hebert (Creativo)', rol: 'creativo' },
    { email: 'gerente@adorbit.com', nombre: 'Luis (Gerente)', rol: 'gerente' },
    { email: 'admin@adorbit.com', nombre: 'Admin Global', rol: 'todos' },
  ];

  async ngOnInit(): Promise<void> {
    if (!new URLSearchParams(window.location.search).has('code')) return;
    this.cargando.set(true);
    const ok = await this.auth.completarFlujoKeycloak();
    this.cargando.set(false);
    if (ok) {
      await this.router.navigateByUrl(this.rutaInicial());
    } else {
      this.error.set('No se pudo completar el inicio de sesion con Keycloak. Intente nuevamente.');
    }
  }

  seleccionarDemo(demoEmail: string): void {
    this.email = demoEmail;
    this.contrasena = 'admin';
    this.iniciarSesion();
  }

  async iniciarSesion(): Promise<void> {
    this.cargando.set(true);
    this.error.set(null);

    const ok = await this.auth.iniciarSesionDirecta(this.email, this.contrasena);
    this.cargando.set(false);

    if (ok) {
      this.router.navigateByUrl(this.rutaInicial());
    } else {
      this.error.set('Credenciales inválidas o servidor de autenticación inaccesible.');
    }
  }

  iniciarConKeycloak(): void {
    void this.auth.iniciarFlujoKeycloak();
  }

  private rutaInicial(): string {
    return this.auth.tieneRol('ejecutivo') || this.auth.tieneRol('gerente')
      ? '/dashboard'
      : this.auth.tieneRol('creativo')
        ? '/creatividades'
        : '/sin-acceso';
  }
}
