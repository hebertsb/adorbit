import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./paginas/login/login').then((m) => m.Login),
  },
  {
    path: '',
    loadComponent: () => import('./compartido/shell-principal/shell-principal').then((m) => m.ShellPrincipal),
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () => import('./paginas/dashboard/dashboard').then((m) => m.Dashboard),
      },
      {
        path: 'campanas',
        loadComponent: () => import('./paginas/campanas-lista/campanas-lista').then((m) => m.CampanasLista),
      },
      {
        path: 'campanas/nueva',
        loadComponent: () =>
          import('./paginas/campana-formulario/campana-formulario').then((m) => m.CampanaFormulario),
      },
      {
        path: 'campanas/:id',
        loadComponent: () => import('./paginas/campana-detalle/campana-detalle').then((m) => m.CampanaDetalle),
      },
      {
        path: 'campanas/:id/editar',
        loadComponent: () =>
          import('./paginas/campana-formulario/campana-formulario').then((m) => m.CampanaFormulario),
      },
      {
        path: 'sagas/:id',
        loadComponent: () => import('./paginas/saga-estado/saga-estado').then((m) => m.SagaEstado),
      },
      {
        path: 'creatividades',
        loadComponent: () => import('./paginas/creatividades/creatividades').then((m) => m.Creatividades),
      },
    ],
  },
];
