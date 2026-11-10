import { Injectable, inject, signal } from '@angular/core';
import { Campana, DegradadoPieza, MedioCalendario, PiezaCreatividad } from './campana.modelo';
import { AutenticacionService } from '../auth/autenticacion.service';

const ES_DEV_LOCAL = typeof window !== 'undefined' && window.location.port === '4200';
const URL_GATEWAY_GRAPHQL = ES_DEV_LOCAL ? 'http://localhost:8000/graphql' : '/graphql';
const URL_GATEWAY_REST = ES_DEV_LOCAL ? 'http://localhost:8000/api/v1' : '/api/v1';

// MedioPublicitario (enum GraphQL, pasarela) -> medio local de calendario.modelo.ts.
// "redes" no tiene equivalente real todavia (el enum GraphQL no lo contempla).
const MAPA_MEDIO_GQL: Record<string, MedioCalendario['medio']> = {
  television: 'tv',
  radio: 'radio',
  prensa: 'prensa',
  digital: 'digital',
  valla_exterior: 'vallas',
};

// tipoMedio real de ms-creatividades (imagen/video/copy/audio) -> degradado visual.
const MAPA_DEGRADADO_TIPO: Record<string, DegradadoPieza> = {
  video: 'video',
  imagen: 'banner',
  copy: 'historia',
  audio: 'valla',
};

// EstadoPieza real de ms-creatividades (en_revision/aprobada/bloqueada_saga/rechazada)
// -> estado local de presentacion.
const MAPA_ESTADO_PIEZA_GQL: Record<string, PiezaCreatividad['estado']> = {
  en_revision: 'pendiente',
  aprobada: 'aprobada',
  bloqueada_saga: 'bloqueada',
  rechazada: 'rechazada',
};

@Injectable({ providedIn: 'root' })
export class CampanasDatos {
  private readonly auth = inject(AutenticacionService);
  readonly estadoCarga = signal<'cargando' | 'disponible' | 'error'>('cargando');

  private readonly listaCampanas = signal<Campana[]>([]);
  private readonly calendarioPorCampana: Record<string, MedioCalendario[]> = {};
  private readonly piezasPorCampana: Record<string, PiezaCreatividad[]> = {};

  constructor() {
    this.sincronizarConBackend();
  }

