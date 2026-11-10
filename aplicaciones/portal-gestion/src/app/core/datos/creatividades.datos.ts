import { inject, Injectable } from '@angular/core';
import { AutenticacionService } from '../auth/autenticacion.service';
import { IaLocalWebService } from '../ia-local/ia-local-web.service';
import { OfflineSyncService } from '../offline/offline-sync.service';

const ES_DEV_LOCAL = typeof window !== 'undefined' && window.location.port === '4200';
const URL_API = ES_DEV_LOCAL ? 'http://localhost:8000/api/v1' : '/api/v1';

export type EstadoBrief = 'recibido' | 'en_creacion' | 'en_revision' | 'aprobado' | 'rechazado';
export type EstadoPieza = 'en_revision' | 'aprobada' | 'bloqueada_saga' | 'rechazada';
export type TipoPieza = 'imagen' | 'video' | 'copy' | 'audio';

export interface SolicitudBriefIa {
  concepto: string;
  tono?: string;
  publico_objetivo?: string;
  canales?: string[];
  objetivo?: string;
  cliente_o_marca?: string;
}

export interface PiezaSugeridaIa {
  nombre: string;
  formato: string;
  dimensiones?: string;
}

export interface PropuestaBriefIa {
  titulo: string;
  descripcion: string;
  tono_aplicado: string;
  canales_sugeridos: string[];
  piezas_sugeridas: PiezaSugeridaIa[];
  llamada_a_la_accion: string;
  origen: 'groq_llm' | 'heuristico_local';
}

export interface BriefCreativo {
  id: string;
  campanaId: string;
  clienteId?: string;
  titulo: string;
  descripcion?: string;
  estado: EstadoBrief;
  version: number;
  creadoEn: string;
  actualizadoEn: string;
}

export interface PiezaCreativaReal {
  id: string;
  briefId: string;
  campanaId: string;
  nombre: string;
  tipo: TipoPieza;
  versionNumero: number;
  archivo?: { ruta: string; mime: string; tamano: number };
  estado: EstadoPieza;
  validacionesMarca?: { manualMarcaOk: boolean; detalles?: Record<string, unknown> };
  version: number;
  creadoEn: string;
  actualizadoEn: string;
}

@Injectable({ providedIn: 'root' })
export class CreatividadesDatos {
  private readonly auth = inject(AutenticacionService);
  private readonly iaLocal = inject(IaLocalWebService);
  private readonly offline = inject(OfflineSyncService);

  private cabeceras(escritura = false, claveIdempotencia?: string): Record<string, string> {
    const token = this.auth.token();
    return {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(escritura
        ? {
            'Content-Type': 'application/json',
            'Idempotency-Key': claveIdempotencia ?? crypto.randomUUID(),
          }
        : {}),
    };
  }

  private async solicitar<T>(ruta: string, opciones: RequestInit = {}): Promise<T> {
    const respuesta = await fetch(`${URL_API}${ruta}`, opciones);
    if (respuesta.status === 401) {
      this.auth.cerrarSesion();
      throw new Error('La sesión expiró. Vuelva a iniciar sesión.');
    }
    if (!respuesta.ok) {
      let mensaje = `No se pudo completar la operación (${respuesta.status}).`;
      try {
        const detalle = (await respuesta.json()) as { mensaje?: string; message?: string };
        mensaje = detalle.mensaje ?? detalle.message ?? mensaje;
      } catch {
        // Respuesta sin JSON.
      }
      throw new Error(mensaje);
    }
    return respuesta.json() as Promise<T>;
  }

  async listarBriefs(campanaId?: string): Promise<BriefCreativo[]> {
    const claveCache = `briefs:${campanaId ?? 'todos'}`;
    const consulta = new URLSearchParams({ page: '1', size: '100' });
    if (campanaId) consulta.set('campana_id', campanaId);
    try {
      const pagina = await this.solicitar<{ items: BriefCreativo[] }>(`/briefs?${consulta}`, {
        headers: this.cabeceras(),
      });
      this.offline.guardarCacheLectura(claveCache, pagina.items);
      return pagina.items;
    } catch (err) {
      const cacheados = this.offline.leerCacheLectura<BriefCreativo[]>(claveCache);
      if (cacheados) return cacheados;
      throw err;
    }
  }

  async crearBrief(cuerpo: {
    campana_id: string;
    cliente_id?: string;
    titulo: string;
    descripcion?: string;
  }): Promise<BriefCreativo> {
    const claveIdempotencia = crypto.randomUUID();
    if (!this.offline.enLinea()) {
      this.offline.encolarOperacion({
        claveIdempotencia,
        tipo: 'crear_brief',
        etiqueta: `Crear brief: ${cuerpo.titulo}`,
        url: `${URL_API}/briefs`,
        metodo: 'POST',
        cuerpo,
      });
      const ahora = new Date().toISOString();
      const temporal: BriefCreativo = {
        id: crypto.randomUUID(),
        campanaId: cuerpo.campana_id,
        clienteId: cuerpo.cliente_id,
        titulo: `${cuerpo.titulo} (en cola offline)`,
        descripcion: cuerpo.descripcion,
        estado: 'recibido',
        version: 1,
        creadoEn: ahora,
        actualizadoEn: ahora,
      };
      return temporal;
    }

    try {
      return await this.solicitar('/briefs', {
        method: 'POST',
        headers: this.cabeceras(true, claveIdempotencia),
        body: JSON.stringify(cuerpo),
      });
    } catch (err) {
      if (!navigator.onLine) {
        this.offline.encolarOperacion({
          claveIdempotencia,
          tipo: 'crear_brief',
          etiqueta: `Crear brief: ${cuerpo.titulo}`,
          url: `${URL_API}/briefs`,
          metodo: 'POST',
          cuerpo,
        });
        const ahora = new Date().toISOString();
        return {
          id: crypto.randomUUID(),
          campanaId: cuerpo.campana_id,
          clienteId: cuerpo.cliente_id,
          titulo: `${cuerpo.titulo} (en cola offline)`,
          descripcion: cuerpo.descripcion,
          estado: 'recibido',
          version: 1,
          creadoEn: ahora,
          actualizadoEn: ahora,
        };
      }
      throw err;
    }
  }

