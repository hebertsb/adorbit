import { ExcepcionDominio } from './errores';

export type EstadoPieza = 'en_revision' | 'aprobada' | 'bloqueada_saga' | 'rechazada';
export type TipoPieza = 'imagen' | 'video' | 'copy' | 'audio';

export interface BloqueoSaga {
  sagaId: string;
  campanaId: string;
  bloqueadoAt: Date;
  expiraAt: Date;
}

export interface ArchivoPieza {
  ruta: string;
  mime: string;
  tamano: number;
}

export interface ValidacionMarca {
  manualMarcaOk: boolean;
  detalles?: Record<string, unknown>;
  validadoAt: Date;
}

export interface PiezaProps {
  id: string;
  briefId: string;
  campanaId: string;
  nombre: string;
  tipo: TipoPieza;
  versionNumero: number;
  archivo?: ArchivoPieza;
  estado: EstadoPieza;
  estadoPrevio?: EstadoPieza;
  bloqueoSaga?: BloqueoSaga;
  validacionesMarca?: ValidacionMarca;
  version: number;
  creadoEn: Date;
  actualizadoEn: Date;
}

/**
 * Agregado Pieza. Reglas de negocio (ver CLAUDE.md "Reglas de negocio"):
 * una pieza bloqueada_saga no se edita ni se aprueba de nuevo; solo se desbloquea con
 * el saga_id que la bloqueo; (brief_id, version_numero) es unico (se garantiza con un
 * indice unico en Mongo, no aqui); una pieza rechazada no entra a una campana (una
 * version nueva es un documento Pieza nuevo, no una transicion sobre la rechazada).
 */
export class Pieza {
  private constructor(private readonly props: PiezaProps) {}

  static crear(datos: {
    id: string;
    briefId: string;
    campanaId: string;
    nombre: string;
    tipo: TipoPieza;
    versionNumero: number;
    archivo?: ArchivoPieza;
  }): Pieza {
    if (!datos.nombre || datos.nombre.length > 200) {
      throw new ExcepcionDominio('pieza_invalida', 'El nombre es obligatorio y debe tener hasta 200 caracteres');
    }
    if (datos.versionNumero < 1) {
      throw new ExcepcionDominio('pieza_invalida', 'version_numero debe ser >= 1');
    }
    const ahora = new Date();
    return new Pieza({
      id: datos.id,
      briefId: datos.briefId,
      campanaId: datos.campanaId,
      nombre: datos.nombre,
      tipo: datos.tipo,
      versionNumero: datos.versionNumero,
      archivo: datos.archivo,
      estado: 'en_revision',
      version: 1,
      creadoEn: ahora,
      actualizadoEn: ahora,
    });
  }

  static reconstituir(props: PiezaProps): Pieza {
    return new Pieza(props);
  }

  private exigirEditable(): void {
    if (this.props.estado === 'bloqueada_saga') {
      throw new ExcepcionDominio(
        'pieza_bloqueada',
        'Una pieza bloqueada por la SAGA no se puede editar ni aprobar de nuevo',
      );
    }
  }

  aprobar(): void {
    this.exigirEditable();
    this.props.estadoPrevio = this.props.estado;
    this.props.estado = 'aprobada';
    this.props.version += 1;
    this.props.actualizadoEn = new Date();
  }

  rechazar(): void {
    this.exigirEditable();
    this.props.estadoPrevio = this.props.estado;
    this.props.estado = 'rechazada';
    this.props.version += 1;
    this.props.actualizadoEn = new Date();
  }

  adjuntarArchivo(archivo: ArchivoPieza): void {
    this.exigirEditable();
    this.props.archivo = archivo;
    this.props.version += 1;
    this.props.actualizadoEn = new Date();
  }

  registrarValidacionMarca(validacion: Omit<ValidacionMarca, 'validadoAt'>): void {
    this.exigirEditable();
    this.props.validacionesMarca = { ...validacion, validadoAt: new Date() };
    this.props.version += 1;
    this.props.actualizadoEn = new Date();
  }

  get id(): string {
    return this.props.id;
  }

  get briefId(): string {
    return this.props.briefId;
  }

  get campanaId(): string {
    return this.props.campanaId;
  }

  get nombre(): string {
    return this.props.nombre;
  }

  get tipo(): TipoPieza {
    return this.props.tipo;
  }

  get versionNumero(): number {
    return this.props.versionNumero;
  }

  get archivo(): ArchivoPieza | undefined {
    return this.props.archivo;
  }

  get estado(): EstadoPieza {
    return this.props.estado;
  }

  get bloqueoSaga(): BloqueoSaga | undefined {
    return this.props.bloqueoSaga;
  }

  get validacionesMarca(): ValidacionMarca | undefined {
    return this.props.validacionesMarca;
  }

  get version(): number {
    return this.props.version;
  }

  get creadoEn(): Date {
    return this.props.creadoEn;
  }

  get actualizadoEn(): Date {
    return this.props.actualizadoEn;
  }

  aPropiedades(): PiezaProps {
    return { ...this.props };
  }
}
