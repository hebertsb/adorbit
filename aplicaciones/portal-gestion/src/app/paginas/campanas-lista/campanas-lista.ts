import { Component, computed, inject, signal } from '@angular/core';
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

@Component({
  selector: 'ao-pagina-campanas-lista',
  imports: [CurrencyPipe, RouterLink, Boton, Tarjeta, EtiquetaEstado],
  templateUrl: './campanas-lista.html',
  styleUrl: './campanas-lista.css',
})
export class CampanasLista {
  private readonly campanasDatos = inject(CampanasDatos);

  protected readonly etiquetas = ETIQUETAS_ESTADO_CAMPANA;
  protected readonly estadosDisponibles = Object.keys(ETIQUETAS_ESTADO_CAMPANA) as EstadoCampana[];

  protected readonly textoBusqueda = signal('');
  protected readonly filtroEstado = signal<EstadoCampana | 'todos'>('todos');
  protected readonly filtroCliente = signal('');
  protected readonly clientesDisponibles = computed(() =>
    [...new Set(this.campanasDatos.listar().map((campana) => campana.cliente))].sort((a, b) => a.localeCompare(b)),
  );

  constructor() {
    void this.campanasDatos.sincronizarConBackend();
  }

  protected limpiarFiltros(): void {
    this.textoBusqueda.set('');
    this.filtroEstado.set('todos');
    this.filtroCliente.set('');
  }

  protected readonly campanasFiltradas = computed(() => {
    const texto = this.textoBusqueda().toLowerCase().trim();
    const estado = this.filtroEstado();
    return this.campanasDatos
      .listar()
      .filter((c) => !this.filtroCliente() || c.cliente === this.filtroCliente())
      .filter((c) => (estado === 'todos' ? true : c.estado === estado))
      .filter((c) => (texto ? c.nombre.toLowerCase().includes(texto) : true));
  });

  tonoDe(estado: EstadoCampana): TonoEtiqueta {
    return TONO_POR_ESTADO[estado];
  }

  porcentajeGastado(presupuestoTotal: number, montoGastado: number): number {
    if (presupuestoTotal <= 0) {
      return 0;
    }
    return Math.round((montoGastado / presupuestoTotal) * 100);
  }
}
