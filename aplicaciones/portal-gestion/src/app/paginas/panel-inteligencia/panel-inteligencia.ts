import { AfterViewInit, Component, effect, ElementRef, inject, OnDestroy, signal, viewChild } from '@angular/core';
import { Router } from '@angular/router';
import { AutenticacionService } from '../../core/auth/autenticacion.service';
import { TemaService } from '../../core/tema.service';

interface InstanciaPanel {
  desmontar(): void;
  actualizarContexto(contexto: { tema: 'claro' | 'oscuro' }): void;
}

interface ContenedorPanel {
  init(compartidos: object): Promise<void>;
  get(modulo: string): Promise<() => { montarPanel: (destino: HTMLElement, contexto: object) => InstanciaPanel }>;
}

interface ConfiguracionPanel {
  urlModulo: string;
  apiIaUrl: string;
}

declare global {
  interface Window { adorbitPanelInteligencia?: ConfiguracionPanel }
}

@Component({
  selector: 'app-panel-inteligencia',
  styleUrl: './panel-inteligencia.css',
  templateUrl: './panel-inteligencia.html',
})
export class PanelInteligencia implements AfterViewInit, OnDestroy {
  private readonly auth = inject(AutenticacionService);
  private readonly router = inject(Router);
  private readonly tema = inject(TemaService);
  private readonly destino = viewChild.required<ElementRef<HTMLElement>>('destino');
  private instancia?: InstanciaPanel;
  private destruido = false;
  protected readonly estado = signal<'cargando' | 'listo' | 'error'>('cargando');

  constructor() {
    effect(() => {
      const tema = this.tema.temaActual();
      this.instancia?.actualizarContexto({ tema });
    });
  }

  ngAfterViewInit(): void { void this.cargar(); }

  /** Carga el contenedor configurado y monta el panel en esta vista. */
  async cargar(): Promise<void> {
    this.estado.set('cargando');
    try {
      const config = window.adorbitPanelInteligencia;
      if (!config?.urlModulo || !config.apiIaUrl) throw new Error('Configuración incompleta');
      const url = this.validarUrl(config.urlModulo);
      const apiIaUrl = this.validarUrl(config.apiIaUrl);
      const contenedor: ContenedorPanel = await import(/* @vite-ignore */ url.href);
      await contenedor.init({});
      const modulo = (await contenedor.get('./montar'))();
      if (this.destruido) return;
      this.instancia = modulo.montarPanel(this.destino().nativeElement, {
        apiIaUrl: apiIaUrl.href.replace(/\/+$/, ''),
        obtenerToken: async () => this.obtenerTokenVigente(),
        alExpirarSesion: () => {
          this.auth.cerrarSesion();
          void this.router.navigate(['/login']);
        },
        usuario: { nombre: this.auth.usuario()?.nombre },
        tema: this.tema.temaActual(),
      });
      this.estado.set('listo');
    } catch {
      if (!this.destruido) this.estado.set('error');
    }
  }

  private validarUrl(valor: string): URL {
    const url = new URL(valor, window.location.href);
    const local = ['localhost', '127.0.0.1', '[::1]', window.location.hostname].includes(url.hostname);
    if (url.protocol !== 'https:' && !(url.protocol === 'http:' && local)) {
      throw new Error('Se requiere HTTPS fuera del equipo local');
    }
    return url;
  }

  private obtenerTokenVigente(): string {
    const token = this.auth.token();
    try {
      if (!token) throw new Error();
      const carga = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
      if (typeof carga.exp !== 'number' || !Number.isFinite(carga.exp) || carga.exp <= Date.now() / 1000) throw new Error();
      return token;
    } catch {
      this.auth.cerrarSesion();
      void this.router.navigate(['/login']);
      throw new Error('Sesión ausente o vencida');
    }
  }

  ngOnDestroy(): void {
    this.destruido = true;
    this.instancia?.desmontar();
  }
}
