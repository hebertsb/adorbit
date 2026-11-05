import { Injectable, signal } from '@angular/core';
import { Campana, MedioCalendario, PiezaCreatividad } from './campana.modelo';

// TODO Roly: este servicio entrega datos simulados. Reemplazar cada método por una
// query/mutation real contra el gateway GraphQL federado (ver documentacion/03-contratos.md).
// La forma de los datos (Campana, MedioCalendario, PiezaCreatividad) ya respeta el contrato,
// así que el resto de la app no debería necesitar cambios al conectar el backend real.
@Injectable({ providedIn: 'root' })
export class CampanasDatos {
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
    {
      id: '5',
      codigoReferencia: 'CMP-2026-005',
      nombre: 'Campaña Depósitos a Plazo Fijo',
      cliente: 'Banco Los Andes',
      estado: 'pendiente',
      presupuestoTotal: 35000,
      montoGastado: 3500,
      moneda: 'BOB',
      fechaInicio: '2026-06-01',
      fechaFin: '2026-07-20',
    },
    {
      id: '6',
      codigoReferencia: 'CMP-2026-006',
      nombre: 'Lanzamiento Café Gourmet Altura',
      cliente: 'Café Yungas',
      estado: 'finalizada',
      presupuestoTotal: 22000,
      montoGastado: 22000,
      moneda: 'BOB',
      fechaInicio: '2026-01-10',
      fechaFin: '2026-02-28',
    },
    {
      id: '7',
      codigoReferencia: 'CMP-2026-007',
      nombre: 'Cyber Days Retail 2026',
      cliente: 'Tienda Andina',
      estado: 'cancelada',
      presupuestoTotal: 15000,
      montoGastado: 4200,
      moneda: 'BOB',
      fechaInicio: '2025-12-20',
      fechaFin: '2026-01-15',
    },
    {
      id: '8',
      codigoReferencia: 'CMP-2026-008',
      nombre: 'Festival Culinario Altiplano',
      cliente: 'Lácteos del Valle',
      estado: 'rechazada',
      presupuestoTotal: 28000,
      montoGastado: 0,
      moneda: 'BOB',
      fechaInicio: '2026-01-20',
      fechaFin: '2026-02-05',
    },
  ]);

  private readonly calendarioPorCampana: Record<string, MedioCalendario[]> = {
    '1': [
      { medio: 'digital', fechaInicio: '2026-03-01', fechaFin: '2026-04-30', costo: 24000, estado: 'ejecutado' },
      { medio: 'redes', fechaInicio: '2026-03-05', fechaFin: '2026-04-25', costo: 18000, estado: 'ejecutado' },
      { medio: 'tv', fechaInicio: '2026-03-15', fechaFin: '2026-04-15', costo: 16000, estado: 'confirmado' },
      { medio: 'vallas', fechaInicio: '2026-04-01', fechaFin: '2026-04-30', costo: 6000, estado: 'planificado' },
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
      {
        titulo: 'Story Carrusel IG - Instalación Gratis',
        nombreArchivo: 'story-carrusel-ig-instalacion.png',
        formato: 'PNG · 1080x1920 (x3)',
        overlay: '9:16',
        degradado: 'historia',
        version: 3,
        estado: 'bloqueada',
        confianzaMarca: 0.96,
      },
      {
        titulo: 'Valla Carretera 8x3m - Conexión Total',
        nombreArchivo: 'valla-carretera-8x3m.pdf',
        formato: 'PDF · Vectorial Curvas',
        overlay: '8×3 m',
        degradado: 'valla',
        version: 1,
        estado: 'rechazada',
        confianzaMarca: 0.64,
        observacion:
          'Baja coincidencia de paleta corporativa. Reemplazar violeta secundario por el tono institucional reglamentario.',
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
}
