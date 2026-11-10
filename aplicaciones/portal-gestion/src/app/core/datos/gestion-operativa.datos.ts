import { inject, Injectable } from '@angular/core';
import { AutenticacionService } from '../auth/autenticacion.service';

const ES_DEV_LOCAL = typeof window !== 'undefined' && window.location.port === '4200';
const URL_API = ES_DEV_LOCAL ? 'http://localhost:8000/api/v1' : '/api/v1';

export interface LineaCredito {
  limite: string;
  usado: string;
  moneda: 'BOB' | 'USD';
}
export interface ClienteCrm {
  id: string;
  razon_social: string;
  nit: string | null;
  estado: 'activo' | 'inactivo' | 'moroso';
  linea_credito: LineaCredito;
  version: number;
}
export interface Contacto {
  id: string;
  nombre: string;
  email?: string;
  telefono?: string;
  rol?: string;
}
export interface ReservaCredito {
  reserva_id: string;
  campana_id: string;
  monto: string;
  estado: string;
}
export interface CreditoCliente {
  cliente_id: string;
  linea_credito: LineaCredito;
  disponible: string;
  reservas_activas: ReservaCredito[];
}
export interface Contrato {
  id: string;
  cliente_id: string;
  estado: 'vigente' | 'vencido' | 'rescindido';
  fecha_inicio: string;
  fecha_fin: string;
  monto: string;
  moneda: 'BOB' | 'USD';
  version: number;
}
export interface Pagina<T> {
  contenido: T[];
  page: number;
  size: number;
  total_elementos: number;
}
export interface ItemFactura {
  numero?: number;
  descripcion: string;
  cantidad: number;
  precio_unitario: string;
  subtotal?: string;
}
export interface Cobro {
  id?: string;
  monto: string;
  fecha: string;
  referencia?: string;
}
export interface Factura {
  id: string;
  cliente_id: string;
  campana_id: string;
  estado: 'emitida' | 'pagada_parcial' | 'pagada' | 'vencida' | 'anulada';
  moneda: 'BOB' | 'USD';
  subtotal: string;
  impuestos: string;
  total: string;
  saldo: string;
  fecha_emision: string;
  fecha_vencimiento: string;
  items?: ItemFactura[];
  cobros?: Cobro[];
}
export interface Cotizacion {
  id: string;
  cliente_id: string;
  moneda: 'BOB' | 'USD';
  subtotal: string;
  impuestos: string;
  total: string;
  items: ItemFactura[];
}

export interface RiesgoClienteMl {
  cliente_id: string;
  cliente_nombre: string;
  probabilidad_impago: number;
  nivel_riesgo: 'bajo' | 'medio' | 'alto';
  recomendacion: string;
  features?: {
    proporcion_uso: number;
    linea_credito_limite: number;
    monto_vencido_total: number;
    dias_vencida_max: number;
    facturas_vencidas_count: number;
  };
  modelo?: string;
  calculado_en?: string;
}

export interface AlertaIaItem {
  id: string;
  tipo_evento: string;
  campana_id?: string;
  tipo_alerta?: string;
  nivel?: string;
  mensaje?: string;
  detalles?: Record<string, unknown>;
  creado_en?: string;
}

export interface AgenteIaItem {
  id: string;
  nombre: string;
  mision: string;
  habilidades: string[];
  disparador?: string;
  activo: boolean;
}

export interface EjecucionAgenteItem {
  id: string;
  agente_id: string;
  disparador: string;
  estado: string;
  salida?: Record<string, unknown>;
  error?: string | null;
  started_at?: string;
  finished_at?: string | null;
}

