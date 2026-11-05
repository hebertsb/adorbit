import { Component, computed, inject, signal } from '@angular/core';
import { Tarjeta } from '../../compartido/tarjeta/tarjeta';
import { Boton } from '../../compartido/boton/boton';
import { EtiquetaEstado, TonoEtiqueta } from '../../compartido/etiqueta-estado/etiqueta-estado';
import { CampanasDatos } from '../../core/datos/campanas.datos';
import { DEGRADADO_PIEZA } from '../../core/datos/pieza-presentacion';

const TONO_ESTADO_PIEZA: Record<string, TonoEtiqueta> = {
  aprobada: 'ok',
  pendiente: 'aviso',
  rechazada: 'peligro',
  bloqueada: 'neutro',
};

@Component({
  selector: 'ao-pagina-creatividades',
  imports: [Tarjeta, Boton, EtiquetaEstado],
  templateUrl: './creatividades.html',
  styleUrl: './creatividades.css',
})
export class Creatividades {
  private readonly campanasDatos = inject(CampanasDatos);

  protected readonly degradadoPieza = DEGRADADO_PIEZA;

  protected readonly briefs = computed(() =>
    this.campanasDatos.listar().map((campana) => ({
      idCampana: campana.id,
      titulo: campana.nombre,
      cliente: campana.cliente,
      piezas: this.campanasDatos.piezasDe(campana.id),
    })),
  );

  protected readonly idBriefSeleccionado = signal(this.briefs()[0]?.idCampana ?? '');

  protected readonly briefSeleccionado = computed(() =>
    this.briefs().find((b) => b.idCampana === this.idBriefSeleccionado()),
  );

  tonoDe(estado: string): TonoEtiqueta {
    return TONO_ESTADO_PIEZA[estado] ?? 'neutro';
  }
}
