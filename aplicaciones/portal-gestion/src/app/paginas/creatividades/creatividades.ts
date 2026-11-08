import { Component, computed, inject, signal } from '@angular/core';
import { EtiquetaEstado, TonoEtiqueta } from '../../compartido/etiqueta-estado/etiqueta-estado';
import { CampanasDatos } from '../../core/datos/campanas.datos';
import { DEGRADADO_PIEZA } from '../../core/datos/pieza-presentacion';

const TONO_ESTADO_PIEZA: Record<string, TonoEtiqueta> = {
  aprobada: 'ok', pendiente: 'aviso', rechazada: 'peligro', bloqueada: 'neutro',
};

@Component({
  selector: 'ao-pagina-creatividades',
  imports: [EtiquetaEstado],
  templateUrl: './creatividades.html',
  styleUrl: './creatividades.css',
})
export class Creatividades {
  protected readonly campanasDatos = inject(CampanasDatos);
  protected readonly degradadoPieza = DEGRADADO_PIEZA;
  protected readonly idBriefSeleccionado = signal('');
  protected readonly briefs = computed(() =>
    this.campanasDatos.listar().map((campana) => ({
      idCampana: campana.id,
      titulo: campana.nombre,
      cliente: campana.cliente,
      piezas: this.campanasDatos.piezasDe(campana.id),
    })),
  );
  protected readonly briefSeleccionado = computed(() =>
    this.briefs().find((brief) => brief.idCampana === this.idBriefSeleccionado()) ?? this.briefs()[0],
  );

  protected tonoDe(estado: string): TonoEtiqueta {
    return TONO_ESTADO_PIEZA[estado] ?? 'neutro';
  }

  protected contar(estado: string): number {
    return this.briefSeleccionado()?.piezas.filter((pieza) => pieza.estado === estado).length ?? 0;
  }
}
