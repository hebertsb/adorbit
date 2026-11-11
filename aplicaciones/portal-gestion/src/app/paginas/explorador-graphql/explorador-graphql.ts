import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AutenticacionService } from '../../core/auth/autenticacion.service';

const ES_DEV_LOCAL = typeof window !== 'undefined' && window.location.port === '4200';
const URL_GRAPHQL = ES_DEV_LOCAL ? 'http://localhost:8000/graphql' : '/graphql';

interface ConsultaPredefinida {
  nombre: string;
  descripcion: string;
  consulta: string;
}

/** Consultas de solo lectura contra el esquema de la pasarela (contratos/graphql). */
const CONSULTAS: ConsultaPredefinida[] = [
  {
    nombre: 'Campañas (pocos campos)',
    descripcion: 'Solo se piden id, nombre y estado: la respuesta trae exactamente eso.',
    consulta: `query ListarCampanas {
  campanas(limite: 5) {
    id
    nombre
    estado
  }
}`,
  },
  {
    nombre: 'Campaña + cliente + piezas',
    descripcion:
      'Una sola petición junta datos de ms-campanas, ms-clientes-crm y ms-creatividades.',
    consulta: `query CampanasConRelaciones {
  campanas(limite: 3) {
    nombre
    estado
    presupuesto { montoTotal montoGastado moneda }
    cliente { razonSocial nit }
    piezas { titulo tipoMedio estado }
  }
}`,
  },
  {
    nombre: 'Campañas activas con facturas',
    descripcion: 'Filtro por argumento (estado) y relación con ms-facturacion.',
    consulta: `query CampanasActivas {
  campanas(estado: activa, limite: 5) {
    nombre
    facturas { total moneda estado fechaVencimiento }
  }
}`,
  },
];

/**
 * Explorador GraphQL de demostración. No figura en el menú: se abre solo escribiendo
 * la ruta /explorador-graphql. Usa el token de la sesión iniciada.
 */
@Component({
  selector: 'ao-pagina-explorador-graphql',
  imports: [FormsModule],
  templateUrl: './explorador-graphql.html',
  styleUrl: './explorador-graphql.css',
})
export class ExploradorGraphql {
  private readonly auth = inject(AutenticacionService);

  protected readonly consultas = CONSULTAS;
  protected readonly seleccionada = signal(0);
  protected readonly consulta = signal(CONSULTAS[0].consulta);
  protected readonly respuesta = signal('');
  protected readonly ejecutando = signal(false);
  protected readonly estadoHttp = signal<number | null>(null);
  protected readonly duracionMs = signal<number | null>(null);

  protected elegir(indice: number): void {
    this.seleccionada.set(indice);
    this.consulta.set(this.consultas[indice].consulta);
    this.respuesta.set('');
    this.estadoHttp.set(null);
    this.duracionMs.set(null);
  }

  protected async ejecutar(): Promise<void> {
    this.ejecutando.set(true);
    const inicio = performance.now();
    try {
      const cabeceras: Record<string, string> = { 'Content-Type': 'application/json' };
      const token = this.auth.token();
      if (token) cabeceras['Authorization'] = `Bearer ${token}`;

      const res = await fetch(URL_GRAPHQL, {
        method: 'POST',
        headers: cabeceras,
        body: JSON.stringify({ query: this.consulta() }),
      });
      this.estadoHttp.set(res.status);
      const texto = await res.text();
      try {
        this.respuesta.set(JSON.stringify(JSON.parse(texto), null, 2));
      } catch {
        this.respuesta.set(texto);
      }
    } catch (error) {
      this.estadoHttp.set(null);
      this.respuesta.set(`Error de red: ${(error as Error).message}`);
    } finally {
      this.duracionMs.set(Math.round(performance.now() - inicio));
      this.ejecutando.set(false);
    }
  }
}
