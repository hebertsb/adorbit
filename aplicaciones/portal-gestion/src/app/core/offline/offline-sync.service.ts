import { computed, inject, Injectable, signal } from '@angular/core';
import { AutenticacionService } from '../auth/autenticacion.service';

export interface OperacionOffline {
  id: string;
  claveIdempotencia: string;
  tipo: 'crear_brief' | 'crear_pieza' | 'crear_campana' | 'decidir_pieza' | 'crear_cliente';
  etiqueta: string;
  url: string;
  metodo: 'POST' | 'PUT';
  cuerpo: unknown;
  estado: 'pendiente' | 'sincronizando' | 'sincronizado' | 'conflicto_409' | 'error';
  intentos: number;
  creadoEn: string;
  ultimoError?: string;
}

const CLAVE_BANDEJA_OFFLINE = 'adorbit_bandeja_salida_web_v1';
const CLAVE_CACHE_LECTURA_PREFIJO = 'adorbit_cache_lectura_v1:';

/**
 * Servicio de Modo Offline, Caché Local y Sincronización con Idempotencia en el Front Web.
 * - Detecta estado de red (`navigator.onLine` + eventos `online`/`offline`).
 * - Guarda en caché local todas las lecturas exitosas (`GET` y queries GraphQL) para operar sin conexión.
 * - Encola escrituras en `bandeja_salida_local` conservando el `Idempotency-Key` original.
 * - Drena automáticamente la cola al recuperar conexión, manejando `409 Conflict` sin sobrescribir.
 */
@Injectable({ providedIn: 'root' })
export class OfflineSyncService {
  private readonly auth = inject(AutenticacionService);

  readonly enLinea = signal<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);
  readonly sincronizando = signal<boolean>(false);
  readonly bandeja = signal<OperacionOffline[]>(this.cargarBandejaInicial());
  readonly ultimaSincronizacion = signal<string | null>(null);

  readonly pendientesCount = computed(
    () => this.bandeja().filter((op) => op.estado === 'pendiente' || op.estado === 'error').length,
  );
  readonly conflictosCount = computed(
    () => this.bandeja().filter((op) => op.estado === 'conflicto_409').length,
  );

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.enLinea.set(true);
        void this.sincronizarPendientes();
      });
      window.addEventListener('offline', () => {
        this.enLinea.set(false);
      });
    }
  }

  /** Guarda una lectura en la caché persistente del navegador para consultas sin red. */
  guardarCacheLectura<T>(clave: string, datos: T): void {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(
        `${CLAVE_CACHE_LECTURA_PREFIJO}${clave}`,
        JSON.stringify({ guardadoEn: new Date().toISOString(), datos }),
      );
    } catch {
      // Cuota de almacenamiento alcanzada; se ignora sin bloquear la UI
    }
  }

  /** Recupera una lectura cacheada cuando el navegador está offline o la red cae. */
  leerCacheLectura<T>(clave: string): T | null {
    if (typeof localStorage === 'undefined') return null;
    try {
      const crudo = localStorage.getItem(`${CLAVE_CACHE_LECTURA_PREFIJO}${clave}`);
      if (!crudo) return null;
      const parseado = JSON.parse(crudo) as { datos: T };
      return parseado.datos ?? null;
    } catch {
      return null;
    }
  }

  /**
   * Registra una operación de escritura en la bandeja de salida local cuando no hay conexión,
   * garantizando que al reconectar se envíe con el mismo `Idempotency-Key`.
   */
  encolarOperacion(entrada: {
    claveIdempotencia?: string;
    tipo: OperacionOffline['tipo'];
    etiqueta: string;
    url: string;
    metodo?: 'POST' | 'PUT';
    cuerpo: unknown;
  }): OperacionOffline {
    const item: OperacionOffline = {
      id: crypto.randomUUID(),
      claveIdempotencia: entrada.claveIdempotencia ?? crypto.randomUUID(),
      tipo: entrada.tipo,
      etiqueta: entrada.etiqueta,
      url: entrada.url,
      metodo: entrada.metodo ?? 'POST',
      cuerpo: entrada.cuerpo,
      estado: 'pendiente',
      intentos: 0,
      creadoEn: new Date().toISOString(),
    };
    this.bandeja.update((actual) => {
      const nueva = [item, ...actual];
      this.persistirBandeja(nueva);
      return nueva;
    });
    return item;
  }

  /** Drena todas las operaciones pendientes reenviando el mismo `Idempotency-Key`. */
  async sincronizarPendientes(): Promise<number> {
    if (this.sincronizando() || !this.enLinea()) return 0;
    const pendientes = this.bandeja().filter(
      (op) => op.estado === 'pendiente' || op.estado === 'error',
    );
    if (pendientes.length === 0) return 0;

    this.sincronizando.set(true);
    let sincronizadas = 0;

    try {
      const token = this.auth.token();
      for (const op of pendientes) {
        this.actualizarEstado(op.id, 'sincronizando');
        try {
          const respuesta = await fetch(op.url, {
            method: op.metodo,
            headers: {
              'Content-Type': 'application/json',
              'Idempotency-Key': op.claveIdempotencia,
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify(op.cuerpo),
          });

          if (respuesta.status === 409) {
            this.actualizarEstado(
              op.id,
              'conflicto_409',
              'Conflicto de versión (409): el registro fue modificado por otro usuario.',
            );
            continue;
          }

          if (!respuesta.ok) {
            throw new Error(`HTTP ${respuesta.status}`);
          }

          this.actualizarEstado(op.id, 'sincronizado');
          sincronizadas++;
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Fallo de red al sincronizar';
          this.actualizarEstado(op.id, 'error', msg, true);
        }
      }

      if (sincronizadas > 0) {
        this.ultimaSincronizacion.set(new Date().toISOString());
      }
      return sincronizadas;
    } finally {
      this.sincronizando.set(false);
    }
  }

  limpiarSincronizadas(): void {
    this.bandeja.update((actual) => {
      const filtrada = actual.filter((op) => op.estado !== 'sincronizado');
      this.persistirBandeja(filtrada);
      return filtrada;
    });
  }

  descartarOperacion(id: string): void {
    this.bandeja.update((actual) => {
      const filtrada = actual.filter((op) => op.id !== id);
      this.persistirBandeja(filtrada);
      return filtrada;
    });
  }

  private actualizarEstado(
    id: string,
    estado: OperacionOffline['estado'],
    errorMsg?: string,
    incrementarIntento = false,
  ): void {
    this.bandeja.update((actual) => {
      const nueva = actual.map((op) =>
        op.id === id
          ? {
              ...op,
              estado,
              ultimoError: errorMsg,
              intentos: incrementarIntento ? op.intentos + 1 : op.intentos,
            }
          : op,
      );
      this.persistirBandeja(nueva);
      return nueva;
    });
  }

  private cargarBandejaInicial(): OperacionOffline[] {
    if (typeof localStorage === 'undefined') return [];
    try {
      const crudo = localStorage.getItem(CLAVE_BANDEJA_OFFLINE);
      if (!crudo) return [];
      const lista = JSON.parse(crudo);
      return Array.isArray(lista) ? lista : [];
    } catch {
      return [];
    }
  }

  private persistirBandeja(lista: OperacionOffline[]): void {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(CLAVE_BANDEJA_OFFLINE, JSON.stringify(lista));
    } catch {
      // Ignorar si storage está lleno
    }
  }
}
