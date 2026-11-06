import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Boton } from '../../compartido/boton/boton';
import { Tarjeta } from '../../compartido/tarjeta/tarjeta';
import { CampanasDatos } from '../../core/datos/campanas.datos';

// Validador de dominio: fecha_fin >= fecha_inicio (regla real de ms-campanas).
function fechaFinNoAnteriorAInicio(grupo: AbstractControl): ValidationErrors | null {
  const inicio = grupo.get('fechaInicio')?.value;
  const fin = grupo.get('fechaFin')?.value;
  if (!inicio || !fin) return null;
  return fin >= inicio ? null : { fechaFinAnterior: true };
}

@Component({
  selector: 'ao-pagina-campana-formulario',
  imports: [ReactiveFormsModule, RouterLink, Boton, Tarjeta],
  templateUrl: './campana-formulario.html',
  styleUrl: './campana-formulario.css',
})
export class CampanaFormulario {
  private readonly fb = inject(FormBuilder);
  private readonly ruta = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly campanasDatos = inject(CampanasDatos);

  private readonly idCampana = this.ruta.snapshot.paramMap.get('id');
  protected readonly modoEdicion = !!this.idCampana;

  protected readonly intentoEnviar = signal(false);

  protected readonly formulario = this.fb.nonNullable.group(
    {
      nombre: ['', [Validators.required, Validators.maxLength(200)]],
      cliente: ['', Validators.required],
      descripcion: ['', Validators.maxLength(2000)],
      fechaInicio: ['', Validators.required],
      fechaFin: ['', Validators.required],
      presupuestoTotal: [0, [Validators.required, Validators.min(0)]],
      moneda: ['BOB' as 'BOB' | 'USD', Validators.required],
    },
    { validators: fechaFinNoAnteriorAInicio },
  );

  protected readonly caracteresNombre = computed(() => this.formulario.controls.nombre.value.length);
  protected readonly caracteresDescripcion = computed(() => this.formulario.controls.descripcion.value.length);

  constructor() {
    if (this.idCampana) {
      const campana = this.campanasDatos.buscarPorId(this.idCampana);
      if (campana) {
        this.formulario.patchValue({
          nombre: campana.nombre,
          cliente: campana.cliente,
          fechaInicio: campana.fechaInicio,
          fechaFin: campana.fechaFin,
          presupuestoTotal: campana.presupuestoTotal,
          moneda: campana.moneda,
        });
      }
    }
  }

  async guardar(): Promise<void> {
    this.intentoEnviar.set(true);
    if (this.formulario.invalid) {
      return;
    }
    const valores = this.formulario.getRawValue();
    await this.campanasDatos.crearCampana({
      nombre: valores.nombre,
      descripcion: valores.descripcion,
      fechaInicio: valores.fechaInicio,
      fechaFin: valores.fechaFin,
      presupuestoTotal: valores.presupuestoTotal,
      moneda: valores.moneda,
    });
    this.router.navigateByUrl('/campanas');
  }
}
