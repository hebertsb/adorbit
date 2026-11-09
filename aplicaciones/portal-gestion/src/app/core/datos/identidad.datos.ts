import { inject, Injectable } from '@angular/core';
import { AutenticacionService } from '../auth/autenticacion.service';

const URL = 'http://localhost:8000/api/v1/administracion';

export interface UsuarioIdentidad {
  id: string;
  usuario: string;
  email: string;
  nombre: string;
  habilitado: boolean;
  cliente_id: string | null;
  telefono?: string | null;
  roles: string[];
}

@Injectable({ providedIn: 'root' })
export class IdentidadDatos {
  private readonly auth = inject(AutenticacionService);

  private async solicitar<T>(ruta: string, opciones: RequestInit = {}): Promise<T> {
    const respuesta = await fetch(`${URL}${ruta}`, {
      ...opciones,
      headers: {
        Authorization: `Bearer ${this.auth.token()}`,
        ...(opciones.body ? { 'Content-Type': 'application/json' } : {}),
        ...opciones.headers,
      },
    });
    if (!respuesta.ok) {
      const detalle = await respuesta.json().catch(() => ({})) as { mensaje?: string };
      throw new Error(detalle.mensaje ?? `No se pudo completar la operación (${respuesta.status}).`);
    }
    if (respuesta.status === 204) return undefined as T;
    return respuesta.json() as Promise<T>;
  }

  async listar(): Promise<UsuarioIdentidad[]> {
    return (await this.solicitar<{ contenido: UsuarioIdentidad[] }>('/usuarios')).contenido;
  }

  crear(cuerpo: Record<string, unknown>): Promise<UsuarioIdentidad> {
    return this.solicitar('/usuarios', { method: 'POST', body: JSON.stringify(cuerpo) });
  }

  cambiarEstado(id: string, habilitado: boolean): Promise<void> {
    return this.solicitar(`/usuarios/${encodeURIComponent(id)}/estado`, {
      method: 'PUT', body: JSON.stringify({ habilitado }),
    });
  }

  restablecerContrasena(id: string, contrasenaTemporal: string): Promise<void> {
    return this.solicitar(`/usuarios/${encodeURIComponent(id)}/contrasena`, {
      method: 'PUT', body: JSON.stringify({ contrasena_temporal: contrasenaTemporal }),
    });
  }
}
