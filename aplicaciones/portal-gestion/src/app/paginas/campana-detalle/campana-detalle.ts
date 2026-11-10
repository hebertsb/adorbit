import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CurrencyPipe, Location, TitleCasePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Boton } from '../../compartido/boton/boton';
import { Tarjeta } from '../../compartido/tarjeta/tarjeta';
import { EtiquetaEstado, TonoEtiqueta } from '../../compartido/etiqueta-estado/etiqueta-estado';
import { IconoMedio } from '../../compartido/icono-medio/icono-medio';
import { CampanasDatos } from '../../core/datos/campanas.datos';
import {
  Campana,
  ETIQUETAS_ESTADO_CAMPANA,
  EstadoCampana,
  MedioCalendario,
  PiezaCreatividad,
} from '../../core/datos/campana.modelo';
import { DEGRADADO_PIEZA } from '../../core/datos/pieza-presentacion';

const TONO_ESTADO_CAMPANA: Record<EstadoCampana, TonoEtiqueta> = {
  borrador: 'neutro',
  pendiente_aprobacion: 'aviso',
  pendiente: 'info',
  activa: 'ok',
  pausada: 'aviso',
  finalizada: 'neutro',
  cancelada: 'peligro',
  rechazada: 'peligro',
};

const TONO_ESTADO_MEDIO: Record<string, TonoEtiqueta> = {
  planificado: 'aviso',
  confirmado: 'info',
  ejecutado: 'ok',
  cancelado: 'peligro',
};

const TONO_ESTADO_PIEZA: Record<string, TonoEtiqueta> = {
  aprobada: 'ok',
  pendiente: 'aviso',
  rechazada: 'peligro',
  bloqueada: 'neutro',
};

const ETIQUETA_ESTADO_MEDIO: Record<string, string> = {
  planificado: 'Planificado',
  confirmado: 'Confirmado',
  ejecutado: 'Ejecutado',
  cancelado: 'Cancelado',
};

const ETIQUETA_MEDIO: Record<string, string> = {
  tv: 'TV abierta',
  radio: 'Radio',
  digital: 'Digital',
  redes: 'Redes sociales',
  vallas: 'Vallas exteriores',
  prensa: 'Prensa',
};

@Component({
  selector: 'ao-pagina-campana-detalle',
  imports: [CurrencyPipe, TitleCasePipe, RouterLink, Boton, Tarjeta, EtiquetaEstado, IconoMedio],
  templateUrl: './campana-detalle.html',
  styleUrl: './campana-detalle.css',
})
export class CampanaDetalle implements OnInit {
  private readonly ruta = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly campanasDatos = inject(CampanasDatos);
  private readonly ubicacion = inject(Location);

  protected readonly contratando = signal(false);
  protected readonly errorContratacion = signal('');
  protected readonly cargandoDetalleReal = signal(true);
  protected readonly piezaVistaPrevia = signal<PiezaCreatividad | null>(null);
  protected readonly vistasGuardadas = signal<Record<string, string>>(this.cargarVistasGuardadas());

  protected readonly etiquetas = ETIQUETAS_ESTADO_CAMPANA;
  protected readonly etiquetaMedio = ETIQUETA_MEDIO;
  protected readonly etiquetaEstadoMedio = ETIQUETA_ESTADO_MEDIO;
  protected readonly degradadoPieza = DEGRADADO_PIEZA;

  private readonly idCampana = this.ruta.snapshot.paramMap.get('id') ?? '';

  // Datos reales (ms-campanas + ms-creatividades via el resolver GraphQL de la
  // pasarela). No se muestran datos ficticios cuando la lectura falla.
  private readonly detalleReal = signal<{
    campana: Campana;
    calendario: MedioCalendario[];
    piezas: PiezaCreatividad[];
  } | null>(null);

  protected readonly campana = computed(() => this.detalleReal()?.campana);
  protected readonly calendario = computed(() => this.detalleReal()?.calendario ?? []);
  protected readonly piezas = computed(() => this.detalleReal()?.piezas ?? []);

  async ngOnInit(): Promise<void> {
    this.cargandoDetalleReal.set(true);
    const detalle = await this.campanasDatos.obtenerDetalleReal(this.idCampana);
    this.detalleReal.set(detalle);
    this.cargandoDetalleReal.set(false);
  }

  // Regla real: no se contrata sin presupuesto ni sin al menos una pieza aprobada,
  // y "contratar" solo tiene sentido antes de que la campaña ya esté activa.
  protected readonly puedeContratar = computed(() => {
    const campana = this.campana();
    if (!campana) return false;
    const yaEnProceso = campana.estado === 'borrador' || campana.estado === 'pendiente_aprobacion';
    const tieneAprobadas = this.piezas().some((p) => p.estado === 'aprobada');
    return yaEnProceso && campana.presupuestoTotal > 0 && tieneAprobadas;
  });

  protected readonly porcentajeGastado = computed(() => {
    const campana = this.campana();
    if (!campana || campana.presupuestoTotal <= 0) return 0;
    return Math.round((campana.montoGastado / campana.presupuestoTotal) * 100);
  });

  protected readonly porcentajeDisponible = computed(() => 100 - this.porcentajeGastado());