@Injectable({ providedIn: 'root' })
export class GestionOperativaDatos {
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
        mensaje = (await respuesta.json()).mensaje ?? mensaje;
      } catch {
        /* respuesta sin JSON */
      }
      throw new Error(mensaje);
    }
    if (respuesta.status === 204) return undefined as T;
    return respuesta.json() as Promise<T>;
  }

  listarClientes(filtros: { q?: string; estado?: string } = {}): Promise<Pagina<ClienteCrm>> {
    const p = new URLSearchParams({ page: '0', size: '100' });
    if (filtros.q) p.set('q', filtros.q);
    if (filtros.estado) p.set('estado', filtros.estado);
    return this.solicitar(`/clientes?${p}`, { headers: this.cabeceras() });
  }

  crearCliente(cuerpo: {
    razon_social: string;
    nit: string;
    limite_credito: string;
    moneda: string;
  }): Promise<ClienteCrm> {
    return this.solicitar('/clientes', {
      method: 'POST',
      headers: this.cabeceras(true),
      body: JSON.stringify(cuerpo),
    });
  }

  obtenerCliente(id: string): Promise<ClienteCrm> {
    return this.solicitar(`/clientes/${id}`, { headers: this.cabeceras() });
  }

  actualizarCliente(
    id: string,
    cuerpo: {
      razon_social: string;
      nit: string;
      limite_credito: string;
      estado: string;
      version: number;
    },
  ): Promise<ClienteCrm> {
    return this.solicitar(`/clientes/${id}`, {
      method: 'PUT',
      headers: this.cabeceras(true),
      body: JSON.stringify(cuerpo),
    });
  }

  listarContactos(id: string): Promise<Contacto[]> {
    return this.solicitar(`/clientes/${id}/contactos`, { headers: this.cabeceras() });
  }

  crearContacto(id: string, cuerpo: Omit<Contacto, 'id'>): Promise<Contacto> {
    return this.solicitar(`/clientes/${id}/contactos`, {
      method: 'POST',
      headers: this.cabeceras(true),
      body: JSON.stringify(cuerpo),
    });
  }

  obtenerCredito(id: string): Promise<CreditoCliente> {
    return this.solicitar(`/clientes/${id}/credito`, { headers: this.cabeceras() });
  }

  listarContratos(cliente: string): Promise<Pagina<Contrato>> {
    const p = new URLSearchParams({ cliente, page: '0', size: '100' });
    return this.solicitar(`/contratos?${p}`, { headers: this.cabeceras() });
  }

  crearContrato(cuerpo: {
    cliente_id: string;
    fecha_inicio: string;
    fecha_fin: string;
    monto: string;
    moneda: string;
  }): Promise<Contrato> {
    return this.solicitar('/contratos', {
      method: 'POST',
      headers: this.cabeceras(true),
      body: JSON.stringify(cuerpo),
    });
  }

  async listarFacturas(estado?: string): Promise<Pagina<Factura>> {
    if (!estado) {
      // La implementación actual exige al menos cliente o estado aunque el OpenAPI
      // documente ambos como opcionales. Se consultan los estados válidos y se unifican.
      const estados = ['emitida', 'pagada_parcial', 'pagada', 'vencida', 'anulada'];
      const paginas = await Promise.all(estados.map((valor) => this.listarFacturas(valor)));
      const contenido = paginas.flatMap((pagina) => pagina.contenido);
      return { contenido, page: 0, size: contenido.length, total_elementos: contenido.length };
    }
    const p = new URLSearchParams({ page: '0', size: '100' });
    p.set('estado', estado);
    return this.solicitar(`/facturas?${p}`, { headers: this.cabeceras() });
  }

  obtenerFactura(id: string): Promise<Factura> {
    return this.solicitar(`/facturas/${id}`, { headers: this.cabeceras() });
  }

  registrarCobro(
    id: string,
    cuerpo: { monto: string; fecha: string; referencia?: string },
  ): Promise<Cobro> {
    return this.solicitar(`/facturas/${id}/cobros`, {
      method: 'POST',
      headers: this.cabeceras(true),
      body: JSON.stringify(cuerpo),
    });
  }

  crearFactura(cuerpo: {
    cliente_id: string;
    campana_id: string;
    items: Omit<ItemFactura, 'numero' | 'subtotal'>[];
    moneda: string;
    fecha_vencimiento: string;
  }): Promise<Factura> {
    return this.solicitar('/facturas', {
      method: 'POST',
      headers: this.cabeceras(true),
      body: JSON.stringify(cuerpo),
    });
  }

  crearCotizacion(cuerpo: {
    cliente_id: string;
    items: Omit<ItemFactura, 'numero' | 'subtotal'>[];
    moneda: string;
  }): Promise<Cotizacion> {
    return this.solicitar('/cotizaciones', {
      method: 'POST',
      headers: this.cabeceras(true),
      body: JSON.stringify(cuerpo),
    });
  }

  obtenerRiesgoCliente(clienteId: string): Promise<RiesgoClienteMl | null> {
    return this.solicitar<RiesgoClienteMl>(`/ml/riesgo-cliente/${encodeURIComponent(clienteId)}`, {
      headers: this.cabeceras(),
    }).catch(() => null);
  }

  listarAlertasIa(): Promise<AlertaIaItem[]> {
    return this.solicitar<{ items: AlertaIaItem[] }>('/alertas', {
      headers: this.cabeceras(),
    })
      .then((r) => r.items ?? [])
      .catch(() => []);
  }

  listarAgentes(): Promise<AgenteIaItem[]> {
    return this.solicitar<{ items: AgenteIaItem[] }>('/agentes', {
      headers: this.cabeceras(),
    })
      .then((r) => r.items ?? [])
      .catch(() => []);
  }

  ejecutarAgente(id: string): Promise<EjecucionAgenteItem> {
    return this.solicitar<EjecucionAgenteItem>(`/agentes/${encodeURIComponent(id)}/ejecutar`, {
      method: 'POST',
      headers: this.cabeceras(true),
      body: JSON.stringify({ disparador: 'manual_portal' }),
    });
  }

  listarEjecucionesAgentes(): Promise<EjecucionAgenteItem[]> {
    return this.solicitar<{ items: EjecucionAgenteItem[] }>('/agentes/ejecuciones', {
      headers: this.cabeceras(),
    })
      .then((r) => r.items ?? [])
      .catch(() => []);
  }
}
