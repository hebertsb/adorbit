import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ClienteCrm, GestionOperativaDatos } from '../../core/datos/gestion-operativa.datos';

@Component({
  selector: 'ao-clientes',
  imports: [FormsModule, RouterLink],
  templateUrl: './clientes.html',
  styleUrl: '../gestion-operativa.css',
})
export class Clientes implements OnInit {
  private readonly api = inject(GestionOperativaDatos);
  protected readonly clientes = signal<ClienteCrm[]>([]);
  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly mostrarFormulario = signal(false);
  protected readonly guardando = signal(false);
  protected busqueda = '';
  protected estado = '';
  protected nuevo = { razon_social: '', nit: '', limite_credito: '0.00', moneda: 'BOB' };
  protected readonly activos = computed(
    () => this.clientes().filter((c) => c.estado === 'activo').length,
  );
  protected readonly morosos = computed(
    () => this.clientes().filter((c) => c.estado === 'moroso').length,
  );
  protected readonly creditoDisponible = computed(() =>
    this.clientes().reduce(
      (s, c) =>
        s + Math.max(0, Number(c.linea_credito?.limite ?? 0) - Number(c.linea_credito?.usado ?? 0)),
      0,
    ),
  );

  ngOnInit(): void {
    void this.cargar();
  }
  protected async cargar(): Promise<void> {
    this.cargando.set(true);
    this.error.set(null);
    try {
      this.clientes.set(
        (await this.api.listarClientes({ q: this.busqueda.trim(), estado: this.estado })).contenido,
      );
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'No se pudieron cargar los clientes.');
    } finally {
      this.cargando.set(false);
    }
  }
  protected async crear(): Promise<void> {
    if (!this.nuevo.razon_social.trim() || !this.nuevo.nit.trim() || this.guardando()) return;
    this.guardando.set(true);
    this.error.set(null);
    try {
      await this.api.crearCliente({
        ...this.nuevo,
        razon_social: this.nuevo.razon_social.trim(),
        nit: this.nuevo.nit.trim(),
      });
      this.nuevo = { razon_social: '', nit: '', limite_credito: '0.00', moneda: 'BOB' };
      this.mostrarFormulario.set(false);
      await this.cargar();
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'No se pudo crear el cliente.');
    } finally {
      this.guardando.set(false);
    }
  }
  protected dinero(valor: string | number, moneda = 'BOB'): string {
    return new Intl.NumberFormat('es-BO', { style: 'currency', currency: moneda }).format(
      Number(valor),
    );
  }
  protected referencia(id: string): string {
    return `CLI-${id.replaceAll('-', '').slice(-6).toUpperCase()}`;
  }
}
