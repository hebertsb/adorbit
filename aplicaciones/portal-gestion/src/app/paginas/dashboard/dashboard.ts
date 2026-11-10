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

const NOMBRES_AGENTES: Record<string, string> = {
  monitor_campanas: 'Monitor de Campañas',
  cobranza: 'Agente de Cobranza',
  agente_vision: 'Agente de Visión (DL)',
  consultor_ejecutivo_nl: 'Consultor Ejecutivo IA (MCP)',
};

interface Alerta {
  severidad: 'alta' | 'aviso' | 'info';
  titulo: string;
  detalle: string;
  accion: string;
  rutaCampana?: string;
}

interface MetricaMiniReporte {
  etiqueta: string;
  valor: string;
  tono?: 'ok' | 'aviso' | 'peligro';
}

interface MiniReporteAgente {
  resumen: string;
  metricas: MetricaMiniReporte[];
  detalles: string[];
  hora: string;
}

interface ToastAgente {
  tipo: 'ok' | 'error';
  titulo: string;
  mensaje: string;
  subtexto?: string;
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
  private temporizadorToast: ReturnType<typeof setTimeout> | null = null;

  protected readonly piezasPorAprobar = signal<number | null>(null);
  protected readonly agentes = signal<AgenteIaItem[]>([]);
  protected readonly ejecutandoAgente = signal<string | null>(null);
  protected readonly resultadoAgente = signal<Record<string, EjecucionAgenteItem>>({});
  protected readonly errorAgente = signal<Record<string, string>>({});
  protected readonly toastAgente = signal<ToastAgente | null>(null);
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

  protected nombreAgente(nombre: string): string {
    return NOMBRES_AGENTES[nombre] ?? nombre.replaceAll('_', ' ');
  }

  protected async ejecutarAgente(agente: AgenteIaItem): Promise<void> {
    const nombre = this.nombreAgente(agente.nombre);
    this.ejecutandoAgente.set(agente.id);
    this.errorAgente.update((prev) => {
      const copia = { ...prev };
      delete copia[agente.id];
      return copia;
    });
    try {
      const res = await this.operaciones.ejecutarAgente(agente.id);
      this.resultadoAgente.update((prev) => ({ ...prev, [agente.id]: res }));
      const mini = this.miniReporte(agente.nombre, res);
      this.mostrarToast({
        tipo: 'ok',
        titulo: `${nombre} completado`,
        mensaje: mini.resumen,
        subtexto: 'Mini-reporte actualizado y notificación enviada por WhatsApp y Correo.',
      });
      await this.cargarAgentesYAlertas();
      await this.campanasDatos.sincronizarConBackend();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'No se pudo ejecutar el agente.';
      this.errorAgente.update((prev) => ({ ...prev, [agente.id]: msg }));
      this.mostrarToast({
        tipo: 'error',
        titulo: `Error en ${nombre}`,
        mensaje: msg,
      });
    } finally {
      this.ejecutandoAgente.set(null);
    }
  }

  protected cerrarToast(): void {
    if (this.temporizadorToast) {
      clearTimeout(this.temporizadorToast);
      this.temporizadorToast = null;
    }
    this.toastAgente.set(null);
  }

  private mostrarToast(toast: ToastAgente): void {
    if (this.temporizadorToast) clearTimeout(this.temporizadorToast);
    this.toastAgente.set(toast);
    this.temporizadorToast = setTimeout(() => {
      this.toastAgente.set(null);
      this.temporizadorToast = null;
    }, 7000);
  }

