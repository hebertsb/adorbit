import { inject } from '@angular/core';
import { Routes } from '@angular/router';
import { AutenticacionService } from './core/auth/autenticacion.service';
import { requiereRoles, requiereSesion } from './core/auth/guardas-ruta';

const ROLES_GESTION = ['ejecutivo', 'gerente'] as const;
const ROLES_CREATIVIDAD = ['creativo', 'ejecutivo', 'gerente'] as const;

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./paginas/login/login').then((m) => m.Login),
  },
  {
    path: '',
    canActivate: [requiereSesion],
    loadComponent: () =>
      import('./compartido/shell-principal/shell-principal').then((m) => m.ShellPrincipal),
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: () => {
          const auth = inject(AutenticacionService);
          if (auth.tieneRol('ejecutivo') || auth.tieneRol('gerente')) return 'dashboard';
          if (auth.tieneRol('creativo')) return 'creatividades';
          return 'sin-acceso';
        },
      },
      {
        path: 'dashboard',
        canActivate: [requiereRoles(...ROLES_GESTION)],
        loadComponent: () => import('./paginas/dashboard/dashboard').then((m) => m.Dashboard),
      },
      {
        path: 'campanas',
        canActivate: [requiereRoles(...ROLES_GESTION)],
        loadComponent: () =>
          import('./paginas/campanas-lista/campanas-lista').then((m) => m.CampanasLista),
      },
      {
        path: 'campanas/nueva',
        canActivate: [requiereRoles(...ROLES_GESTION)],
        loadComponent: () =>
          import('./paginas/campana-formulario/campana-formulario').then(
            (m) => m.CampanaFormulario,
          ),
      },
      {
        path: 'campanas/:id',
        canActivate: [requiereRoles(...ROLES_GESTION)],
        loadComponent: () =>
          import('./paginas/campana-detalle/campana-detalle').then((m) => m.CampanaDetalle),
      },
      {
        path: 'campanas/:id/editar',
        canActivate: [requiereRoles(...ROLES_GESTION)],
        loadComponent: () =>
          import('./paginas/campana-formulario/campana-formulario').then(
            (m) => m.CampanaFormulario,
          ),
      },
      {
        path: 'sagas/:id',
        canActivate: [requiereRoles(...ROLES_GESTION)],
        loadComponent: () => import('./paginas/saga-estado/saga-estado').then((m) => m.SagaEstado),
      },
      {
        path: 'saga/:id',
        redirectTo: 'sagas/:id',
      },
      {
        path: 'reportes',
        canActivate: [requiereRoles(...ROLES_GESTION)],
        loadComponent: () =>
          import('./paginas/panel-inteligencia/panel-inteligencia').then(
            (m) => m.PanelInteligencia,
          ),
      },
      {
        path: 'clientes',
        canActivate: [requiereRoles(...ROLES_GESTION)],
        loadComponent: () => import('./paginas/clientes/clientes').then((m) => m.Clientes),
      },
      {
        path: 'clientes/:id',
        canActivate: [requiereRoles(...ROLES_GESTION)],
        loadComponent: () =>
          import('./paginas/cliente-detalle/cliente-detalle').then((m) => m.ClienteDetalle),
      },
      {
        path: 'facturacion',
        canActivate: [requiereRoles(...ROLES_GESTION)],
        loadComponent: () => import('./paginas/facturacion/facturacion').then((m) => m.Facturacion),
      },
      {
        path: 'usuarios',
        canActivate: [requiereRoles('gerente')],
        loadComponent: () => import('./paginas/usuarios/usuarios').then((m) => m.Usuarios),
      },
      {
        path: 'creatividades',
        canActivate: [requiereRoles(...ROLES_CREATIVIDAD)],
        loadComponent: () =>
          import('./paginas/creatividades/creatividades').then((m) => m.Creatividades),
      },
      {
        path: 'sin-acceso',
        loadComponent: () => import('./paginas/estado-ruta/estado-ruta').then((m) => m.EstadoRuta),
      },
      {
        path: '**',
        loadComponent: () => import('./paginas/estado-ruta/estado-ruta').then((m) => m.EstadoRuta),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
