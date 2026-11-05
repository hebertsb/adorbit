import { Component } from '@angular/core';
import { Boton } from '../../compartido/boton/boton';
import { LogoAdorbit } from '../../compartido/logo-adorbit/logo-adorbit';

@Component({
  selector: 'ao-pagina-login',
  imports: [Boton, LogoAdorbit],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  // TODO Roly: reemplazar por el inicio del flujo OIDC real (angular-oauth2-oidc /
  // keycloak-angular) contra el realm de Keycloak. Este botón hoy no hace nada.
  iniciarSesion(): void {
    console.info('TODO: iniciar flujo OIDC contra Keycloak');
  }
}
