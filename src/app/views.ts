import type { ViewId } from './core/access/access';

/**
 * Las 35 pantallas de la demo y sus rutas exactas (prototype.yaml v2 → screens[]). Una pantalla
 * hija lleva `parent`: la opción del menú ☰ que queda marcada mientras está abierta (§1.3).
 */
export interface ViewDef {
  id: ViewId;
  name: string;
  /** Ruta sin «/» inicial; los parámetros van con «:» (`empresa/cuentas/:vendedorId`). */
  path: string;
  parent?: ViewId;
}

export const VIEWS: ViewDef[] = [
  { id: 'V01', name: 'Ingreso', path: 'ingreso' },
  { id: 'V02', name: 'Empresas', path: 'admin/empresas' },
  { id: 'V03', name: 'Nueva empresa', path: 'admin/empresas/nueva', parent: 'V02' },
  { id: 'V04', name: 'Detalle de la empresa', path: 'admin/empresas/:empresaId', parent: 'V02' },
  { id: 'V05', name: 'Usuarios de la empresa', path: 'admin/empresas/:empresaId/usuarios', parent: 'V02' },
  { id: 'V06', name: 'Nuevo usuario de la empresa', path: 'admin/empresas/:empresaId/usuarios/nuevo', parent: 'V02' },
  { id: 'V07', name: 'Catálogo de cilindros', path: 'empresa/configuracion/catalogo' },
  { id: 'V08', name: 'Llave de cobro', path: 'empresa/configuracion/llave' },
  { id: 'V09', name: 'Vendedores', path: 'empresa/flota/vendedores' },
  { id: 'V10', name: 'Nuevo vendedor', path: 'empresa/flota/vendedores/nuevo', parent: 'V09' },
  { id: 'V11', name: 'Detalle del vendedor', path: 'empresa/flota/vendedores/:vendedorId', parent: 'V09' },
  { id: 'V12', name: 'Camiones', path: 'empresa/flota/camiones' },
  { id: 'V13', name: 'Nuevo camión', path: 'empresa/flota/camiones/nuevo', parent: 'V12' },
  { id: 'V14', name: 'Conductores', path: 'empresa/flota/conductores' },
  { id: 'V15', name: 'Nuevo conductor', path: 'empresa/flota/conductores/nuevo', parent: 'V14' },
  { id: 'V16', name: 'Cargues', path: 'empresa/cargues' },
  { id: 'V17', name: 'Nuevo cargue', path: 'empresa/cargues/nuevo', parent: 'V16' },
  { id: 'V18', name: 'Detalle del cargue', path: 'empresa/cargues/:cargaId', parent: 'V16' },
  { id: 'V19', name: 'Cuentas de vendedores', path: 'empresa/cuentas' },
  { id: 'V20', name: 'Cuenta del vendedor', path: 'empresa/cuentas/:vendedorId', parent: 'V19' },
  { id: 'V21', name: 'Informe de la cuenta', path: 'empresa/cuentas/:vendedorId/informe', parent: 'V19' },
  { id: 'V22', name: 'Conciliación', path: 'empresa/conciliacion' },
  { id: 'V23', name: 'Conciliación del vendedor', path: 'empresa/conciliacion/:vendedorId', parent: 'V22' },
  { id: 'V24', name: 'Pagos de vendedores', path: 'empresa/pagos' },
  { id: 'V25', name: 'Registrar pago del vendedor', path: 'empresa/pagos/nuevo', parent: 'V24' },
  { id: 'V26', name: 'Mi cuenta', path: 'vendedor/cuenta' },
  { id: 'V27', name: 'Detalle de mi carga', path: 'vendedor/cargas/:cargaId', parent: 'V26' },
  { id: 'V28', name: 'Mis movimientos', path: 'vendedor/movimientos' },
  { id: 'V29', name: 'Mi informe', path: 'vendedor/informe' },
  { id: 'V30', name: 'Mi camión', path: 'conductor/camion' },
  { id: 'V31', name: 'Nueva venta', path: 'conductor/ventas/nueva' },
  { id: 'V32', name: 'Mis ventas', path: 'conductor/ventas' },
  { id: 'V33', name: 'Detalle de la venta', path: 'conductor/ventas/:ventaId', parent: 'V32' },
  { id: 'V34', name: 'Cobro con QR', path: 'conductor/ventas/:ventaId/cobro', parent: 'V32' },
  { id: 'V35', name: 'Registro de montos', path: 'conductor/ventas/:ventaId/montos', parent: 'V32' },
];

const byId = new Map(VIEWS.map((v) => [v.id, v]));

export const viewDef = (id: ViewId): ViewDef | undefined => byId.get(id);

export const pathOf = (id: ViewId): string => byId.get(id)?.path ?? 'ingreso';

/** Opción del menú ☰ que se marca en una pantalla: la propia o la de su padre (§1.2). */
export const menuViewOf = (id: ViewId | null): ViewId | null => (id ? (byId.get(id)?.parent ?? id) : null);

/**
 * Pantalla de una URL (`/conductor/ventas/VTA-A-004/cobro` → V34); null fuera de las 35. Las
 * rutas literales ganan a las de parámetro (`/empresa/cargues/nuevo` es V17, no V18).
 */
export function viewOfUrl(url: string): ViewId | null {
  const segs = url.split(/[?#]/)[0].replace(/^\/+|\/+$/g, '').split('/');
  let best: { id: ViewId; params: number } | null = null;
  for (const v of VIEWS) {
    const pat = v.path.split('/');
    if (pat.length !== segs.length) continue;
    let params = 0;
    const matches = pat.every((p, i) => {
      if (p.startsWith(':')) {
        params++;
        return segs[i] !== '';
      }
      return p === segs[i];
    });
    if (matches && (!best || params < best.params)) {
      best = { id: v.id, params };
    }
  }
  return best?.id ?? null;
}
