import { Component, computed, inject, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Boton } from '../../compartido/boton/boton';
import { Tarjeta } from '../../compartido/tarjeta/tarjeta';
import { EtiquetaEstado, TonoEtiqueta } from '../../compartido/etiqueta-estado/etiqueta-estado';
import { CampanasDatos } from '../../core/datos/campanas.datos';
import { ETIQUETAS_ESTADO_CAMPANA, EstadoCampana } from '../../core/datos/campana.modelo';
import { CreatividadesDatos } from '../../core/datos/creatividades.datos';
import {
  AgenteIaItem,
  AlertaIaItem,
  EjecucionAgenteItem,
  GestionOperativaDatos,
} from '../../core/datos/gestion-operativa.datos';

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
  private readonly creatividades = inject(CreatividadesDatos);
  private readonly operaciones = inject(GestionOperativaDatos);
  protected readonly piezasPorAprobar = signal<number | null>(null);
  protected readonly agentes = signal<AgenteIaItem[]>([]);
  protected readonly ejecutandoAgente = signal<string | null>(null);
  protected readonly resultadoAgente = signal<Record<string, EjecucionAgenteItem>>({});
  protected readonly alertasIa = signal<AlertaIaItem[]>([]);

  protected readonly etiquetas = ETIQUETAS_ESTADO_CAMPANA;
  protected readonly tonoPorEstado = TONO_POR_ESTADO;

  protected readonly campanas = computed(() => this.campanasDatos.listar());

  protected readonly campanasActivas = computed(
    () => this.campanas().filter((c) => c.estado === 'activa').length,
  );

  protected readonly estadoCarga = this.campanasDatos.estadoCarga;
  protected readonly gastoBob = computed(() =>
    this.campanas()
      .filter((c) => c.moneda === 'BOB')
      .reduce((total, c) => total + Number(c.montoGastado), 0),
  );
  protected readonly gastoUsd = computed(() =>
    this.campanas()
      .filter((c) => c.moneda === 'USD')
      .reduce((total, c) => total + Number(c.montoGastado), 0),
  );

  protected readonly ultimasCampanas = computed(() => this.campanas().slice(0, 4));

  constructor() {
    void this.cargarPiezasPorAprobar();
    void this.cargarAgentesYAlertas();
  }

  private async cargarPiezasPorAprobar(): Promise<void> {
    try {
      const briefs = await this.creatividades.listarBriefs();
      const piezas = await Promise.all(
        briefs.map((brief) => this.creatividades.listarPiezas(brief.id)),
      );
      this.piezasPorAprobar.set(
        piezas.flat().filter((pieza) => pieza.estado === 'en_revision').length,
      );
    } catch {
      this.piezasPorAprobar.set(null);
    }
  }

  private async cargarAgentesYAlertas(): Promise<void> {
    try {
      const [agentes, alertas] = await Promise.all([
        this.operaciones.listarAgentes(),
        this.operaciones.listarAlertasIa(),
      ]);
      this.agentes.set(agentes);
      this.alertasIa.set(alertas);
    } catch {
      // Degradación silenciosa si ms-ia no responde
    }
  }

  protected async ejecutarAgente(id: string): Promise<void> {
    this.ejecutandoAgente.set(id);
    try {
      const res = await this.operaciones.ejecutarAgente(id);
      this.resultadoAgente.update((prev) => ({ ...prev, [id]: res }));
      await this.cargarAgentesYAlertas();
      await this.campanasDatos.sincronizarConBackend();
    } catch (err) {
      console.warn('Fallo al ejecutar agente:', err);
    } finally {
      this.ejecutandoAgente.set(null);
    }
  }

  protected formatearSalida(salida?: Record<string, unknown>): string {
    if (!salida) return 'Ejecución completada.';
    return JSON.stringify(salida, null, 2);
  }

  protected reintentar(): void {
    void this.campanasDatos.sincronizarConBackend();
    void this.cargarAgentesYAlertas();
  }

  protected readonly alertas = computed<Alerta[]>(() => {
    const formatoBs = new Intl.NumberFormat('es-BO', { minimumFractionDigits: 0 });
    const estadosFinales: EstadoCampana[] = ['finalizada', 'cancelada', 'rechazada'];
    const mapaAlertas = new Map<string, Alerta>();

    for (const a of this.alertasIa()) {
      const campana = a.campana_id ? this.campanasDatos.buscarPorId(a.campana_id) : undefined;
      const clave = a.campana_id || a.id;
      mapaAlertas.set(clave, {
        severidad: a.nivel === 'critico' ? 'alta' : 'aviso',
        titulo: a.mensaje || `Alerta: ${a.tipo_alerta || a.tipo_evento}`,
        detalle: campana ? `Campaña: ${campana.nombre} (${campana.cliente})` : 'Generada por agente inteligente',
        accion: 'Revisar campaña',
        rutaCampana: a.campana_id,
      });
    }

    for (const c of this.campanas()) {
      if (
        !estadosFinales.includes(c.estado) &&
        c.presupuestoTotal > 0 &&
        c.montoGastado / c.presupuestoTotal >= 0.85
      ) {
        if (!mapaAlertas.has(c.id)) {
          mapaAlertas.set(c.id, {
            severidad: 'alta',
            titulo: `Presupuesto de ${c.nombre} al ${Math.round((c.montoGastado / c.presupuestoTotal) * 100)}%`,
            detalle: `Cliente: ${c.cliente} · Consumo: ${c.moneda} ${formatoBs.format(c.montoGastado)} / ${c.moneda} ${formatoBs.format(c.presupuestoTotal)}`,
            accion: 'Revisar campaña',
            rutaCampana: c.id,
          });
        }
      }
    }

    return Array.from(mapaAlertas.values());
  });

  tonoDe(estado: EstadoCampana): TonoEtiqueta {
    return this.tonoPorEstado[estado];
  }
}
