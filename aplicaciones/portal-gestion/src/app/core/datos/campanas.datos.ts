import { Injectable, inject, signal } from '@angular/core';
import { Campana, DegradadoPieza, MedioCalendario, PiezaCreatividad } from './campana.modelo';
import { AutenticacionService } from '../auth/autenticacion.service';

const URL_GATEWAY_GRAPHQL = 'http://localhost:8000/graphql';
const URL_GATEWAY_REST = 'http://localhost:8000/api/v1';

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

  private readonly listaCampanas = signal<Campana[]>([
    {
      id: '1',
      codigoReferencia: 'CMP-2026-001',
      nombre: 'Lanzamiento Fibra Óptica 500M',
      cliente: 'Telecom Altiplano',
      estado: 'activa',
      presupuestoTotal: 64000,
      montoGastado: 41600,
      moneda: 'BOB',
      fechaInicio: '2026-03-01',
      fechaFin: '2026-04-30',
    },
    {
      id: '2',
      codigoReferencia: 'CMP-2026-002',
      nombre: 'Campaña Institucional Créditos',
      cliente: 'Tienda Andina',
      estado: 'pendiente_aprobacion',
      presupuestoTotal: 52500,
      montoGastado: 0,
      moneda: 'BOB',
      fechaInicio: '2026-04-01',
      fechaFin: '2026-05-15',
    },
    {
      id: '3',
      codigoReferencia: 'CMP-2026-003',
      nombre: 'Promo Carnaval & Verano 2026',
      cliente: 'Distribuidora Illimani',
      estado: 'pausada',
      presupuestoTotal: 50000,
      montoGastado: 45000,
      moneda: 'BOB',
      fechaInicio: '2026-02-20',
      fechaFin: '2026-03-25',
    },
    {
      id: '4',
      codigoReferencia: 'CMP-2026-004',
      nombre: 'Expansión B2B Santa Cruz',
      cliente: 'Lácteos del Valle',
      estado: 'borrador',
      presupuestoTotal: 18000,
      montoGastado: 0,
      moneda: 'BOB',
      fechaInicio: '2026-05-15',
      fechaFin: '2026-06-10',
    },
  ]);

  private readonly calendarioPorCampana: Record<string, MedioCalendario[]> = {
    '1': [
      { medio: 'digital', fechaInicio: '2026-03-01', fechaFin: '2026-04-30', costo: 24000, estado: 'ejecutado' },
      { medio: 'redes', fechaInicio: '2026-03-05', fechaFin: '2026-04-25', costo: 18000, estado: 'ejecutado' },
      { medio: 'tv', fechaInicio: '2026-03-15', fechaFin: '2026-04-15', costo: 16000, estado: 'confirmado' },
      { medio: 'vallas', fechaInicio: '2026-04-01', fechaFin: '2026-04-30', costo: 6000, estado: 'planificado' },
    ],
    '2': [
      { medio: 'digital', fechaInicio: '2026-04-01', fechaFin: '2026-05-15', costo: 20000, estado: 'confirmado' },
      { medio: 'radio', fechaInicio: '2026-04-10', fechaFin: '2026-05-01', costo: 15000, estado: 'confirmado' },
      { medio: 'prensa', fechaInicio: '2026-04-15', fechaFin: '2026-05-10', costo: 17500, estado: 'planificado' },
    ],
  };

  private readonly piezasPorCampana: Record<string, PiezaCreatividad[]> = {
    '1': [
      {
        titulo: 'Spot Video 30s - Fibra Alta Velocidad',
        nombreArchivo: 'spot-video-30s-fibra.mp4',
        formato: 'MP4 · 1080p (Full HD)',
        overlay: '0:30',
        degradado: 'video',
        version: 2,
        estado: 'aprobada',
        confianzaMarca: 0.98,
      },
      {
        titulo: 'Banner Display - Promo Hogar',
        nombreArchivo: 'banner-display-promo-hogar.jpg',
        formato: 'JPG · 300x250',
        overlay: '300×250',
        degradado: 'banner',
        version: 1,
        estado: 'pendiente',
        confianzaMarca: 0.92,
      },
    ],
    '2': [
      {
        titulo: 'Banner Institucional - Línea de Crédito PYME',
        nombreArchivo: 'banner-institucional-credito-pyme.jpg',
        formato: 'JPG · 1080x1080',
        overlay: '1:1',
        degradado: 'banner',
        version: 1,
        estado: 'aprobada',
        confianzaMarca: 0.95,
      },
    ],
  };

  constructor() {
    this.listaCampanas.set([]);
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
            titulo: p.titulo, nombreArchivo: p.urlArchivo || '', formato: p.tipoMedio,
            overlay: '', degradado: p.tipoMedio === 'video' ? 'video' : 'banner',
            version: p.version, estado: p.estado === 'en_revision' ? 'pendiente' :
              p.estado === 'bloqueada_saga' ? 'bloqueada' : p.estado, confianzaMarca: 0,
          }));
        }
        const mapeadas: Campana[] = resultado.data.campanas.map((c: any, index: number) => ({
          id: c.id,
          codigoReferencia: `CMP-2026-${String(index + 1).padStart(3, '0')}`,
          nombre: c.nombre,
          cliente: c.cliente?.razonSocial || `Cliente ${c.clienteId?.substring(0, 8)}`,
          estado: (c.estado as any) || 'borrador',
          presupuestoTotal: c.presupuesto?.montoTotal || 0,
          montoGastado: c.presupuesto?.montoGastado || 0,
          moneda: (c.presupuesto?.moneda as any) || 'BOB',
          fechaInicio: c.fechaInicio,
          fechaFin: c.fechaFin,
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
   * campana no existe o la pasarela no responde -- la pantalla cae a los datos
   * locales/mock en ese caso. */
  async obtenerDetalleReal(
    id: string
  ): Promise<{ campana: Campana; calendario: MedioCalendario[]; piezas: PiezaCreatividad[] } | null> {
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
        codigoReferencia: this.buscarPorId(id)?.codigoReferencia || c.id.substring(0, 8),
        nombre: c.nombre,
        cliente: c.cliente?.razonSocial || `Cliente ${c.id.substring(0, 8)}`,
        estado: c.estado,
        presupuestoTotal: c.presupuesto?.montoTotal || 0,
        montoGastado: c.presupuesto?.montoGastado || 0,
        moneda: c.presupuesto?.moneda || 'BOB',
        fechaInicio: c.fechaInicio,
        fechaFin: c.fechaFin,
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
      const respuesta = await fetch(`${URL_GATEWAY_REST}/clientes`, { headers: this.cabecerasAuth() });
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
  }): Promise<void> {
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

      if (!resGql.ok) throw new Error('No se pudo confirmar la creación. Verifica la lista de campañas antes de volver a intentarlo.');
      const cuerpo = await resGql.json();
      const id = cuerpo.data?.crearCampana?.id;
      if (!id) throw new Error('No se pudo confirmar la creación. Verifica la lista de campañas antes de volver a intentarlo.');

      try {
        const respuesta = await fetch(`${URL_GATEWAY_REST}/campanas/${id}/presupuesto`, {
          method: 'POST',
          headers: {
            ...this.cabecerasAuth(),
            'Idempotency-Key': `presupuesto-${id}-${Date.now()}`,
          },
          body: JSON.stringify({ monto_total: datos.presupuestoTotal, moneda: datos.moneda }),
        });
        if (!respuesta.ok) throw new Error();
      } catch {
        throw new Error(`La campaña ${id} fue creada, pero no se pudo confirmar su presupuesto. Verifica su estado antes de continuar; no vuelvas a crearla.`);
      }
      await this.sincronizarConBackend();
  }

  async contratarCampana(idCampana: string): Promise<{ sagaId: string; estado: string; mensaje: string }> {
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
          lista.map((c) => (c.id === idCampana ? { ...c, estado: 'pendiente' } : c))
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
