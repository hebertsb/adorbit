import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Boton } from '../../compartido/boton/boton';
import { Tarjeta } from '../../compartido/tarjeta/tarjeta';
import { SagaDatos } from '../../core/datos/saga.datos';
import { EstadoPasoSaga } from '../../core/datos/saga.modelo';

@Component({
  selector: 'ao-pagina-saga-estado',
  imports: [RouterLink, Boton, Tarjeta],
  templateUrl: './saga-estado.html',
  styleUrl: './saga-estado.css',
})
export class SagaEstado {
  private readonly sagaDatos = inject(SagaDatos);

  // TODO Roly: reemplazar por GET /api/v1/sagas/{id} con polling (o suscripción GraphQL)
  // contra el id real de la ruta. El selector de escenario de abajo es solo para esta
  // demo, para mostrar las dos variantes (en progreso / con fallo) sin dos rutas distintas.
  protected readonly escenario = signal<'en_progreso' | 'fallo'>('en_progreso');

  protected readonly saga = computed(() =>
    this.escenario() === 'en_progreso' ? this.sagaDatos.enProgreso() : this.sagaDatos.conFallo(),
  );

  protected readonly pasosCompletados = computed(
    () => this.saga().pasos.filter((p) => p.estado === 'completado').length,
  );

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
