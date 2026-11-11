import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import {
  Automatizaciones as DatosAutomatizaciones,
  EjecucionN8n,
  GestionOperativaDatos,
} from '../../core/datos/gestion-operativa.datos';

const EDITOR_POR_DEFECTO = 'http://100.99.124.109:5678';

/** Descripción de negocio de cada flujo (para explicar en la demo qué hace). */
const DESCRIPCIONES: Record<string, string> = {
  'adorbit-01': 'Al emitirse una factura (evento RabbitMQ) avisa por correo al contacto del cliente.',
  'adorbit-02': 'Cada día a las 8:00 marca vencidas y envía recordatorios de cobranza.',
  'adorbit-03': 'Cada lunes resume la facturación por estado y moneda para gerencia.',
  'adorbit-04': 'Webhook: programa una reunión y envía la invitación .ics.',
  'adorbit-05': 'Webhook: pedido → cotización en facturación → campaña en ms-campanas.',
  'adorbit-06': 'Webhook: alertas de IA, presupuesto o facturas por WhatsApp y correo.',
};

/**
 * Automatizaciones (n8n) dentro de AdOrbit: el gerente ve los flujos y sus ejecuciones
 * sin iniciar sesión en n8n. Para crear o editar flujos se abre el editor de n8n.
 */
@Component({
  selector: 'ao-pagina-automatizaciones',
  imports: [DatePipe],
  templateUrl: './automatizaciones.html',
  styleUrl: './automatizaciones.css',
})
export class Automatizaciones implements OnInit {
  private readonly datos = inject(GestionOperativaDatos);

  protected readonly info = signal<DatosAutomatizaciones | null>(null);
  protected readonly cargando = signal(true);
  protected readonly error = signal('');

  protected readonly editorUrl = computed(() => this.info()?.editor_url || EDITOR_POR_DEFECTO);
  protected readonly activos = computed(() => this.info()?.flujos.filter((f) => f.activo).length ?? 0);
  protected readonly exitosas = computed(
    () => this.info()?.ejecuciones.filter((e) => this.esExito(e)).length ?? 0,
  );
  protected readonly fallidas = computed(
    () => this.info()?.ejecuciones.filter((e) => this.esError(e)).length ?? 0,
  );

  ngOnInit(): void {
    void this.cargar();
  }

  protected async cargar(): Promise<void> {
    this.cargando.set(true);
    this.error.set('');
    try {
      this.info.set(await this.datos.obtenerAutomatizaciones());
    } catch (e) {
      this.error.set((e as Error).message || 'No se pudo consultar n8n.');
    } finally {
      this.cargando.set(false);
    }
  }

  protected descripcion(id: string): string {
    return DESCRIPCIONES[id] ?? 'Flujo personalizado creado en n8n.';
  }

  protected ultimaEjecucion(flujoId: string): EjecucionN8n | undefined {
    return this.info()?.ejecuciones.find((e) => e.flujo_id === flujoId);
  }

  protected esExito(e: EjecucionN8n): boolean {
    return e.estado === 'success';
  }

  protected esError(e: EjecucionN8n): boolean {
    return e.estado === 'error' || e.estado === 'crashed';
  }

  protected textoEstado(e: EjecucionN8n): string {
    switch (e.estado) {
      case 'success':
        return 'Exitosa';
      case 'error':
      case 'crashed':
        return 'Con error';
      case 'running':
        return 'En curso';
      case 'waiting':
        return 'Esperando';
      default:
        return e.estado || 'Desconocido';
    }
  }

  protected textoModo(modo: string | null): string {
    switch (modo) {
      case 'webhook':
        return 'Webhook';
      case 'trigger':
        return 'Evento / programado';
      case 'manual':
        return 'Manual';
      default:
        return modo ?? '—';
    }
  }

  protected urlFlujo(id: string): string {
    return `${this.editorUrl().replace(/\/+$/, '')}/workflow/${encodeURIComponent(id)}`;
  }

  protected urlEjecucion(e: EjecucionN8n): string {
    return `${this.urlFlujo(e.flujo_id)}/executions/${encodeURIComponent(e.id)}`;
  }
}