  async generarPropuestaBriefIa(solicitud: SolicitudBriefIa): Promise<PropuestaBriefIa> {
    if (!this.offline.enLinea()) {
      return this.iaLocal.generarPropuestaBriefLocal(solicitud);
    }
    try {
      return await this.solicitar('/asistente/generar-brief', {
        method: 'POST',
        headers: this.cabeceras(true),
        body: JSON.stringify(solicitud),
      });
    } catch {
      return this.iaLocal.generarPropuestaBriefLocal(solicitud);
    }
  }

  async listarPiezas(briefId: string): Promise<PiezaCreativaReal[]> {
    const claveCache = `piezas:${briefId}`;
    try {
      const resultado = await this.solicitar<{ items: PiezaCreativaReal[] }>(
        `/briefs/${encodeURIComponent(briefId)}/piezas`,
        { headers: this.cabeceras() },
      );
      this.offline.guardarCacheLectura(claveCache, resultado.items);
      return resultado.items;
    } catch (err) {
      const cacheadas = this.offline.leerCacheLectura<PiezaCreativaReal[]>(claveCache);
      if (cacheadas) return cacheadas;
      throw err;
    }
  }

  async crearPieza(
    briefId: string,
    cuerpo: { nombre: string; tipo: TipoPieza },
  ): Promise<PiezaCreativaReal> {
    const claveIdempotencia = crypto.randomUUID();
    if (!this.offline.enLinea()) {
      this.offline.encolarOperacion({
        claveIdempotencia,
        tipo: 'crear_pieza',
        etiqueta: `Registrar pieza: ${cuerpo.nombre}`,
        url: `${URL_API}/briefs/${encodeURIComponent(briefId)}/piezas`,
        metodo: 'POST',
        cuerpo,
      });
      const ahora = new Date().toISOString();
      return {
        id: crypto.randomUUID(),
        briefId,
        campanaId: '',
        nombre: `${cuerpo.nombre} (en cola offline)`,
        tipo: cuerpo.tipo,
        versionNumero: 1,
        estado: 'en_revision',
        version: 1,
        creadoEn: ahora,
        actualizadoEn: ahora,
      };
    }

    return this.solicitar(`/briefs/${encodeURIComponent(briefId)}/piezas`, {
      method: 'POST',
      headers: this.cabeceras(true, claveIdempotencia),
      body: JSON.stringify(cuerpo),
    });
  }

  decidirPieza(id: string, decision: 'aprobar' | 'rechazar'): Promise<PiezaCreativaReal> {
    const claveIdempotencia = crypto.randomUUID();
    if (!this.offline.enLinea()) {
      this.offline.encolarOperacion({
        claveIdempotencia,
        tipo: 'decidir_pieza',
        etiqueta: `${decision === 'aprobar' ? 'Aprobar' : 'Rechazar'} pieza ${id.slice(0, 8)}`,
        url: `${URL_API}/piezas/${encodeURIComponent(id)}/aprobar`,
        metodo: 'POST',
        cuerpo: { decision },
      });
    }
    return this.solicitar(`/piezas/${encodeURIComponent(id)}/aprobar`, {
      method: 'POST',
      headers: this.cabeceras(true, claveIdempotencia),
      body: JSON.stringify({ decision }),
    });
  }

  registrarValidacionIaLocal(
    piezaId: string,
    resultado: 'aprobada' | 'rechazada',
    detalles: Record<string, unknown>,
  ): Promise<unknown> {
    const claveIdempotencia = crypto.randomUUID();
    const ruta = `/piezas/${encodeURIComponent(piezaId)}/validaciones`;
    const cuerpo = { resultado, origen: 'ia', detalles };

    if (!this.offline.enLinea()) {
      this.offline.encolarOperacion({
        claveIdempotencia,
        tipo: 'decidir_pieza',
        etiqueta: `Validación IA local pieza ${piezaId.slice(0, 8)}`,
        url: `${URL_API}${ruta}`,
        metodo: 'POST',
        cuerpo,
      });
      return Promise.resolve({ encoladoOffline: true });
    }

    return this.solicitar(ruta, {
      method: 'POST',
      headers: this.cabeceras(true, claveIdempotencia),
      body: JSON.stringify(cuerpo),
    }).catch(() => ({ encoladoOffline: true }));
  }

  async subirArchivo(piezaId: string, archivo: File): Promise<void> {
    if (!this.offline.enLinea()) return;
    const solicitud = await this.solicitar<{ urlSubida: string }>(
      `/piezas/${encodeURIComponent(piezaId)}/archivo`,
      {
        method: 'POST',
        headers: this.cabeceras(true),
        body: JSON.stringify({ mime: archivo.type, tamano: archivo.size }),
      },
    );
    const subida = await fetch(solicitud.urlSubida, {
      method: 'PUT',
      headers: { 'Content-Type': archivo.type },
      body: archivo,
    });
    if (!subida.ok) throw new Error(`No se pudo transferir el archivo (${subida.status}).`);
  }
}
