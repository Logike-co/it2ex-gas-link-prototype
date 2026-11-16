import { ViewId } from './core/access/access';

/** Las 10 vistas de la demo y sus rutas exactas (prototype.yaml → screens[]). */
export interface ViewDef {
  id: ViewId;
  name: string;
  path: string;
}

export const VIEWS: ViewDef[] = [
  { id: 'V01', name: 'Ingreso por perfil', path: 'ingreso' },
  { id: 'V02', name: 'Empresas', path: 'admin/empresas' },
  { id: 'V03', name: 'Catálogo y llave', path: 'empresa/catalogo' },
  { id: 'V04', name: 'Flota', path: 'empresa/flota' },
  { id: 'V05', name: 'Cargue', path: 'empresa/cargue' },
  { id: 'V06', name: 'Mi camión y nueva venta', path: 'conductor/venta' },
  { id: 'V07', name: 'Cobro con QR', path: 'conductor/cobro' },
  { id: 'V08', name: 'Registro de montos', path: 'conductor/montos' },
  { id: 'V09', name: 'Cuenta del vendedor e informe', path: 'cuenta' },
  { id: 'V10', name: 'Conciliación', path: 'empresa/conciliacion' },
];

export const pathOf = (id: ViewId): string => VIEWS.find((v) => v.id === id)?.path ?? 'ingreso';

/** Vista de una URL (`/conductor/cobro?venta=…` → V07); null fuera de las 10 vistas. */
export function viewOfUrl(url: string): ViewId | null {
  const path = url.split(/[?#]/)[0].replace(/^\/+|\/+$/g, '');
  return VIEWS.find((v) => v.path === path)?.id ?? null;
}
