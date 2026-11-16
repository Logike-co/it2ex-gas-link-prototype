import { Perfil } from '../simulation/model';

/**
 * Matriz de acceso vista × perfil (flow-map §1.2). Es la fuente única del menú, la guarda de
 * rutas y los botones de cada vista (ALC-01).
 */
export type ViewId = 'V01' | 'V02' | 'V03' | 'V04' | 'V05' | 'V06' | 'V07' | 'V08' | 'V09' | 'V10';

export const VIEW_ACCESS: Record<ViewId, readonly Perfil[]> = {
  V01: [],
  V02: ['administrador'],
  V03: ['empresa'],
  V04: ['empresa'],
  V05: ['empresa'],
  V06: ['conductor'],
  V07: ['conductor'],
  V08: ['conductor'],
  V09: ['empresa', 'vendedor'],
  V10: ['empresa'],
};

/** Acciones restringidas dentro de las vistas (§1.2). */
export type AccessAction =
  | 'empresa.crear'
  | 'catalogo.editar'
  | 'flota.editar'
  | 'carga.registrar'
  | 'cobro.marcarLlegada'
  | 'pago.registrar'
  | 'venta.registrar'
  | 'cobro.registrar';

export const ACTION_ACCESS: Record<AccessAction, readonly Perfil[]> = {
  'empresa.crear': ['administrador'],
  'catalogo.editar': ['empresa'],
  'flota.editar': ['empresa'],
  'carga.registrar': ['empresa'],
  'cobro.marcarLlegada': ['empresa'],
  'pago.registrar': ['empresa'],
  'venta.registrar': ['conductor'],
  'cobro.registrar': ['conductor'],
};

/** Menú de cada perfil, en el orden de §1.1 (E01). */
export const MENU: Record<Perfil, readonly { view: ViewId; label: string }[]> = {
  administrador: [{ view: 'V02', label: 'Empresas' }],
  empresa: [
    { view: 'V05', label: 'Cargue' },
    { view: 'V09', label: 'Cuentas' },
    { view: 'V10', label: 'Conciliación' },
    { view: 'V04', label: 'Flota' },
    { view: 'V03', label: 'Catálogo y llave' },
  ],
  vendedor: [{ view: 'V09', label: 'Mi cuenta' }],
  conductor: [
    { view: 'V06', label: 'Nueva venta' },
    { view: 'V07', label: 'Cobro con QR' },
    { view: 'V08', label: 'Registro de montos' },
  ],
};

/** Pantalla de inicio de cada perfil (§1.1). */
export const HOME: Record<Perfil, string> = {
  administrador: '/admin/empresas',
  empresa: '/empresa/cargue',
  vendedor: '/cuenta',
  conductor: '/conductor/venta',
};

export const canView = (perfil: Perfil | null | undefined, view: ViewId): boolean =>
  view === 'V01' || (!!perfil && VIEW_ACCESS[view].includes(perfil));

export const can = (perfil: Perfil | null | undefined, action: AccessAction): boolean =>
  !!perfil && ACTION_ACCESS[action].includes(perfil);

export const homeFor = (perfil: Perfil): string => HOME[perfil];

export const NO_ACCESS_MESSAGE = 'Tu perfil no tiene acceso a esa pantalla';
