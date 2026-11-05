import type { Brief } from './brief';
import type { BloqueoSaga, Pieza } from './pieza';

/**
 * Los puertos no conocen Mongo: una transaccion se pasa como `unknown` (el adaptador
 * la castea a ClientSession). Mantiene domain/use-cases libres de dependencias de
 * infraestructura — ver README "los casos de uso no conocen Next.js ni Mongo".
 */
export type Sesion = unknown;

export interface ResultadoPagina<T> {
  items: T[];
  total: number;
  pagina: number;
  tamano: number;
}

export interface BriefRepositorio {
  guardar(brief: Brief, sesion?: Sesion): Promise<void>;
  buscarPorId(id: string): Promise<Brief | null>;
  listar(
    filtro: { campanaId?: string; clienteId?: string },
    pagina: number,
    tamano: number,
  ): Promise<ResultadoPagina<Brief>>;
}

export interface PiezaRepositorio {
  guardar(pieza: Pieza, sesion?: Sesion): Promise<void>;
  buscarPorId(id: string): Promise<Pieza | null>;
  listarPorBrief(briefId: string): Promise<Pieza[]>;
  contarVersiones(briefId: string): Promise<number>;

  /** Bloqueo atomico (filtro estado:"aprobada"); devuelve los ids efectivamente bloqueados (vacio = el paso falla). */
  bloquearAprobadasDeCampana(campanaId: string, bloqueo: BloqueoSaga, sesion?: Sesion): Promise<string[]>;
  /** Desbloqueo atomico — solo libera bloqueos de ese saga_id (compensacion). */
  desbloquearDeCampana(campanaId: string, sagaId: string, sesion?: Sesion): Promise<string[]>;
  /** Job de expiracion: libera bloqueos vencidos, devuelve los ids liberados. */
  liberarBloqueosVencidos(ahora: Date): Promise<string[]>;
}

export type ResultadoValidacion = 'ok' | 'observada' | 'rechazada';
export type OrigenValidacion = 'manual' | 'ia';

export interface RegistroValidacionAuditoria {
  piezaId: string;
  resultado: ResultadoValidacion;
  origen: OrigenValidacion;
  usuario?: string;
  detalles?: Record<string, unknown>;
  creadoEn: Date;
}

export interface ValidacionAuditoriaRepositorio {
  registrar(registro: RegistroValidacionAuditoria, sesion?: Sesion): Promise<void>;
  listarPorPieza(piezaId: string): Promise<RegistroValidacionAuditoria[]>;
}

export type EstadoIdempotencia = 'en_curso' | 'completado';

export interface RegistroIdempotencia {
  clave: string;
  huellaSolicitud: string;
  estado: EstadoIdempotencia;
  /** JSON con los datos minimos para reconstruir la respuesta en un replay (ej. { "brief_id": "..." }). */
  respuesta?: string;
  creadoEn: Date;
  venceEn: Date;
}

export interface IdempotenciaRepositorio {
  buscarPorClave(clave: string): Promise<RegistroIdempotencia | null>;
  /** Inserta dentro de la misma transaccion que la escritura de negocio. */
  crear(registro: RegistroIdempotencia, sesion?: Sesion): Promise<void>;
}

/** Evento de dominio a encolar en el outbox — mismo sobre que usa todo el proyecto (ver documentacion/03-contratos.md). */
export interface EventoSalida {
  id: string;
  tipoAgregado: string;
  agregadoId: string;
  tipoEvento: string;
  correlacionId: string;
  carga: Record<string, unknown>;
}

export interface RegistroOutbox extends EventoSalida {
  publicado: boolean;
  creadoEn: Date;
  publicadoEn?: Date;
}

export interface OutboxRepositorio {
  /** Encola dentro de la misma transaccion que la escritura de negocio. */
  encolar(evento: EventoSalida, sesion?: Sesion): Promise<void>;
  listarPendientes(limite: number): Promise<RegistroOutbox[]>;
  marcarPublicado(id: string): Promise<void>;
}

export interface SolicitudSubidaArchivo {
  ruta: string;
  urlSubida: string;
  token?: string;
}

/** URLs firmadas de subida (Supabase Storage/S3) — la BD solo guarda la ruta, nunca el archivo. */
export interface AlmacenamientoPuerto {
  crearUrlSubida(ruta: string): Promise<SolicitudSubidaArchivo>;
}

/**
 * Puerto de frontera transaccional: los casos de uso piden "ejecutar esto de forma
 * atomica" sin saber que hay una sesion de Mongo detras (eso lo resuelve el adaptador
 * inyectado desde app/api/, que es la unica capa que conoce la infraestructura real).
 */
export interface UnidadDeTrabajo {
  ejecutar<T>(trabajo: (sesion: Sesion) => Promise<T>): Promise<T>;
}
