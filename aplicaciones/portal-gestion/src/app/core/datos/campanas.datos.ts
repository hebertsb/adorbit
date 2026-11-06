import { Injectable, inject, signal } from '@angular/core';
import { Campana, MedioCalendario, PiezaCreatividad } from './campana.modelo';
import { AutenticacionService } from '../auth/autenticacion.service';

const URL_GATEWAY_GRAPHQL = 'http://localhost:8000/graphql';
const URL_GATEWAY_REST = 'http://localhost:8000/api/v1';

@Injectable({ providedIn: 'root' })
export class CampanasDatos {
  private readonly auth = inject(AutenticacionService);

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

      if (!respuesta.ok) return;

      const resultado = await respuesta.json();
      if (resultado.data?.campanas && Array.isArray(resultado.data.campanas) && resultado.data.campanas.length > 0) {
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
      }
    } catch {
      // Si la pasarela está offline, permanece con la lista en memoria
    }
  }

  listar(): Campana[] {
    return this.listaCampanas();
  }

  buscarPorId(id: string): Campana | undefined {
    return this.listaCampanas().find((campana) => campana.id === id);
  }

  calendarioDe(idCampana: string): MedioCalendario[] {
    return this.calendarioPorCampana[idCampana] ?? [];
  }

  piezasDe(idCampana: string): PiezaCreatividad[] {
    return this.piezasPorCampana[idCampana] ?? [];
  }

  async crearCampana(datos: {
    nombre: string;
    clienteId?: string;
    descripcion?: string;
    fechaInicio: string;
    fechaFin: string;
    presupuestoTotal: number;
    moneda: 'BOB' | 'USD';
  }): Promise<Campana> {
    const idLocal = 'cmp-' + Date.now();
    const clienteIdReal = datos.clienteId || '11111111-1111-1111-1111-111111111111';

    // 1. Intento por mutación GraphQL hacia el Gateway
    try {
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
            clienteId: clienteIdReal,
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

      if (resGql.ok) {
        const cuerpo = await resGql.json();
        if (cuerpo.data?.crearCampana) {
          const campanaGql = cuerpo.data.crearCampana;
          const nuevaCampana: Campana = {
            id: campanaGql.id,
            codigoReferencia: `CMP-2026-${String(this.listaCampanas().length + 1).padStart(3, '0')}`,
            nombre: campanaGql.nombre,
            cliente: 'Cliente Anunciante',
            estado: 'borrador',
            presupuestoTotal: datos.presupuestoTotal,
            montoGastado: 0,
            moneda: datos.moneda,
            fechaInicio: campanaGql.fechaInicio,
            fechaFin: campanaGql.fechaFin,
          };
          this.listaCampanas.update((previas) => [nuevaCampana, ...previas]);
          return nuevaCampana;
        }
      }
    } catch {
      // Fallback a almacenamiento local si el backend no responde
    }

    // Fallback reactivo
    const campanaFallback: Campana = {
      id: idLocal,
      codigoReferencia: `CMP-2026-${String(this.listaCampanas().length + 1).padStart(3, '0')}`,
      nombre: datos.nombre,
      cliente: 'Cliente Demo',
      estado: 'borrador',
      presupuestoTotal: datos.presupuestoTotal,
      montoGastado: 0,
      moneda: datos.moneda,
      fechaInicio: datos.fechaInicio,
      fechaFin: datos.fechaFin,
    };
    this.listaCampanas.update((previas) => [campanaFallback, ...previas]);
    return campanaFallback;
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

      if (respuesta.ok || respuesta.status === 202) {
        const datos = await respuesta.json();
        // Actualizamos estado en UI
        this.listaCampanas.update((lista) =>
          lista.map((c) => (c.id === idCampana ? { ...c, estado: 'pendiente' } : c))
        );
        return {
          sagaId: datos.saga_id,
          estado: datos.estado,
          mensaje: datos.mensaje,
        };
      }
    } catch (e) {
      console.warn('Backend inaccesible al contratar, iniciando SAGA en modo simulado:', e);
    }

    // Fallback con sagaId simulado
    const sagaIdSimulada = 'saga-' + Date.now();
    this.listaCampanas.update((lista) =>
      lista.map((c) => (c.id === idCampana ? { ...c, estado: 'pendiente' } : c))
    );
    return {
      sagaId: sagaIdSimulada,
      estado: 'reservando_presupuesto',
      mensaje: 'Transacción SAGA iniciada en modo local',
    };
  }
}
