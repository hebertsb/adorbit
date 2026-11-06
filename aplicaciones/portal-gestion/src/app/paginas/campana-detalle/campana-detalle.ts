import { Component, computed, inject, signal } from '@angular/core';
import { CurrencyPipe, TitleCasePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Boton } from '../../compartido/boton/boton';
import { Tarjeta } from '../../compartido/tarjeta/tarjeta';
import { EtiquetaEstado, TonoEtiqueta } from '../../compartido/etiqueta-estado/etiqueta-estado';
import { IconoMedio } from '../../compartido/icono-medio/icono-medio';
import { CampanasDatos } from '../../core/datos/campanas.datos';
import { ETIQUETAS_ESTADO_CAMPANA, EstadoCampana } from '../../core/datos/campana.modelo';
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
export class CampanaDetalle {
  private readonly ruta = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly campanasDatos = inject(CampanasDatos);

  protected readonly contratando = signal(false);

  protected readonly etiquetas = ETIQUETAS_ESTADO_CAMPANA;
  protected readonly etiquetaMedio = ETIQUETA_MEDIO;
  protected readonly etiquetaEstadoMedio = ETIQUETA_ESTADO_MEDIO;
  protected readonly degradadoPieza = DEGRADADO_PIEZA;

  private readonly idCampana = this.ruta.snapshot.paramMap.get('id') ?? '';

  protected readonly campana = computed(() => this.campanasDatos.buscarPorId(this.idCampana));
  protected readonly calendario = computed(() => this.campanasDatos.calendarioDe(this.idCampana));
  protected readonly piezas = computed(() => this.campanasDatos.piezasDe(this.idCampana));

  // Regla real: no se contrata sin presupuesto ni sin al menos una pieza aprobada,
  // y "contratar" solo tiene sentido antes de que la campaña ya esté activa.
  protected readonly puedeContratar = computed(() => {
    const campana = this.campana();
    if (!campana) return false;
    const yaEnProceso = campana.estado === 'pendiente_aprobacion' || campana.estado === 'pendiente';
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
    this.contratando.set(true);
    const res = await this.campanasDatos.contratarCampana(this.idCampana);
    this.contratando.set(false);
    this.router.navigate(['/sagas', res.sagaId]);
  }
}
