import { ExcepcionDominio } from './errores';

export type EstadoBrief = 'recibido' | 'en_creacion' | 'en_revision' | 'aprobado' | 'rechazado';

export interface BriefProps {
  id: string;
  campanaId: string;
  clienteId?: string;
  titulo: string;
  descripcion?: string;
  estado: EstadoBrief;
  version: number;
  creadoEn: Date;
  actualizadoEn: Date;
}

/** Agregado Brief. Se crea en estado "recibido"; el flujo de avance de estado llega via eventos de ms-ia/ms-campanas (fuera de alcance de esta tarea). */
export class Brief {
  private constructor(private readonly props: BriefProps) {}

  static crear(datos: {
    id: string;
    campanaId: string;
    clienteId?: string;
    titulo: string;
    descripcion?: string;
  }): Brief {
    if (!datos.campanaId) {
      throw new ExcepcionDominio('brief_invalido', 'campana_id es obligatorio');
    }
    if (!datos.titulo || datos.titulo.length > 200) {
      throw new ExcepcionDominio(
        'brief_invalido',
        'El titulo es obligatorio y debe tener hasta 200 caracteres',
      );
    }
    if (datos.descripcion && datos.descripcion.length > 2000) {
      throw new ExcepcionDominio('brief_invalido', 'La descripcion no puede superar 2000 caracteres');
    }
    const ahora = new Date();
    return new Brief({
      id: datos.id,
      campanaId: datos.campanaId,
      clienteId: datos.clienteId,
      titulo: datos.titulo,
      descripcion: datos.descripcion,
      estado: 'recibido',
      version: 1,
      creadoEn: ahora,
      actualizadoEn: ahora,
    });
  }

  static reconstituir(props: BriefProps): Brief {
    return new Brief(props);
  }

  get id(): string {
    return this.props.id;
  }

  get campanaId(): string {
    return this.props.campanaId;
  }

  get clienteId(): string | undefined {
    return this.props.clienteId;
  }

  get titulo(): string {
    return this.props.titulo;
  }

  get descripcion(): string | undefined {
    return this.props.descripcion;
  }

  get estado(): EstadoBrief {
    return this.props.estado;
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

  aPropiedades(): BriefProps {
    return { ...this.props };
  }
}
