import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  ClienteCrm,
  Contacto,
  Contrato,
  CreditoCliente,
  GestionOperativaDatos,
  RiesgoClienteMl,
} from '../../core/datos/gestion-operativa.datos';

@Component({
  selector: 'ao-cliente-detalle',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './cliente-detalle.html',
  styleUrl: '../gestion-operativa.css',
})
export class ClienteDetalle implements OnInit {
  private readonly api = inject(GestionOperativaDatos);
  private readonly ruta = inject(ActivatedRoute);
  protected readonly cliente = signal<ClienteCrm | null>(null);
  protected readonly credito = signal<CreditoCliente | null>(null);
  protected readonly riesgo = signal<RiesgoClienteMl | null>(null);
  protected readonly contactos = signal<Contacto[]>([]);
  protected readonly contratos = signal<Contrato[]>([]);
  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly guardando = signal(false);
  protected readonly mostrarContacto = signal(false);
  protected readonly mostrarEdicion = signal(false);
  protected readonly mostrarContrato = signal(false);
  protected nuevoContacto = { nombre: '', email: '', telefono: '', rol: '' };
  protected edicion = { razon_social: '', nit: '', limite_credito: '0.00', estado: 'activo' };
  protected nuevoContrato = { fecha_inicio: '', fecha_fin: '', monto: '', moneda: 'BOB' };
  protected readonly usoCredito = computed(() => {
    const c = this.credito();
    if (!c || +c.linea_credito.limite === 0) return 0;
    return Math.min(100, Math.round((+c.linea_credito.usado / +c.linea_credito.limite) * 100));
  });
  private id = '';
  ngOnInit(): void {
    this.id = this.ruta.snapshot.paramMap.get('id') ?? '';
    void this.cargar();
  }
  protected async cargar(): Promise<void> {
    this.cargando.set(true);
    this.error.set(null);
    try {
      const [cliente, credito, contactos, contratos, riesgo] = await Promise.all([
        this.api.obtenerCliente(this.id),
        this.api.obtenerCredito(this.id),
        this.api.listarContactos(this.id),
        this.api.listarContratos(this.id),
        this.api.obtenerRiesgoCliente(this.id),
      ]);
      this.cliente.set(cliente);
      this.edicion = {
        razon_social: cliente.razon_social,
        nit: cliente.nit ?? '',
        limite_credito: cliente.linea_credito.limite,
        estado: cliente.estado,
      };
      this.credito.set(credito);
      this.contactos.set(contactos);
      this.contratos.set(contratos.contenido);
      this.riesgo.set(riesgo);
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'No se pudo cargar el cliente.');
    } finally {
      this.cargando.set(false);
    }
  }
  protected async crearContacto(): Promise<void> {
    if (!this.nuevoContacto.nombre.trim() || this.guardando()) return;
    this.guardando.set(true);
    this.error.set(null);
    try {
      await this.api.crearContacto(this.id, this.nuevoContacto);
      this.nuevoContacto = { nombre: '', email: '', telefono: '', rol: '' };
      this.mostrarContacto.set(false);
      this.contactos.set(await this.api.listarContactos(this.id));
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'No se pudo agregar el contacto.');
    } finally {
      this.guardando.set(false);
    }
  }
  protected async guardarCliente(): Promise<void> {
    const cliente = this.cliente();
    if (!cliente || !this.edicion.razon_social.trim() || this.guardando()) return;
    this.guardando.set(true);
    this.error.set(null);
    try {
      const actualizado = await this.api.actualizarCliente(cliente.id, {
        ...this.edicion,
        razon_social: this.edicion.razon_social.trim(),
        nit: this.edicion.nit.trim(),
        version: cliente.version,
      });
      this.cliente.set(actualizado);
      this.mostrarEdicion.set(false);
      await this.cargar();
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'No se pudo actualizar el cliente.');
    } finally {
      this.guardando.set(false);
    }
  }
  protected async crearContrato(): Promise<void> {
    if (
      !this.nuevoContrato.fecha_inicio ||
      !this.nuevoContrato.fecha_fin ||
      !this.nuevoContrato.monto ||
      this.guardando()
    )
      return;
    this.guardando.set(true);
    this.error.set(null);
    try {
      await this.api.crearContrato({ cliente_id: this.id, ...this.nuevoContrato });
      this.nuevoContrato = { fecha_inicio: '', fecha_fin: '', monto: '', moneda: 'BOB' };
      this.mostrarContrato.set(false);
      this.contratos.set((await this.api.listarContratos(this.id)).contenido);
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'No se pudo crear el contrato.');
    } finally {
      this.guardando.set(false);
    }
  }
  protected dinero(valor: string | number, moneda = 'BOB'): string {
    return new Intl.NumberFormat('es-BO', { style: 'currency', currency: moneda }).format(
      Number(valor),
    );
  }
  protected referencia(id: string, prefijo: string): string {
    return `${prefijo}-${id.replaceAll('-', '').slice(-6).toUpperCase()}`;
  }
}