  private cabecerasAuth(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    const token = this.auth.token();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  async sincronizarConBackend(): Promise<void> {
    this.estadoCarga.set('cargando');
    const consultaGql = {
      query: `
        query ObtenerCampanas {
          campanas(limite: 50) {
            id
            clienteId
            nombre
            descripcion
            estado
            fechaInicio
            fechaFin
            version
            presupuesto {
              montoTotal
              montoGastado
              moneda
            }
            cliente {
              id
              razonSocial
            }
            piezas { id titulo tipoMedio estado urlArchivo version }
          }
        }
      `,
    };

    try {
      const respuesta = await fetch(URL_GATEWAY_GRAPHQL, {
        method: 'POST',
        headers: this.cabecerasAuth(),
        body: JSON.stringify(consultaGql),
      });

      if (!respuesta.ok) throw new Error('No se pudieron consultar las campañas');

      const resultado = await respuesta.json();
      if (resultado.errors?.length) throw new Error(resultado.errors[0].message);
      if (Array.isArray(resultado.data?.campanas)) {
        for (const c of resultado.data.campanas) {
          this.piezasPorCampana[c.id] = c.piezas.map((p: any) => ({
            titulo: p.titulo,
            nombreArchivo: p.urlArchivo || '',
            formato: p.tipoMedio,
            overlay: '',
            degradado: p.tipoMedio === 'video' ? 'video' : 'banner',
            version: p.version,
            estado:
              p.estado === 'en_revision'
                ? 'pendiente'
                : p.estado === 'bloqueada_saga'
                  ? 'bloqueada'
                  : p.estado,
            confianzaMarca: 0,
          }));
        }
        const mapeadas: Campana[] = resultado.data.campanas.map((c: any, index: number) => ({
          id: c.id,
          clienteId: c.clienteId,
          codigoReferencia: `CMP-2026-${String(index + 1).padStart(3, '0')}`,
          nombre: c.nombre,
          cliente: c.cliente?.razonSocial || `Cliente ${c.clienteId?.substring(0, 8)}`,
          estado: (c.estado as any) || 'borrador',
          presupuestoTotal: c.presupuesto?.montoTotal || 0,
          montoGastado: c.presupuesto?.montoGastado || 0,
          moneda: (c.presupuesto?.moneda as any) || 'BOB',
          fechaInicio: c.fechaInicio,
          fechaFin: c.fechaFin,
          version: c.version,
          descripcion: c.descripcion,
        }));

        this.listaCampanas.set(mapeadas);
        this.estadoCarga.set('disponible');
      } else {
        throw new Error('Respuesta de campañas inválida');
      }
    } catch {
      this.estadoCarga.set('error');
    }
  }

  listar(): Campana[] {
    return this.listaCampanas();
  }

  buscarPorId(id: string): Campana | undefined {
    return this.listaCampanas().find((campana) => campana.id === id);
  }

  /** Detalle real de una campana (campana + presupuesto + cliente + calendario +
   * piezas), via el resolver GraphQL Campana.piezas de la pasarela (que ya consulta
   * ms-creatividades real: briefs por campana_id + piezas de cada brief). Null si la
   * campana no existe o la pasarela no responde. */
  async obtenerDetalleReal(
    id: string,
  ): Promise<{
    campana: Campana;
    calendario: MedioCalendario[];
    piezas: PiezaCreatividad[];
  } | null> {
    const consulta = {
      query: `
        query DetalleCampana($id: ID!) {
          campana(id: $id) {
            id
            nombre
            descripcion
            estado
            fechaInicio
            fechaFin
            version
            presupuesto { montoTotal montoGastado moneda }
            cliente { id razonSocial }
            calendario { medio fechaInicio fechaFin costoEstimado estado }
            piezas { id titulo tipoMedio estado urlArchivo version }
          }
        }
      `,
      variables: { id },
    };

    try {
      const respuesta = await fetch(URL_GATEWAY_GRAPHQL, {
        method: 'POST',
        headers: this.cabecerasAuth(),
        body: JSON.stringify(consulta),
      });
      if (!respuesta.ok) return null;
      const cuerpo = await respuesta.json();
      const c = cuerpo.data?.campana;
      if (!c) return null;

      const campana: Campana = {
        id: c.id,
        clienteId: c.cliente?.id,
        codigoReferencia: this.buscarPorId(id)?.codigoReferencia || c.id.substring(0, 8),
        nombre: c.nombre,
        cliente: c.cliente?.razonSocial || `Cliente ${c.id.substring(0, 8)}`,
        estado: c.estado,
        presupuestoTotal: c.presupuesto?.montoTotal || 0,
        montoGastado: c.presupuesto?.montoGastado || 0,
        moneda: c.presupuesto?.moneda || 'BOB',
        fechaInicio: c.fechaInicio,
        fechaFin: c.fechaFin,
        version: c.version,
        descripcion: c.descripcion,
      };

      const calendario: MedioCalendario[] = (c.calendario || []).map((m: any) => ({
        medio: MAPA_MEDIO_GQL[m.medio as string] ?? 'digital',
        fechaInicio: m.fechaInicio,
        fechaFin: m.fechaFin,
        costo: m.costoEstimado,
        estado: m.estado,
      }));

      const piezas: PiezaCreatividad[] = (c.piezas || []).map((p: any) => {
        const degradado = MAPA_DEGRADADO_TIPO[p.tipoMedio as string] ?? 'banner';
        const nombreArchivo = p.urlArchivo ? p.urlArchivo.split('/').pop() : `${p.id}.bin`;
        return {
          titulo: p.titulo,
          nombreArchivo: nombreArchivo || p.id,
          formato: (p.tipoMedio as string)?.toUpperCase() || 'ARCHIVO',
          overlay: `v${p.version}`,
          degradado,
          version: p.version,
          estado: MAPA_ESTADO_PIEZA_GQL[p.estado as string] ?? 'pendiente',
          confianzaMarca: 0,
        };
      });

      return { campana, calendario, piezas };
    } catch {
      return null;
    }
  }

  calendarioDe(idCampana: string): MedioCalendario[] {
    return this.calendarioPorCampana[idCampana] ?? [];
  }

  piezasDe(idCampana: string): PiezaCreatividad[] {
    return this.piezasPorCampana[idCampana] ?? [];
  }

  /** Clientes reales de ms-clientes-crm (via proxy REST de la pasarela) para el selector del formulario. */
  async listarClientesReales(): Promise<{ id: string; razonSocial: string }[]> {
    try {
      const respuesta = await fetch(`${URL_GATEWAY_REST}/clientes`, {
        headers: this.cabecerasAuth(),
      });
      if (!respuesta.ok) return [];
      const cuerpo = await respuesta.json();
      const items = cuerpo.contenido ?? [];
      return items.map((c: any) => ({ id: c.id, razonSocial: c.razon_social }));
    } catch {
      return [];
    }
  }

  async crearCampana(datos: {
    nombre: string;
    clienteId: string;
    descripcion?: string;
    fechaInicio: string;
    fechaFin: string;
    presupuestoTotal: number;
    moneda: 'BOB' | 'USD';
  }): Promise<string> {
    const mutacion = {
      query: `
          mutation CrearCampana($input: CrearCampanaInput!) {
            crearCampana(input: $input) {
              id
              nombre
              descripcion
              estado
              fechaInicio
              fechaFin
              version
            }
          }
        `,
      variables: {
        input: {
          clienteId: datos.clienteId,
          nombre: datos.nombre,
          descripcion: datos.descripcion || '',
          fechaInicio: datos.fechaInicio,
          fechaFin: datos.fechaFin,
        },
      },
    };

    const resGql = await fetch(URL_GATEWAY_GRAPHQL, {
      method: 'POST',
      headers: this.cabecerasAuth(),
      body: JSON.stringify(mutacion),
    });

    if (!resGql.ok)
      throw new Error(
        'No se pudo confirmar la creación. Verifica la lista de campañas antes de volver a intentarlo.',
      );
    const cuerpo = await resGql.json();
    const id = cuerpo.data?.crearCampana?.id;
    if (!id)
      throw new Error(
        'No se pudo confirmar la creación. Verifica la lista de campañas antes de volver a intentarlo.',
      );

    return id;
  }

  /** Repite solamente la asignación de presupuesto con la misma clave y carga. */
  async asignarPresupuesto(
    id: string,
    monto: number,
    moneda: 'BOB' | 'USD',
    clave: string,
  ): Promise<void> {
    const respuesta = await fetch(`${URL_GATEWAY_REST}/campanas/${id}/presupuesto`, {
      method: 'POST',
      headers: { ...this.cabecerasAuth(), 'Idempotency-Key': clave },
      body: JSON.stringify({ monto_total: monto, moneda }),
    });
    if (!respuesta.ok) {
      const detalle = await respuesta.json().catch(() => null);
      throw new Error(detalle?.mensaje || `Error ${respuesta.status}`);
    }
  }

  async actualizarCampana(
    id: string,
    datos: {
      nombre: string;
      descripcion?: string;
      fechaInicio: string;
      fechaFin: string;
      version: number;
    },
    claveIdempotencia: string,
  ): Promise<void> {
    const respuesta = await fetch(`${URL_GATEWAY_REST}/campanas/${id}`, {
      method: 'PUT',
      headers: { ...this.cabecerasAuth(), 'Idempotency-Key': claveIdempotencia },
      body: JSON.stringify({
        nombre: datos.nombre,
        descripcion: datos.descripcion || '',
        fecha_inicio: datos.fechaInicio,
        fecha_fin: datos.fechaFin,
        version: datos.version,
      }),
    });
    if (!respuesta.ok) {
      const detalle = await respuesta.json().catch(() => null);
      if (respuesta.status === 409)
        throw new Error('La campaña cambió en otra sesión. Recarga el detalle antes de guardar.');
      throw new Error(detalle?.mensaje || 'No se pudo actualizar la campaña.');
    }
    await this.sincronizarConBackend();
  }

  async contratarCampana(
    idCampana: string,
  ): Promise<{ sagaId: string; estado: string; mensaje: string }> {
    try {
      const respuesta = await fetch(`${URL_GATEWAY_REST}/campanas/${idCampana}/contratar`, {
        method: 'POST',
        headers: {
          ...this.cabecerasAuth(),
          'Idempotency-Key': `contratar-${idCampana}-${Date.now()}`,
        },
      });

      if (respuesta.ok) {
        const datos = await respuesta.json();
        if (!datos.id) throw new Error('La respuesta no contiene el identificador de la SAGA');
        // Actualizamos estado en UI
        this.listaCampanas.update((lista) =>
          lista.map((c) => (c.id === idCampana ? { ...c, estado: 'pendiente' } : c)),
        );
        return {
          sagaId: datos.id,
          estado: datos.estado,
          mensaje: 'Contratación iniciada',
        };
      }
      const error = await respuesta.json().catch(() => null);
      throw new Error(error?.mensaje || `No se pudo contratar la campaña (${respuesta.status})`);
    } catch (e) {
      throw e instanceof Error ? e : new Error('No se pudo conectar con la pasarela');
    }
  }
}
