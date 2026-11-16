import { inject } from '@angular/core';
import { CanMatchFn, Router } from '@angular/router';
import { DemoStore } from '../state/demo.store';
import { homeFor, NO_ACCESS_MESSAGE, ViewId } from './access';

/**
 * Guarda de las vistas (§1.2): sin sesión lleva a /ingreso (E05); con un perfil sin acceso
 * lleva a la pantalla de inicio del perfil con el aviso «Tu perfil no tiene acceso a esa
 * pantalla» (E04). Las vistas vedadas tampoco aparecen en el menú.
 */
export const accessGuard: CanMatchFn = (route) => {
  const store = inject(DemoStore);
  const router = inject(Router);
  const perfil = store.perfil();
  if (!perfil) {
    return router.parseUrl('/ingreso');
  }
  const view = route.data?.['view'] as ViewId | undefined;
  if (!view || store.canView(view)) {
    return true;
  }
  store.flash.set({ kind: 'warning', text: NO_ACCESS_MESSAGE });
  return router.parseUrl(homeFor(perfil));
};
