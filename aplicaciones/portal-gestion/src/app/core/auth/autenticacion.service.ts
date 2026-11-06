import { Injectable, signal, computed } from '@angular/core';

export interface UsuarioAutenticado {
  sub: string;
  email: string;
  nombre: string;
  roles: string[];
}

const CLAVE_TOKEN = 'adorbit_token';
const KEYCLOAK_URL = 'http://localhost:8080/realms/adorbit';
const CLIENT_ID = 'adorbit-frontend';

@Injectable({ providedIn: 'root' })
export class AutenticacionService {
  private readonly tokenSignal = signal<string | null>(this.recuperarTokenInicial());
  private readonly usuarioSignal = signal<UsuarioAutenticado | null>(null);

  readonly estaAutenticado = computed(() => !!this.tokenSignal());
  readonly usuario = computed(() => this.usuarioSignal());
  readonly token = computed(() => this.tokenSignal());

  constructor() {
    const token = this.tokenSignal();
    if (token) {
      this.procesarToken(token);
    }
  }

  private recuperarTokenInicial(): string | null {
    if (typeof window === 'undefined') return null;
    return sessionStorage.getItem(CLAVE_TOKEN) || localStorage.getItem(CLAVE_TOKEN);
  }

  iniciarFlujoKeycloak(): void {
    if (typeof window === 'undefined') return;
    const redirectUri = encodeURIComponent(window.location.origin + '/dashboard');
    const urlAuth = `${KEYCLOAK_URL}/protocol/openid-connect/auth?client_id=${CLIENT_ID}&response_type=token&scope=openid&redirect_uri=${redirectUri}`;
    window.location.href = urlAuth;
  }

  async iniciarSesionDirecta(email: string, contrasena: string): Promise<boolean> {
    try {
      const cuerpo = new URLSearchParams();
      cuerpo.append('grant_type', 'password');
      cuerpo.append('client_id', CLIENT_ID);
      cuerpo.append('username', email);
      cuerpo.append('password', contrasena);

      const respuesta = await fetch(`${KEYCLOAK_URL}/protocol/openid-connect/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: cuerpo.toString(),
      });

      if (!respuesta.ok) {
        console.error('Error al autenticar en Keycloak:', respuesta.statusText);
        return false;
      }

      const datos = await respuesta.json();
      this.establecerToken(datos.access_token);
      return true;
    } catch (error) {
      console.warn('Keycloak no disponible localmente, iniciando sesion en modo demo:', error);
      // Fallback para modo offline/demo sin Keycloak levantado
      const tokenDemo = this.crearTokenDemo(email);
      this.establecerToken(tokenDemo);
      return true;
    }
  }

  establecerToken(token: string): void {
    this.tokenSignal.set(token);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(CLAVE_TOKEN, token);
    }
    this.procesarToken(token);
  }

  cerrarSesion(): void {
    this.tokenSignal.set(null);
    this.usuarioSignal.set(null);
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem(CLAVE_TOKEN);
      localStorage.removeItem(CLAVE_TOKEN);
    }
  }

  tieneRol(rol: string): boolean {
    const u = this.usuarioSignal();
    return !!u && u.roles.includes(rol);
  }

  private procesarToken(token: string): void {
    try {
      const partes = token.split('.');
      if (partes.length < 2) return;
      const payloadBase64 = partes[1].replace(/-/g, '+').replace(/_/g, '/');
      const payloadJson = decodeURIComponent(
        atob(payloadBase64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      const payload = JSON.parse(payloadJson);

      const roles = payload.realm_access?.roles ?? ['ejecutivo'];
      this.usuarioSignal.set({
        sub: payload.sub ?? 'demo-user',
        email: payload.email ?? payload.preferred_username ?? 'ejecutivo@adorbit.com',
        nombre: payload.name ?? payload.firstName ?? 'Roly Ejecutivo',
        roles,
      });
    } catch (e) {
      console.error('Error al decodificar token JWT:', e);
    }
  }

  private crearTokenDemo(email: string): string {
    const rol = email.split('@')[0] || 'ejecutivo';
    const header = btoa(JSON.stringify({ alg: 'none', typ: 'JWT' }));
    const payload = btoa(
      JSON.stringify({
        sub: 'usr-demo-' + Date.now(),
        email: email,
        preferred_username: email,
        name: email.split('@')[0].toUpperCase(),
        realm_access: { roles: [rol] },
        exp: Math.floor(Date.now() / 1000) + 7200,
      })
    );
    return `${header}.${payload}.demo_signature`;
  }
}

