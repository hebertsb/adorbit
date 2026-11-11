import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { GestionOperativaDatos, SegmentoCampanaMl } from '../../core/datos/gestion-operativa.datos';

interface DefinicionSegmento {
  clave: string;
  titulo: string;
  explicacion: string;
}

const SEGMENTOS: DefinicionSegmento[] = [
  {
    clave: 'bajo_consumo',
    titulo: 'Bajo consumo',
    explicacion: 'Gastaron poco de su presupuesto.',
  },
  {
    clave: 'saludable',
    titulo: 'Saludable',
    explicacion: 'Gasto proporcional al avance esperado.',
  },
  {
    clave: 'cerca_del_limite',
    titulo: 'Cerca del límite',
    explicacion: 'Consumieron casi todo el presupuesto.',
  },
];

/**
 * ML no supervisado (ms-ia): K-Means agrupa las campañas activas por presupuesto, gasto y
 * proporción de gasto, e Isolation Forest marca las de gasto anómalo. Sin etiquetas previas.
 */
@Component({
  selector: 'ao-pagina-segmentacion-campanas',
  imports: [DecimalPipe, RouterLink],
  templateUrl: './segmentacion-campanas.html',
  styleUrl: './segmentacion-campanas.css',
})
export class SegmentacionCampanas implements OnInit {
  private readonly datos = inject(GestionOperativaDatos);

  protected readonly segmentos = SEGMENTOS;
  protected readonly items = signal<SegmentoCampanaMl[]>([]);
  protected readonly cargando = signal(true);
  protected readonly error = signal('');
  protected readonly soloAnomalias = signal(false);

  protected readonly visibles = computed(() =>
    this.soloAnomalias() ? this.items().filter((i) => i.es_anomalia) : this.items(),
  );

  protected readonly totalAnomalias = computed(
    () => this.items().filter((i) => i.es_anomalia).length,
  );

  ngOnInit(): void {
    void this.cargar();
  }

  protected async cargar(): Promise<void> {
    this.cargando.set(true);
    this.error.set('');
    try {
      this.items.set(await this.datos.obtenerSegmentacionCampanas());
    } catch (e) {
      this.error.set((e as Error).message || 'No se pudo obtener la segmentación de ms-ia.');
    } finally {
      this.cargando.set(false);
    }
  }

  protected cantidadEn(clave: string): number {
    return this.items().filter((i) => i.segmento === clave).length;
  }

  protected tituloSegmento(clave: string): string {
    return SEGMENTOS.find((s) => s.clave === clave)?.titulo ?? clave;
  }

  protected porcentaje(item: SegmentoCampanaMl): number {
    return item.presupuesto_total > 0 ? (item.gasto_actual / item.presupuesto_total) * 100 : 0;
  }
}
