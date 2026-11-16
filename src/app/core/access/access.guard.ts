import { inject } from '@angular/core';
import { CanMatchFn, RedirectCommand, Router } from '@angular/router';
import { DemoStore } from '../state/demo.store';
import { NO_ACCESS_MESSAGE, ViewId } from './access';

/**
 * Guarda de las pantallas (§1.5):
 * - sin sesión, o con la sesión de un usuario que ya no existe o está inactivo → /ingreso (E05, R-15);
 * - con una pantalla que ninguno de los perfiles del usuario puede ver → su pantalla de inicio,
 *   con el aviso «Tu perfil no tiene acceso a esa pantalla» (E04).
 * Las pantallas vedadas tampoco aparecen en el menú ☰.
 */
export const accessGuard: CanMatchFn = (route) => {
  const store = inject(DemoStore);
  const router = inject(Router);
  const usuario = store.usuario();
  if (!usuario || !usuario.activo) {
    if (usuario) {
      store.cerrarSesion();
    }
    return router.parseUrl('/ingreso');
  }
  const view = route.data?.['view'] as ViewId | undefined;
  if (!view || store.canView(view)) {
    return true;
  }
  store.flash.set({ kind: 'warning', text: NO_ACCESS_MESSAGE });
  // El aviso viaja con la redirección: se ve en la pantalla de inicio y en ninguna otra.
  return new RedirectCommand(router.parseUrl(store.inicio()), store.conAviso());
};
