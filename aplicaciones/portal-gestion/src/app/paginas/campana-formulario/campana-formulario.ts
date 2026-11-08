import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Location } from '@angular/common';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Boton } from '../../compartido/boton/boton';
import { Tarjeta } from '../../compartido/tarjeta/tarjeta';
import { CampanasDatos } from '../../core/datos/campanas.datos';

interface ClienteReal {
  id: string;
  razonSocial: string;
}

// Validador de dominio: fecha_fin >= fecha_inicio (regla real de ms-campanas).
function fechaFinNoAnteriorAInicio(grupo: AbstractControl): ValidationErrors | null {
  const inicio = grupo.get('fechaInicio')?.value;
  const fin = grupo.get('fechaFin')?.value;
  if (!inicio || !fin) return null;
  return fin >= inicio ? null : { fechaFinAnterior: true };
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
  protected readonly modoEdicion = !!this.idCampana;

  protected readonly intentoEnviar = signal(false);
  protected readonly clientes = signal<ClienteReal[]>([]);
  protected readonly guardando = signal(false);
  protected readonly errorGuardado = signal('');
  protected readonly envioBloqueado = signal(false);

  protected readonly formulario = this.fb.nonNullable.group(
    {
      nombre: ['', [Validators.required, Validators.maxLength(200)]],
      clienteId: ['', Validators.required],
      descripcion: ['', Validators.maxLength(2000)],
      fechaInicio: ['', Validators.required],
      fechaFin: ['', Validators.required],
      presupuestoTotal: [0, [Validators.required, Validators.min(0)]],
      moneda: ['BOB' as 'BOB' | 'USD', Validators.required],
    },
    { validators: fechaFinNoAnteriorAInicio },
  );

  constructor() {
    void this.campanasDatos.listarClientesReales().then((clientes) => this.clientes.set(clientes));

    if (this.idCampana) {
      const campana = this.campanasDatos.buscarPorId(this.idCampana);
      if (campana) {
        this.formulario.patchValue({
          nombre: campana.nombre,
          fechaInicio: campana.fechaInicio,
          fechaFin: campana.fechaFin,
          presupuestoTotal: campana.presupuestoTotal,
          moneda: campana.moneda,
        });
      }
    }
  }

  volver(): void {
    this.ubicacion.back();
  }

  async guardar(): Promise<void> {
    if (this.modoEdicion || this.guardando() || this.envioBloqueado()) return;
    this.intentoEnviar.set(true);
    if (this.formulario.invalid) {
      return;
    }
    const valores = this.formulario.getRawValue();
    this.guardando.set(true);
    try {
    await this.campanasDatos.crearCampana({
      nombre: valores.nombre,
      clienteId: valores.clienteId,
      descripcion: valores.descripcion,
      fechaInicio: valores.fechaInicio,
      fechaFin: valores.fechaFin,
      presupuestoTotal: valores.presupuestoTotal,
      moneda: valores.moneda,
    });
    await this.router.navigateByUrl('/campanas');
    } catch (error) {
      this.envioBloqueado.set(true);
      this.errorGuardado.set(error instanceof Error && error.message.startsWith('La campaña ')
        ? error.message
        : 'No se pudo confirmar la creación. Verifica la lista de campañas antes de volver a intentarlo.');
    } finally {
      this.guardando.set(false);
    }
  }
}
