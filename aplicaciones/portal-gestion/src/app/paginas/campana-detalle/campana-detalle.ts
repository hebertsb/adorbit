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

  // "Volver" usa el historial real del navegador (de dónde vino el usuario: dashboard,
  // creatividades, lista de campañas...) en vez de forzar siempre /campanas.
  volver(): void {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      this.ubicacion.back();
    } else {
      void this.router.navigateByUrl('/campanas');
    }
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

  async contratar(): Promise<void> {
    if (!this.puedeContratar() || this.contratando()) return;
    this.contratando.set(true);
    this.errorContratacion.set('');
    try {
      const res = await this.campanasDatos.contratarCampana(this.idCampana);
      await this.router.navigate(['/sagas', res.sagaId]);
    } catch (error) {
      this.errorContratacion.set(error instanceof Error ? error.message : 'No se pudo iniciar la contratación');
    } finally {
      this.contratando.set(false);
    }
  }
}
