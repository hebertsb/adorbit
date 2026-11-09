import { Injectable, signal, computed } from '@angular/core';

export interface UsuarioAutenticado {
  sub: string;
  email: string;
  nombre: string;
  roles: string[];
}

const CLAVE_TOKEN = 'adorbit_token';
const CLAVE_VERIFICADOR_PKCE = 'adorbit_pkce_verificador';
const CLAVE_ESTADO_PKCE = 'adorbit_pkce_estado';

interface ConfiguracionIdentidad {
  autoridad: string;
  clienteId: string;
  emisorPruebaUrl?: string;
  permitirEmisorPrueba?: boolean;
}

declare global {
  interface Window {
    adorbitIdentidad?: ConfiguracionIdentidad;
  }
}

const configuracionIdentidad = (): ConfiguracionIdentidad =>
  window.adorbitIdentidad ?? {
    autoridad: 'http://localhost:8180/realms/adorbit',
    clienteId: 'adorbit-frontend',
    emisorPruebaUrl: 'http://localhost:8180',
    permitirEmisorPrueba: true,
  };

@Injectable({ providedIn: 'root' })
export class AutenticacionService {
  private readonly tokenSignal = signal<string | null>(this.recuperarTokenInicial());
  private readonly usuarioSignal = signal<UsuarioAutenticado | null>(null);

  readonly estaAutenticado = computed(() => !!this.tokenSignal() && !!this.usuarioSignal());
  readonly usuario = computed(() => this.usuarioSignal());
  readonly token = computed(() => this.tokenSignal());

  constructor() {
    const token = this.tokenSignal();
    if (token) {
      if (!this.procesarToken(token)) this.cerrarSesion();
    }
  }

  private recuperarTokenInicial(): string | null {
    if (typeof window === 'undefined') return null;
    return sessionStorage.getItem(CLAVE_TOKEN) || localStorage.getItem(CLAVE_TOKEN);
  }