  protected readonly saldoDisponible = computed(() => {
    const campana = this.campana();
    if (!campana) return 0;
    return campana.presupuestoTotal - campana.montoGastado;
  });

  protected readonly periodoVuelo = computed(() => {
    const campana = this.campana();
    if (!campana) return '';
    return `${this.formatearFecha(campana.fechaInicio)} – ${this.formatearFecha(campana.fechaFin)}`;
  });

  protected readonly diasRestantes = computed(() => {
    const campana = this.campana();
    if (!campana) return 0;
    const hoy = new Date();
    const fin = new Date(campana.fechaFin);
    const diferenciaMs = fin.getTime() - hoy.getTime();
    return Math.max(0, Math.ceil(diferenciaMs / (1000 * 60 * 60 * 24)));
  });

  // Navega siempre al listado de campañas para evitar bucles de historial con la pantalla de SAGA.
  volver(): void {
    void this.router.navigate(['/campanas']);
  }

  private formatearFecha(fechaIso: string): string {
    const [anio, mes, dia] = fechaIso.split('-');
    return `${dia}/${mes}/${anio}`;
  }

  fechaCorta(fechaIso: string): string {
    return this.formatearFecha(fechaIso);
  }

  tonoEstadoCampana(estado: EstadoCampana): TonoEtiqueta {
    return TONO_ESTADO_CAMPANA[estado];
  }

  tonoEstadoMedio(estado: string): TonoEtiqueta {
    return TONO_ESTADO_MEDIO[estado] ?? 'neutro';
  }

  tonoEstadoPieza(estado: string): TonoEtiqueta {
    return TONO_ESTADO_PIEZA[estado] ?? 'neutro';
  }

  private cargarVistasGuardadas(): Record<string, string> {
    try {
      const raw = localStorage.getItem('adorbit:vistas_previas_piezas_v1');
      return raw ? (JSON.parse(raw) as Record<string, string>) : {};
    } catch {
      return {};
    }
  }

  private urlPublicaStorage(ruta?: string): string | null {
    if (!ruta) return null;
    if (ruta.startsWith('http://') || ruta.startsWith('https://') || ruta.startsWith('data:')) {
      return ruta;
    }
    if (ruta.startsWith('piezas/')) {
      return `https://gbsxuruxkowamugicucb.supabase.co/storage/v1/object/public/piezas-creatividades/${ruta}`;
    }
    return null;
  }

  protected imagenPersonalizada(pieza: PiezaCreatividad): string | null {
    const urlStorage = this.urlPublicaStorage(pieza.urlArchivo);
    if (urlStorage && /\.(png|jpe?g|webp|gif|svg)$/i.test(urlStorage)) {
      return urlStorage;
    }
    if (!pieza.id) return null;
    return this.vistasGuardadas()[pieza.id] ?? null;
  }

  protected videoPersonalizado(pieza: PiezaCreatividad): string | null {
    const urlStorage = this.urlPublicaStorage(pieza.urlArchivo);
    if (urlStorage && /\.(mp4|webm|mov)$/i.test(urlStorage)) {
      return urlStorage;
    }
    return null;
  }

  protected abrirVistaPrevia(pieza: PiezaCreatividad): void {
    this.piezaVistaPrevia.set(pieza);
  }

  protected cerrarVistaPrevia(): void {
    this.piezaVistaPrevia.set(null);
  }

  protected codigoPieza(pieza: PiezaCreatividad): string {
    const raw = (pieza.id ?? pieza.nombreArchivo).replaceAll('-', '').toUpperCase();
    const cola = raw.replace(/^0+/, '') || raw.slice(-4);
    return `PZA-2026-${cola.slice(-4).padStart(3, '0')}`;
  }

  protected nombreArchivoLegible(pieza: PiezaCreatividad): string {
    if (
      pieza.nombreArchivo &&
      !/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}/i.test(pieza.nombreArchivo)
    ) {
      return pieza.nombreArchivo;
    }
    const base = pieza.titulo
      .replace(/\s*\(v\d+\)/gi, '')
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '')
      .slice(0, 34);
    const ext =
      pieza.degradado === 'video' ? 'mp4' : pieza.degradado === 'valla' ? 'pdf' : 'png';
    return `${base}_v${pieza.version}.${ext}`;
  }

  protected dimensionPieza(pieza: PiezaCreatividad): string {
    if (pieza.degradado === 'video') return '16:9 HD · 1080p';
    if (pieza.degradado === 'historia') return '1080 × 1920 (9:16)';
    if (pieza.degradado === 'valla') return '8 × 3 m (Exterior)';
    return '300 × 250 (Display)';
  }

  async contratar(): Promise<void> {
    if (!this.puedeContratar() || this.contratando()) return;
    this.contratando.set(true);
    this.errorContratacion.set('');
    try {
      const res = await this.campanasDatos.contratarCampana(this.idCampana);
      await this.router.navigate(['/sagas', res.sagaId], { replaceUrl: true });
    } catch (error) {
      this.errorContratacion.set(error instanceof Error ? error.message : 'No se pudo iniciar la contratación');
    } finally {
      this.contratando.set(false);
    }
  }
}
