import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ClienteCrm, GestionOperativaDatos } from '../../core/datos/gestion-operativa.datos';
import { IdentidadDatos, UsuarioIdentidad } from '../../core/datos/identidad.datos';

@Component({
  selector: 'ao-usuarios', imports: [FormsModule], templateUrl: './usuarios.html', styleUrl: '../gestion-operativa.css',
})
export class Usuarios {
  private readonly identidad = inject(IdentidadDatos);
  private readonly operaciones = inject(GestionOperativaDatos);
  protected readonly usuarios = signal<UsuarioIdentidad[]>([]);
  protected readonly clientes = signal<ClienteCrm[]>([]);
  protected readonly cargando = signal(true);
  protected readonly guardando = signal(false);
  protected readonly error = signal('');
  protected readonly exito = signal('');
  protected readonly mostrarFormulario = signal(false);
  protected nuevo = {
    usuario: '', email: '', nombre: '', apellido: '', contrasena_temporal: '',
    roles: [] as string[], cliente_id: '', telefono: '',
  };

  constructor() { void this.cargar(); }

  protected async cargar(): Promise<void> {
    this.cargando.set(true); this.error.set('');
    try {
      const [usuarios, clientes] = await Promise.all([this.identidad.listar(), this.operaciones.listarClientes()]);
      this.usuarios.set(usuarios); this.clientes.set(clientes.contenido);
    } catch (error) { this.error.set(error instanceof Error ? error.message : 'No se pudo cargar identidad.'); }
    finally { this.cargando.set(false); }
  }

  protected alternarRol(rol: string, marcado: boolean): void {
    this.nuevo.roles = marcado
      ? [...new Set([...this.nuevo.roles, rol])]
      : this.nuevo.roles.filter((actual) => actual !== rol);
    if (!this.nuevo.roles.includes('cliente')) this.nuevo.cliente_id = '';
  }

  protected async crear(): Promise<void> {
    if (this.guardando()) return;
    this.guardando.set(true); this.error.set(''); this.exito.set('');
    try {
      await this.identidad.crear({
        ...this.nuevo,
        ...(this.nuevo.cliente_id ? { cliente_id: this.nuevo.cliente_id } : {}),
        ...(this.nuevo.telefono ? { telefono: this.nuevo.telefono } : {}),
      });
      this.nuevo = { usuario: '', email: '', nombre: '', apellido: '', contrasena_temporal: '', roles: [], cliente_id: '', telefono: '' };
      this.mostrarFormulario.set(false); this.exito.set('Cuenta creada. La contraseña deberá cambiarse en el primer ingreso.');
      await this.cargar();
    } catch (error) { this.error.set(error instanceof Error ? error.message : 'No se pudo crear la cuenta.'); }
    finally { this.guardando.set(false); }
  }

  protected async cambiarEstado(usuario: UsuarioIdentidad): Promise<void> {
    await this.ejecutar(async () => {
      await this.identidad.cambiarEstado(usuario.id, !usuario.habilitado);
      await this.cargar();
    }, usuario.habilitado ? 'Cuenta deshabilitada.' : 'Cuenta habilitada.');
  }

  protected async restablecer(usuario: UsuarioIdentidad): Promise<void> {
    const temporal = window.prompt(`Contraseña temporal para ${usuario.usuario}`);
    if (!temporal) return;
    await this.ejecutar(() => this.identidad.restablecerContrasena(usuario.id, temporal), 'Contraseña temporal actualizada.');
  }

  private async ejecutar(accion: () => Promise<void>, mensaje: string): Promise<void> {
    this.guardando.set(true); this.error.set(''); this.exito.set('');
    try { await accion(); this.exito.set(mensaje); }
    catch (error) { this.error.set(error instanceof Error ? error.message : 'No se pudo completar la operación.'); }
    finally { this.guardando.set(false); }
  }
}