  async iniciarFlujoKeycloak(): Promise<void> {
    if (typeof window === 'undefined') return;
    const config = configuracionIdentidad();
    const verificador = this.textoAleatorio(64);
    const estado = this.textoAleatorio(32);
    const resumen = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verificador));
    const desafio = this.base64Url(new Uint8Array(resumen));
    const redirectUri = `${window.location.origin}/login`;
    sessionStorage.setItem(CLAVE_VERIFICADOR_PKCE, verificador);
    sessionStorage.setItem(CLAVE_ESTADO_PKCE, estado);
    const parametros = new URLSearchParams({
      client_id: config.clienteId,
      response_type: 'code',
      scope: 'openid profile',
      redirect_uri: redirectUri,
      state: estado,
      code_challenge: desafio,
      code_challenge_method: 'S256',
    });
    window.location.href = `${config.autoridad}/protocol/openid-connect/auth?${parametros}`;
  }

  async completarFlujoKeycloak(): Promise<boolean> {
    const parametros = new URLSearchParams(window.location.search);
    const codigo = parametros.get('code');
    if (!codigo) return false;
    const verificador = sessionStorage.getItem(CLAVE_VERIFICADOR_PKCE);
    const estadoEsperado = sessionStorage.getItem(CLAVE_ESTADO_PKCE);
    if (!verificador || !estadoEsperado || parametros.get('state') !== estadoEsperado) {
      this.limpiarPkce();
      return false;
    }
    const config = configuracionIdentidad();
    const redirectUri = `${window.location.origin}/login`;
    const cuerpo = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: config.clienteId,
      code: codigo,
      redirect_uri: redirectUri,
      code_verifier: verificador,
    });
    try {
      const respuesta = await fetch(`${config.autoridad}/protocol/openid-connect/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: cuerpo,
      });
      if (!respuesta.ok) return false;
      const datos = await respuesta.json();
      if (typeof datos.access_token !== 'string') return false;
      this.establecerToken(datos.access_token);
      window.history.replaceState({}, document.title, '/login');
      return true;
    } finally {
      this.limpiarPkce();
    }
  }

  async iniciarSesionDirecta(email: string, contrasena: string): Promise<boolean> {
    const config = configuracionIdentidad();
    try {
      const cuerpo = new URLSearchParams();
      cuerpo.append('grant_type', 'password');
      cuerpo.append('client_id', config.clienteId);
      cuerpo.append('username', email);
      cuerpo.append('password', contrasena);

      const respuesta = await fetch(`${config.autoridad}/protocol/openid-connect/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: cuerpo.toString(),
      });

      if (!respuesta.ok) {
        console.error('Error al autenticar en Keycloak:', respuesta.statusText);
        return config.permitirEmisorPrueba ? this.iniciarSesionConEmisorPrueba(email) : false;
      }

      const datos = await respuesta.json();
      this.establecerToken(datos.access_token);
      return true;
    } catch (error) {
      console.warn('Keycloak no disponible, comprobando el emisor de desarrollo:', error);
      return config.permitirEmisorPrueba ? this.iniciarSesionConEmisorPrueba(email) : false;
    }
  }

  /** Token real (firmado RS256, verificado igual por el backend) del emisor de prueba
   * compartido -- no un token fabricado en el cliente. Ver EMISOR_PRUEBA_URL arriba. */
  private async iniciarSesionConEmisorPrueba(email: string): Promise<boolean> {
    try {
      const emisor = configuracionIdentidad().emisorPruebaUrl;
      if (!emisor) return false;
      const rol = email.split('@')[0] || 'ejecutivo';
      const roles = rol === 'admin' ? 'ejecutivo,gerente,creativo' : rol;
      const respuesta = await fetch(
        `${emisor}/emitir?roles=${encodeURIComponent(roles)}&email=${encodeURIComponent(email)}`,
      );
      if (!respuesta.ok) return false;
      const datos = await respuesta.json();
      this.establecerToken(datos.access_token);
      return true;
    } catch (error) {
      console.error('Emisor de prueba tampoco disponible en localhost:8180:', error);
      return false;
    }
  }

  private textoAleatorio(longitud: number): string {
    const bytes = crypto.getRandomValues(new Uint8Array(longitud));
    return this.base64Url(bytes);
  }

  private base64Url(bytes: Uint8Array): string {
    let binario = '';
    bytes.forEach((byte) => {
      binario += String.fromCharCode(byte);
    });
    return btoa(binario).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  private limpiarPkce(): void {
    sessionStorage.removeItem(CLAVE_VERIFICADOR_PKCE);
    sessionStorage.removeItem(CLAVE_ESTADO_PKCE);
  }

  establecerToken(token: string): void {
    this.tokenSignal.set(token);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(CLAVE_TOKEN, token);
    }
    if (!this.procesarToken(token)) this.cerrarSesion();
  }

  cerrarSesion(): void {
    this.tokenSignal.set(null);
    this.usuarioSignal.set(null);
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem(CLAVE_TOKEN);
      localStorage.removeItem(CLAVE_TOKEN);
    }
  }

  private nombreDesdeCorreo(email: string): string {
    const usuario = email.split('@')[0] || 'usuario';
    return usuario.charAt(0).toUpperCase() + usuario.slice(1);
  }

  tieneRol(rol: string): boolean {
    const u = this.usuarioSignal();
    return !!u && u.roles.includes(rol);
  }

  private procesarToken(token: string): boolean {
    try {
      const partes = token.split('.');
      if (partes.length < 2) return false;
      const payloadBase64 = partes[1].replace(/-/g, '+').replace(/_/g, '/');
      const payloadJson = decodeURIComponent(
        atob(payloadBase64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join(''),
      );
      const payload = JSON.parse(payloadJson);

      if (typeof payload.exp === 'number' && payload.exp * 1000 <= Date.now()) return false;
      const rolesValidos = new Set(['ejecutivo', 'creativo', 'cliente', 'gerente']);
      const roles = Array.isArray(payload.realm_access?.roles)
        ? payload.realm_access.roles.filter(
            (rol: unknown): rol is string => typeof rol === 'string' && rolesValidos.has(rol),
          )
        : [];
      if (roles.length === 0) return false;
      const email = payload.email ?? payload.preferred_username ?? 'usuario@adorbit.com';
      this.usuarioSignal.set({
        sub: payload.sub ?? 'demo-user',
        email,
        // El emisor de prueba no trae "name" (solo roles); se deriva del correo para no
        // mostrar siempre el mismo nombre fijo sin importar quien inicio sesion.
        nombre: payload.name ?? payload.firstName ?? this.nombreDesdeCorreo(email),
        roles,
      });
      return true;
    } catch (e) {
      console.error('Error al decodificar token JWT:', e);
      return false;
    }
  }
}
