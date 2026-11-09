import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AutenticacionService } from './autenticacion.service';

export const requiereSesion: CanActivateFn = () => {
  const auth = inject(AutenticacionService);
  const router = inject(Router);
  return auth.estaAutenticado() ? true : router.createUrlTree(['/login']);
};

export function requiereRoles(...roles: string[]): CanActivateFn {
  return () => {
    const auth = inject(AutenticacionService);
    const router = inject(Router);
    if (!auth.estaAutenticado()) return router.createUrlTree(['/login']);
    return roles.some((rol) => auth.tieneRol(rol)) ? true : router.createUrlTree(['/sin-acceso']);
  };
}