  protected miniReporte(nombreAgente: string, res: EjecucionAgenteItem): MiniReporteAgente {
    const s = (res.salida ?? {}) as Record<string, any>;
    const fecha = res.finished_at || res.started_at;
    const hora = fecha
      ? new Intl.DateTimeFormat('es-BO', { hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(new Date(fecha))
      : 'Ahora';

    if (nombreAgente === 'monitor_campanas') {
      const alertas = Array.isArray(s['alertas_generadas']) ? s['alertas_generadas'] : [];
      return {
        hora,
        resumen:
          typeof s['resumen_texto'] === 'string'
            ? s['resumen_texto']
            : `Se revisaron ${s['campanas_revisadas'] ?? 0} campañas activas.`,
        metricas: [
          { etiqueta: 'Campañas revisadas', valor: String(s['campanas_revisadas'] ?? 0), tono: 'ok' },
          {
            etiqueta: 'Alertas generadas',
            valor: String(alertas.length),
            tono: alertas.length > 0 ? 'aviso' : 'ok',
          },
        ],
        detalles: alertas.slice(0, 3).map((a: any) => `${a.nombre ?? 'Campaña'}: ${a.detalle ?? a.tipo}`),
      };
    }

    if (nombreAgente === 'cobranza') {
      const vencidas = Number(s['total_vencidas'] ?? (Array.isArray(s['facturas_vencidas']) ? s['facturas_vencidas'].length : 0));
      const porVencer = Number(s['total_por_vencer'] ?? (Array.isArray(s['facturas_por_vencer']) ? s['facturas_por_vencer'].length : 0));
      const morosos = Number(s['total_morosos'] ?? (Array.isArray(s['clientes_morosos']) ? s['clientes_morosos'].length : 0));
      return {
        hora,
        resumen:
          typeof s['resumen_texto'] === 'string'
            ? s['resumen_texto']
            : `${vencidas} facturas vencidas, ${porVencer} por vencer y ${morosos} clientes en mora.`,
        metricas: [
          { etiqueta: 'Facturas vencidas', valor: String(vencidas), tono: vencidas > 0 ? 'peligro' : 'ok' },
          { etiqueta: 'Por vencer (7d)', valor: String(porVencer), tono: porVencer > 0 ? 'aviso' : 'ok' },
          { etiqueta: 'Clientes morosos', valor: String(morosos), tono: morosos > 0 ? 'peligro' : 'ok' },
        ],
        detalles: [],
      };
    }

    if (nombreAgente === 'agente_vision') {
      const hallazgos = Array.isArray(s['ultimos_hallazgos']) ? s['ultimos_hallazgos'] : [];
      return {
        hora,
        resumen:
          typeof s['resumen_texto'] === 'string'
            ? s['resumen_texto']
            : `Se auditaron ${s['piezas_auditadas'] ?? 0} piezas visuales.`,
        metricas: [
          { etiqueta: 'Piezas auditadas', valor: String(s['piezas_auditadas'] ?? 0) },
          { etiqueta: 'Conformes marca', valor: String(s['conformes_marca'] ?? 0), tono: 'ok' },
          {
            etiqueta: 'Con observaciones',
            valor: String(s['con_observaciones'] ?? 0),
            tono: Number(s['con_observaciones'] ?? 0) > 0 ? 'aviso' : 'ok',
          },
          { etiqueta: 'Confianza media', valor: `${s['confianza_promedio_pct'] ?? 0}%` },
        ],
        detalles: hallazgos
          .slice(0, 3)
          .map(
            (h: any) =>
              `Pieza ${h.pieza_id}: ${h.manual_marca_ok ? 'Conforme' : 'Con observación'} (${h.confianza_pct}%)`,
          ),
      };
    }

    return {
      hora,
      resumen:
        typeof s['resumen_texto'] === 'string'
          ? s['resumen_texto']
          : 'Panorama ejecutivo generado vía vistas MCP.',
      metricas: [
        { etiqueta: 'Campañas activas', valor: `${s['campanas_activas'] ?? 0} / ${s['campanas_totales'] ?? 0}`, tono: 'ok' },
        { etiqueta: 'Ejecución global', valor: `${s['ejecucion_global_pct'] ?? 0}%` },
        { etiqueta: 'Facturas pendientes', valor: String(s['facturas_pendientes_30d'] ?? 0), tono: 'aviso' },
        {
          etiqueta: 'Clientes morosos',
          valor: String(s['clientes_morosos'] ?? 0),
          tono: Number(s['clientes_morosos'] ?? 0) > 0 ? 'peligro' : 'ok',
        },
      ],
      detalles: [],
    };
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
