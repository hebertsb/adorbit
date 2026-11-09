import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  ClienteCrm,
  Factura,
  GestionOperativaDatos,
} from '../../core/datos/gestion-operativa.datos';
import { CampanasDatos } from '../../core/datos/campanas.datos';

@Component({
  selector: 'ao-facturacion',
  imports: [FormsModule],
  templateUrl: './facturacion.html',
  styleUrl: '../gestion-operativa.css',
})
export class Facturacion implements OnInit {
  private readonly api = inject(GestionOperativaDatos);
  protected readonly campanasDatos = inject(CampanasDatos);
  protected readonly facturas = signal<Factura[]>([]);
  protected readonly clientes = signal<ClienteCrm[]>([]);
  protected readonly seleccionada = signal<Factura | null>(null);
  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly guardando = signal(false);
  protected readonly mostrarOperacion = signal(false);
  protected readonly resultadoOperacion = signal<string | null>(null);
  protected estado = '';
  protected cobro = { monto: '', fecha: new Date().toISOString().slice(0, 10), referencia: '' };
  protected operacion = {
    tipo: 'factura',
    cliente_id: '',
    campana_id: '',
    descripcion: '',
    cantidad: 1,
    precio_unitario: '',
    moneda: 'BOB',
    fecha_vencimiento: '',
  };
  protected readonly saldoBob = computed(() =>
    this.facturas()
      .filter((f) => f.moneda === 'BOB')
      .reduce((s, f) => s + Number(f.saldo), 0),
  );
  protected readonly vencidas = computed(
    () => this.facturas().filter((f) => f.estado === 'vencida').length,
  );
  protected readonly cobradas = computed(
    () => this.facturas().filter((f) => f.estado === 'pagada').length,
  );
  ngOnInit(): void {
    void this.cargar();
  }
  protected async cargar(): Promise<void> {
    this.cargando.set(true);
    this.error.set(null);
    try {
      const [f, c] = await Promise.all([
        this.api.listarFacturas(this.estado),
        this.api.listarClientes(),
      ]);
      this.facturas.set(f.contenido);
      this.clientes.set(c.contenido);
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'No se pudo consultar facturación.');
    } finally {
      this.cargando.set(false);
    }
  }
  protected cliente(id: string): string {
    return this.clientes().find((c) => c.id === id)?.razon_social ?? `Cliente ${id.slice(0, 8)}`;
  }
  protected dinero(valor: string | number, moneda: string): string {
    return new Intl.NumberFormat('es-BO', { style: 'currency', currency: moneda }).format(
      Number(valor),
    );
  }
  protected referencia(id: string): string {
    return `FAC-${id.replaceAll('-', '').slice(-8).toUpperCase()}`;
  }
  protected async ver(factura: Factura): Promise<void> {
    try {
      this.seleccionada.set(await this.api.obtenerFactura(factura.id));
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'No se pudo abrir la factura.');
    }
  }
  protected async registrarCobro(): Promise<void> {
    const f = this.seleccionada();
    if (!f || !this.cobro.monto || this.guardando()) return;
    this.guardando.set(true);
    this.error.set(null);
    try {
      await this.api.registrarCobro(f.id, this.cobro);
      this.seleccionada.set(await this.api.obtenerFactura(f.id));
      this.cobro = { monto: '', fecha: new Date().toISOString().slice(0, 10), referencia: '' };
      await this.cargar();
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'No se pudo registrar el cobro.');
    } finally {
      this.guardando.set(false);
    }
  }

  protected campanasCliente() {
    return this.campanasDatos
      .listar()
      .filter((c) => !this.operacion.cliente_id || c.clienteId === this.operacion.cliente_id);
  }

  protected async crearOperacion(): Promise<void> {
    const o = this.operacion;
    if (
      !o.cliente_id ||
      !o.descripcion.trim() ||
      !o.precio_unitario ||
      o.cantidad < 1 ||
      this.guardando()
    )
      return;
    if (o.tipo === 'factura' && (!o.campana_id || !o.fecha_vencimiento)) return;
    this.guardando.set(true);
    this.error.set(null);
    this.resultadoOperacion.set(null);
    const item = {
      descripcion: o.descripcion.trim(),
      cantidad: Number(o.cantidad),
      precio_unitario: o.precio_unitario,
    };
    try {
      if (o.tipo === 'factura') {
        const creada = await this.api.crearFactura({
          cliente_id: o.cliente_id,
          campana_id: o.campana_id,
          items: [item],
          moneda: o.moneda,
          fecha_vencimiento: o.fecha_vencimiento,
        });
        this.resultadoOperacion.set(
          `Factura ${this.referencia(creada.id)} emitida por ${this.dinero(creada.total, creada.moneda)}.`,
        );
        await this.cargar();
      } else {
        const creada = await this.api.crearCotizacion({
          cliente_id: o.cliente_id,
          items: [item],
          moneda: o.moneda,
        });
        this.resultadoOperacion.set(
          `Cotización COT-${creada.id.replaceAll('-', '').slice(-8).toUpperCase()} calculada por ${this.dinero(creada.total, creada.moneda)}.`,
        );
      }
      this.operacion = {
        tipo: o.tipo,
        cliente_id: '',
        campana_id: '',
        descripcion: '',
        cantidad: 1,
        precio_unitario: '',
        moneda: 'BOB',
        fecha_vencimiento: '',
      };
      this.mostrarOperacion.set(false);
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'No se pudo crear la operación.');
    } finally {
      this.guardando.set(false);
    }
  }
}
