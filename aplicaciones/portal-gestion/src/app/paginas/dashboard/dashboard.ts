import { Component, computed, inject } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Boton } from '../../compartido/boton/boton';
import { Tarjeta } from '../../compartido/tarjeta/tarjeta';
import { EtiquetaEstado, TonoEtiqueta } from '../../compartido/etiqueta-estado/etiqueta-estado';
import { CampanasDatos } from '../../core/datos/campanas.datos';
import { ETIQUETAS_ESTADO_CAMPANA, EstadoCampana } from '../../core/datos/campana.modelo';

const TONO_POR_ESTADO: Record<EstadoCampana, TonoEtiqueta> = {
  borrador: 'neutro',
  pendiente_aprobacion: 'aviso',
  pendiente: 'info',
  activa: 'ok',
  pausada: 'aviso',
  finalizada: 'neutro',
  cancelada: 'peligro',
  rechazada: 'peligro',
};

interface Alerta {
  severidad: 'alta' | 'aviso' | 'info';
  titulo: string;
  detalle: string;
  accion: string;
  rutaCampana?: string;
}

@Component({
  selector: 'ao-pagina-dashboard',
  imports: [CurrencyPipe, RouterLink, Boton, Tarjeta, EtiquetaEstado],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard {
  private readonly campanasDatos = inject(CampanasDatos);

  protected readonly etiquetas = ETIQUETAS_ESTADO_CAMPANA;
  protected readonly tonoPorEstado = TONO_POR_ESTADO;

  protected readonly campanas = computed(() => this.campanasDatos.listar());

  protected readonly campanasActivas = computed(
    () => this.campanas().filter((c) => c.estado === 'activa').length,
  );

  protected readonly presupuestoReservado = computed(() =>
    this.campanas().reduce((total, c) => total + c.montoGastado, 0),
  );

  protected readonly ultimasCampanas = computed(() => this.campanas().slice(0, 4));

  // Alerta de presupuesto al límite: calculada de verdad a partir de los datos (no inventada).
  // TODO Carlos/ms-ia: el resto de alertas (facturas, piezas) las genera el agente monitor
  // de campañas (evento AlertaCampana, ver documentacion/01-arquitectura.md) — acá van
  // como ejemplo mientras no existe esa integración.
  protected readonly alertas = computed<Alerta[]>(() => {
    const formatoBs = new Intl.NumberFormat('es-BO', { minimumFractionDigits: 0 });
    const estadosFinales: EstadoCampana[] = ['finalizada', 'cancelada', 'rechazada'];
    const alertasPresupuesto: Alerta[] = this.campanas()
      // Se excluyen los estados finales: una campaña ya finalizada con 100% gastado es
      // normal (cerró su presupuesto), no una alerta operativa.
      .filter(
        (c) =>
          !estadosFinales.includes(c.estado) && c.presupuestoTotal > 0 && c.montoGastado / c.presupuestoTotal >= 0.85,
      )
      .map((c) => ({
        severidad: 'alta',
        titulo: `Presupuesto de ${c.nombre} al ${Math.round((c.montoGastado / c.presupuestoTotal) * 100)}%`,
        detalle: `Cliente: ${c.cliente} · Consumo: Bs ${formatoBs.format(c.montoGastado)} / Bs ${formatoBs.format(c.presupuestoTotal)}`,
        accion: 'Revisar campaña',
        rutaCampana: c.id,
      }));

    return [
      ...alertasPresupuesto,
      {
        severidad: 'aviso',
        titulo: '1 pieza gráfica espera aprobación',
        detalle: 'Campaña: Lanzamiento Fibra Óptica 500M · Esperando revisión',
        accion: 'Ver piezas',
        rutaCampana: '1',
      },
      {
        severidad: 'info',
        titulo: 'SAGA de contratación completada con éxito',
        detalle: 'Presupuesto reservado y crédito validado',
        accion: 'Proceso finalizado',
      },
    ];
  });

  tonoDe(estado: EstadoCampana): TonoEtiqueta {
    return this.tonoPorEstado[estado];
  }
}
