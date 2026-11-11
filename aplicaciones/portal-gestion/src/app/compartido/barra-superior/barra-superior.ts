import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { TemaService } from '../../core/tema.service';
import { AutenticacionService } from '../../core/auth/autenticacion.service';
import { CampanasDatos } from '../../core/datos/campanas.datos';
import { ClienteCrm, GestionOperativaDatos } from '../../core/datos/gestion-operativa.datos';
import { OfflineSyncService } from '../../core/offline/offline-sync.service';

@Component({
  selector: 'ao-barra-superior',
  templateUrl: './barra-superior.html',
  styleUrl: './barra-superior.css',
})
export class BarraSuperior {
  protected readonly tema = inject(TemaService);
  protected readonly offline = inject(OfflineSyncService);
  private readonly auth = inject(AutenticacionService);
  private readonly router = inject(Router);
  private readonly campanas = inject(CampanasDatos);
  private readonly operaciones = inject(GestionOperativaDatos);

  protected readonly consulta = signal('');
  protected readonly buscadorAbierto = signal(false);
  protected readonly notificacionesAbiertas = signal(false);
  protected readonly colaOfflineAbierta = signal(false);
  protected readonly tieneSincronizadas = computed(() =>
    this.offline.bandeja().some((op) => op.estado === 'sincronizado'),
  );
  protected readonly clientes = signal<ClienteCrm[]>([]);

  protected readonly usuario = computed(() => this.auth.usuario());
  protected readonly resultadosCampanas = computed(() => {
    const q = this.normalizar(this.consulta());
    if (q.length < 2) return [];
    return this.campanas
      .listar()
      .filter((item) =>
        this.normalizar(`${item.codigoReferencia} ${item.nombre} ${item.cliente}`).includes(q),
      )
      .slice(0, 5);
  });
  protected readonly resultadosClientes = computed(() => {
    const q = this.normalizar(this.consulta());
    if (q.length < 2) return [];
    return this.clientes()
      .filter((item) => this.normalizar(`${item.razon_social} ${item.nit ?? ''}`).includes(q))
      .slice(0, 5);
  });
  protected readonly alertas = computed(() =>
    this.campanas
      .listar()
      .filter(
        (item) => item.presupuestoTotal > 0 && item.montoGastado / item.presupuestoTotal >= 0.85,
      )
      .slice(0, 6),
  );

  constructor() {
    if (this.auth.tieneRol('ejecutivo') || this.auth.tieneRol('gerente')) {
      void this.operaciones
        .listarClientes()
        .then((pagina) => this.clientes.set(pagina.contenido))
        .catch(() => this.clientes.set([]));
    }
  }

  protected readonly nombreUsuario = computed(() => {
    const u = this.usuario();
    return u ? u.nombre : 'Roly Ejecutivo';
  });

  protected readonly rolUsuario = computed(() => {
    const u = this.usuario();
    if (!u || u.roles.length === 0) return 'Ejecutivo de cuentas';
    if (
      u.roles.includes('gerente') &&
      u.roles.includes('ejecutivo') &&
      u.roles.includes('creativo')
    ) {
      return 'Administrador global';
    }
    const primerRol = u.roles[0];
    switch (primerRol) {
      case 'ejecutivo':
        return 'Ejecutivo de cuentas';
      case 'creativo':
        return 'Diseñador creativo';
      case 'gerente':
        return 'Gerente de cuentas';
      case 'cliente':
        return 'Cliente anunciante';
      default:
        return primerRol;
    }
  });

  cerrarSesion(): void {
    this.auth.cerrarSesion();
    this.router.navigateByUrl('/login');
  }

  protected abrir(ruta: string): void {
    this.buscadorAbierto.set(false);
    this.notificacionesAbiertas.set(false);
    this.consulta.set('');
    void this.router.navigateByUrl(ruta);
  }

  private normalizar(valor: string): string {
    return valor
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .toLowerCase()
      .trim();
  }
}
