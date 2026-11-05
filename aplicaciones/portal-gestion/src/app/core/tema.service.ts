import { Injectable, signal } from '@angular/core';

export type Tema = 'claro' | 'oscuro';

const CLAVE_ALMACENAMIENTO = 'adorbit_tema';

@Injectable({ providedIn: 'root' })
export class TemaService {
  readonly temaActual = signal<Tema>(this.leerTemaGuardado());

  constructor() {
    this.aplicarAlDocumento(this.temaActual());
  }

  alternar(): void {
    this.establecer(this.temaActual() === 'oscuro' ? 'claro' : 'oscuro');
  }

  establecer(tema: Tema): void {
    this.temaActual.set(tema);
    this.aplicarAlDocumento(tema);
    localStorage.setItem(CLAVE_ALMACENAMIENTO, tema);
  }

  private aplicarAlDocumento(tema: Tema): void {
    document.documentElement.setAttribute('data-theme', tema);
  }

  private leerTemaGuardado(): Tema {
    const guardado = localStorage.getItem(CLAVE_ALMACENAMIENTO);
    if (guardado === 'claro' || guardado === 'oscuro') {
      return guardado;
    }
    const prefiereOscuro = window.matchMedia('(prefers-color-scheme: dark)').matches;
    return prefiereOscuro ? 'oscuro' : 'claro';
  }
}
