import { Component, computed, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Boton } from '../../compartido/boton/boton';
import { Tarjeta } from '../../compartido/tarjeta/tarjeta';
import { SagaDatos } from '../../core/datos/saga.datos';
import { EstadoPasoSaga, EstadoSaga } from '../../core/datos/saga.modelo';

@Component({
  selector: 'ao-pagina-saga-estado',
  imports: [RouterLink, Boton, Tarjeta],
  templateUrl: './saga-estado.html',
  styleUrl: './saga-estado.css',
})
export class SagaEstado implements OnInit, OnDestroy {
  private readonly ruta = inject(ActivatedRoute);
  private readonly sagaDatos = inject(SagaDatos);

  private readonly idSaga = this.ruta.snapshot.paramMap.get('id') ?? '';
  private intervaloPolling: any = null;

  protected readonly escenario = signal<'en_progreso' | 'fallo'>('en_progreso');
  protected readonly sagaReal = signal<EstadoSaga | null>(null);

  protected readonly error = signal('');
  protected readonly saga = computed(() => this.sagaReal());

  protected readonly pasosCompletados = computed(
    () => this.saga()?.pasos.filter((p) => p.estado === 'completado').length ?? 0,
  );

  async ngOnInit(): Promise<void> {
    await this.cargarEstadoSaga();
    // Polling cada 2.5 segundos mientras esté en progreso
    this.intervaloPolling = setInterval(async () => {
      const actual = this.sagaReal();
      if (actual && actual.resultado !== 'en_progreso') {
        clearInterval(this.intervaloPolling);
        return;
      }
      await this.cargarEstadoSaga();
    }, 2500);
  }

  ngOnDestroy(): void {
    if (this.intervaloPolling) {
      clearInterval(this.intervaloPolling);
    }
  }

  private async cargarEstadoSaga(): Promise<void> {
    if (!this.idSaga) return;
    try {
      const datos = await this.sagaDatos.consultarSaga(this.idSaga);
      this.sagaReal.set(datos);
      this.error.set('');
    } catch (error) {
      this.sagaReal.set(null);
      this.error.set(error instanceof Error ? error.message : 'No se pudo consultar la SAGA');
    }
  }

  etiquetaEstadoPaso(estado: EstadoPasoSaga): string {
    const etiquetas: Record<EstadoPasoSaga, string> = {
      completado: 'Completado',
      en_curso: 'En curso',
      pendiente: 'Pendiente',
      fallido: 'Fallido',
      compensado: 'Compensado',
      omitido: 'Omitido',
    };
    return etiquetas[estado];
  }
}
