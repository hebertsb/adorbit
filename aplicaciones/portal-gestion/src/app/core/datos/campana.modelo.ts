export type EstadoCampana =
  | 'borrador'
  | 'pendiente_aprobacion'
  | 'pendiente'
  | 'activa'
  | 'pausada'
  | 'finalizada'
  | 'cancelada'
  | 'rechazada';

export const ETIQUETAS_ESTADO_CAMPANA: Record<EstadoCampana, string> = {
  borrador: 'Borrador',
  pendiente_aprobacion: 'Pendiente aprobación',
  pendiente: 'Pendiente',
  activa: 'Activa',
  pausada: 'Pausada',
  finalizada: 'Finalizada',
  cancelada: 'Cancelada',
  rechazada: 'Rechazada',
};

export interface Campana {
  id: string;
  clienteId?: string;
  codigoReferencia: string;
  nombre: string;
  cliente: string;
  estado: EstadoCampana;
  presupuestoTotal: number;
  montoGastado: number;
  moneda: 'BOB' | 'USD';
  fechaInicio: string;
  fechaFin: string;
  version?: number;
  descripcion?: string;
}

export interface MedioCalendario {
  medio: 'tv' | 'radio' | 'digital' | 'redes' | 'vallas' | 'prensa';
  fechaInicio: string;
  fechaFin: string;
  costo: number;
  estado: 'planificado' | 'confirmado' | 'ejecutado' | 'cancelado';
}

export type DegradadoPieza = 'video' | 'banner' | 'historia' | 'valla';

export interface PiezaCreatividad {
  id?: string;
  titulo: string;
  nombreArchivo: string;
  urlArchivo?: string;
  formato: string;
  overlay: string;
  degradado: DegradadoPieza;
  version: number;
  estado: 'aprobada' | 'pendiente' | 'rechazada' | 'bloqueada';
  confianzaMarca: number;
  observacion?: string;
}
