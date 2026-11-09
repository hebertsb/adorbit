import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Location } from '@angular/common';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Boton } from '../../compartido/boton/boton';
import { Tarjeta } from '../../compartido/tarjeta/tarjeta';
import { CampanasDatos } from '../../core/datos/campanas.datos';

interface ClienteReal { id: string; razonSocial: string; }
interface PresupuestoPendiente { id: string; clave: string; monto: number; moneda: 'BOB' | 'USD'; }
const CLAVE_PENDIENTE = 'adorbit-presupuesto-pendiente';

function fechaFinNoAnteriorAInicio(grupo: AbstractControl): ValidationErrors | null {
  const inicio = grupo.get('fechaInicio')?.value;
  const fin = grupo.get('fechaFin')?.value;
  return !inicio || !fin || fin >= inicio ? null : { fechaFinAnterior: true };
}

@Component({
  selector: 'ao-pagina-campana-formulario',
  imports: [ReactiveFormsModule, Boton, Tarjeta],
  templateUrl: './campana-formulario.html',
  styleUrl: './campana-formulario.css',
})
export class CampanaFormulario {
  private readonly fb = inject(FormBuilder);
  private readonly ruta = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly campanasDatos = inject(CampanasDatos);
  private readonly ubicacion = inject(Location);
  private readonly idCampana = this.ruta.snapshot.paramMap.get('id');
  private campanaVersion: number | null = null;
  protected readonly modoEdicion = !!this.idCampana;
  protected readonly intentoEnviar = signal(false);
  protected readonly clientes = signal<ClienteReal[]>([]);
  protected readonly guardando = signal(false);
  protected readonly errorGuardado = signal('');
  protected readonly envioBloqueado = signal(false);
  protected readonly cargandoEdicion = signal(this.modoEdicion);
  protected readonly pendiente = signal<PresupuestoPendiente | null>(null);

  protected readonly formulario = this.fb.nonNullable.group({
    nombre: ['', [Validators.required, Validators.maxLength(200)]],
    clienteId: ['', Validators.required],
    descripcion: ['', Validators.maxLength(2000)],
    fechaInicio: ['', Validators.required],
    fechaFin: ['', Validators.required],
    presupuestoTotal: [0, [Validators.required, Validators.min(0)]],
    moneda: ['BOB' as 'BOB' | 'USD', Validators.required],
  }, { validators: fechaFinNoAnteriorAInicio });

  constructor() {
    if (this.idCampana) {
      this.formulario.controls.clienteId.disable();
      this.formulario.controls.presupuestoTotal.disable();
      this.formulario.controls.moneda.disable();
      void this.cargarCampanaEdicion(this.idCampana);
    } else {
      void this.campanasDatos.listarClientesReales().then((clientes) => this.clientes.set(clientes));
      try {
        const guardado = sessionStorage.getItem(CLAVE_PENDIENTE);
        if (guardado) {
          const dato = JSON.parse(guardado) as PresupuestoPendiente;
          if (typeof dato.id === 'string' && typeof dato.clave === 'string' &&
              typeof dato.monto === 'number' && (dato.moneda === 'BOB' || dato.moneda === 'USD')) {
            this.pendiente.set(dato);
          }
        }
      } catch { /* Almacenamiento no disponible: solo se recupera en esta pantalla. */ }
    }
  }

  private async cargarCampanaEdicion(id: string): Promise<void> {
    const detalle = await this.campanasDatos.obtenerDetalleReal(id);
    const campana = detalle?.campana;
    if (!campana || !Number.isInteger(campana.version) || campana.version! < 0) {
      this.errorGuardado.set('No se pudo cargar la campaña con su versión actual. Vuelve a intentarlo desde el detalle.');
      this.envioBloqueado.set(true);
    } else {
      this.formulario.patchValue({ nombre: campana.nombre, fechaInicio: campana.fechaInicio,
        fechaFin: campana.fechaFin, descripcion: campana.descripcion || '' });
      this.campanaVersion = campana.version!;
    }
    this.cargandoEdicion.set(false);
  }

  volver(): void { this.ubicacion.back(); }

  async guardar(): Promise<void> {
    if (this.guardando() || this.envioBloqueado() || this.cargandoEdicion() || this.pendiente()) return;
    this.intentoEnviar.set(true);
    if (this.formulario.invalid) return;
    const valores = this.formulario.getRawValue();
    this.guardando.set(true);
    this.errorGuardado.set('');
    try {
      if (this.idCampana) {
        if (this.campanaVersion === null) return;
        const clave = globalThis.crypto.randomUUID();
        await this.campanasDatos.actualizarCampana(this.idCampana, {
          nombre: valores.nombre, descripcion: valores.descripcion, fechaInicio: valores.fechaInicio,
          fechaFin: valores.fechaFin, version: this.campanaVersion,
        }, clave);
        await this.router.navigateByUrl('/campanas');
      } else {
        const clave = `presupuesto-${globalThis.crypto.randomUUID()}`;
        // La pasarela genera su propia clave GraphQL: un fallo no permite reintento seguro de creación.
        const id = await this.campanasDatos.crearCampana(valores);
        const pendiente: PresupuestoPendiente = { id, clave, monto: valores.presupuestoTotal, moneda: valores.moneda };
        this.pendiente.set(pendiente);
        try { sessionStorage.setItem(CLAVE_PENDIENTE, JSON.stringify(pendiente)); } catch { /* Sigue disponible en memoria. */ }
        await this.reintentarPresupuesto();
      }
    } catch (error) {
      this.envioBloqueado.set(true);
      this.errorGuardado.set(this.modoEdicion
        ? (error instanceof Error ? error.message : 'No se pudo confirmar la actualización. Recarga la campaña antes de reintentar.')
        : 'No se pudo confirmar la creación. La campaña podría existir: verifica la lista antes de intentar crear otra.');
    } finally { this.guardando.set(false); }
  }

  async reintentarPresupuesto(): Promise<void> {
    const pendiente = this.pendiente();
    if (!pendiente) return;
    this.guardando.set(true);
    this.errorGuardado.set('');
    try {
      await this.campanasDatos.asignarPresupuesto(pendiente.id, pendiente.monto, pendiente.moneda, pendiente.clave);
      try { sessionStorage.removeItem(CLAVE_PENDIENTE); } catch { /* Sin almacenamiento disponible. */ }
      this.pendiente.set(null);
      await this.campanasDatos.sincronizarConBackend();
      await this.router.navigate(['/campanas', pendiente.id]);
    } catch (error) {
      this.errorGuardado.set(`La campaña ${pendiente.id} fue creada, pero no se confirmó su presupuesto. Puedes reintentar únicamente el presupuesto con los mismos datos. ${error instanceof Error ? error.message : ''}`);
    } finally { this.guardando.set(false); }
  }
}
