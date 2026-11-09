import { inject, Injectable } from '@angular/core';
import { AutenticacionService } from '../auth/autenticacion.service';

const URL_API = 'http://localhost:8000/api/v1';

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

  private cabeceras(escritura = false): Record<string, string> {
    const token = this.auth.token();
    return {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(escritura
        ? { 'Content-Type': 'application/json', 'Idempotency-Key': crypto.randomUUID() }
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
    const consulta = new URLSearchParams({ page: '1', size: '100' });
    if (campanaId) consulta.set('campana_id', campanaId);
    const pagina = await this.solicitar<{ items: BriefCreativo[] }>(`/briefs?${consulta}`, {
      headers: this.cabeceras(),
    });
    return pagina.items;
  }

  crearBrief(cuerpo: {
    campana_id: string;
    cliente_id?: string;
    titulo: string;
    descripcion?: string;
  }): Promise<BriefCreativo> {
    return this.solicitar('/briefs', {
      method: 'POST',
      headers: this.cabeceras(true),
      body: JSON.stringify(cuerpo),
    });
  }

  generarPropuestaBriefIa(solicitud: SolicitudBriefIa): Promise<PropuestaBriefIa> {
    return this.solicitar('/asistente/generar-brief', {
      method: 'POST',
      headers: this.cabeceras(true),
      body: JSON.stringify(solicitud),
    });
  }

  async listarPiezas(briefId: string): Promise<PiezaCreativaReal[]> {
    const resultado = await this.solicitar<{ items: PiezaCreativaReal[] }>(
      `/briefs/${encodeURIComponent(briefId)}/piezas`,
      { headers: this.cabeceras() },
    );
    return resultado.items;
  }

  crearPieza(
    briefId: string,
    cuerpo: { nombre: string; tipo: TipoPieza },
  ): Promise<PiezaCreativaReal> {
    return this.solicitar(`/briefs/${encodeURIComponent(briefId)}/piezas`, {
      method: 'POST',
      headers: this.cabeceras(true),
      body: JSON.stringify(cuerpo),
    });
  }

  decidirPieza(id: string, decision: 'aprobar' | 'rechazar'): Promise<PiezaCreativaReal> {
    return this.solicitar(`/piezas/${encodeURIComponent(id)}/aprobar`, {
      method: 'POST',
      headers: this.cabeceras(true),
      body: JSON.stringify({ decision }),
    });
  }

  async subirArchivo(piezaId: string, archivo: File): Promise<void> {
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
