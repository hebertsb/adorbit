import { Component, computed, inject, signal } from '@angular/core';
import { EtiquetaEstado, TonoEtiqueta } from '../../compartido/etiqueta-estado/etiqueta-estado';
import { CampanasDatos } from '../../core/datos/campanas.datos';
import {
  BriefCreativo,
  CreatividadesDatos,
  PiezaCreativaReal,
  PropuestaBriefIa,
  TipoPieza,
} from '../../core/datos/creatividades.datos';

const TONO_ESTADO: Record<string, TonoEtiqueta> = {
  aprobada: 'ok',
  aprobado: 'ok',
  en_revision: 'aviso',
  recibido: 'aviso',
  rechazada: 'peligro',
  rechazado: 'peligro',
  bloqueada_saga: 'neutro',
};

@Component({
  selector: 'ao-pagina-creatividades',
  imports: [EtiquetaEstado],
  templateUrl: './creatividades.html',
  styleUrl: './creatividades.css',
})
export class Creatividades {
  protected readonly campanasDatos = inject(CampanasDatos);
  private readonly datos = inject(CreatividadesDatos);
  protected readonly idCampana = signal('');
  protected readonly idBrief = signal('');
  protected readonly briefs = signal<BriefCreativo[]>([]);
  protected readonly piezas = signal<PiezaCreativaReal[]>([]);
  protected readonly cargando = signal(false);
  protected readonly guardando = signal(false);
  protected readonly error = signal('');
  protected readonly exito = signal('');
  protected readonly mostrarNuevoBrief = signal(false);
  protected readonly mostrarNuevaPieza = signal(false);

  // Asistente IA Creativo (AdOrbit Copilot)
  protected readonly asistenteAbierto = signal(true);
  protected readonly generandoIa = signal(false);
  protected readonly propuestaIa = signal<PropuestaBriefIa | null>(null);
  protected readonly tonoIa = signal('Inspirador');
  protected readonly tonosDisponibles = [
    'Inspirador',
    'Disruptivo',
    'Corporativo',
    'Juvenil',
    'Promocional',
  ] as const;

  protected readonly campanaSeleccionada = computed(
    () => this.campanasDatos.buscarPorId(this.idCampana()) ?? this.campanasDatos.listar()[0],
  );
  protected readonly briefSeleccionado = computed(
    () => this.briefs().find((brief) => brief.id === this.idBrief()) ?? this.briefs()[0],
  );

  constructor() {
    void this.inicializar();
  }

  private async inicializar(): Promise<void> {
    await this.campanasDatos.sincronizarConBackend();
    const primera = this.campanasDatos.listar()[0];
    if (primera) await this.seleccionarCampana(primera.id);
  }

  protected async seleccionarCampana(id: string): Promise<void> {
    this.idCampana.set(id);
    this.idBrief.set('');
    this.piezas.set([]);
    this.cargando.set(true);
    this.error.set('');
    try {
      const briefs = await this.datos.listarBriefs(id);
      this.briefs.set(briefs);
      if (briefs[0]) await this.seleccionarBrief(briefs[0].id);
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'No se pudieron cargar los briefs.');
    } finally {
      this.cargando.set(false);
    }
  }

  protected async seleccionarBrief(id: string): Promise<void> {
    this.idBrief.set(id);
    this.cargando.set(true);
    this.error.set('');
    try {
      this.piezas.set(await this.datos.listarPiezas(id));
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'No se pudieron cargar las piezas.');
    } finally {
      this.cargando.set(false);
    }
  }

  protected alternarAsistente(): void {
    this.asistenteAbierto.update((v) => !v);
  }

  protected seleccionarTono(tono: string): void {
    this.tonoIa.set(tono);
  }

  protected async generarConIa(concepto: string, publico?: string): Promise<void> {
    if (!concepto.trim() || this.generandoIa()) return;
    const campana = this.campanaSeleccionada();
    this.generandoIa.set(true);
    this.error.set('');
    try {
      const propuesta = await this.datos.generarPropuestaBriefIa({
        concepto: concepto.trim(),
        tono: this.tonoIa(),
        publico_objetivo: publico?.trim() || undefined,
        cliente_o_marca: campana?.cliente,
      });
      this.propuestaIa.set(propuesta);
      this.exito.set('✨ Propuesta generada con IA. Puedes revisarla y aplicarla al formulario.');
    } catch (err) {
      this.error.set(
        err instanceof Error ? err.message : 'No se pudo generar la propuesta con IA.',
      );
    } finally {
      this.generandoIa.set(false);
    }
  }

  protected aplicarPropuestaIa(
    inputTitulo: HTMLInputElement,
    textareaDesc: HTMLTextAreaElement,
  ): void {
    const p = this.propuestaIa();
    if (!p) return;
    inputTitulo.value = p.titulo;
    textareaDesc.value = p.descripcion;
    this.exito.set('🪄 Propuesta aplicada directamente al formulario de creación.');
  }

  protected async crearBrief(titulo: string, descripcion: string): Promise<void> {
    const campana = this.campanaSeleccionada();
    if (!campana || !titulo.trim()) return;
    await this.ejecutar(async () => {
      const nuevo = await this.datos.crearBrief({
        campana_id: campana.id,
        ...(campana.clienteId ? { cliente_id: campana.clienteId } : {}),
        titulo: titulo.trim(),
        ...(descripcion.trim() ? { descripcion: descripcion.trim() } : {}),
      });
      this.briefs.update((actuales) => [nuevo, ...actuales]);
      await this.seleccionarBrief(nuevo.id);
      this.mostrarNuevoBrief.set(false);
      this.exito.set('Brief creado correctamente.');
    });
  }

  protected async crearPieza(nombre: string, tipo: string, archivo?: File): Promise<void> {
    const brief = this.briefSeleccionado();
    if (!brief || !nombre.trim()) return;
    await this.ejecutar(async () => {
      const nueva = await this.datos.crearPieza(brief.id, {
        nombre: nombre.trim(),
        tipo: tipo as TipoPieza,
      });
      if (archivo) await this.datos.subirArchivo(nueva.id, archivo);
      await this.seleccionarBrief(brief.id);
      this.mostrarNuevaPieza.set(false);
      this.exito.set('Pieza registrada correctamente.');
    });
  }

  protected async decidir(
    pieza: PiezaCreativaReal,
    decision: 'aprobar' | 'rechazar',
  ): Promise<void> {
    await this.ejecutar(async () => {
      const actualizada = await this.datos.decidirPieza(pieza.id, decision);
      this.piezas.update((actuales) =>
        actuales.map((item) => (item.id === actualizada.id ? actualizada : item)),
      );
      this.exito.set(decision === 'aprobar' ? 'Pieza aprobada.' : 'Pieza rechazada.');
    });
  }

  private async ejecutar(accion: () => Promise<void>): Promise<void> {
    this.guardando.set(true);
    this.error.set('');
    this.exito.set('');
    try {
      await accion();
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'No se pudo completar la operación.');
    } finally {
      this.guardando.set(false);
    }
  }

  protected tonoDe(estado: string): TonoEtiqueta {
    return TONO_ESTADO[estado] ?? 'neutro';
  }
  protected contar(estado: string): number {
    return this.piezas().filter((pieza) => pieza.estado === estado).length;
  }
  protected codigo(id: string): string {
    return `PZA-${id.slice(0, 8).toUpperCase()}`;
  }
}
