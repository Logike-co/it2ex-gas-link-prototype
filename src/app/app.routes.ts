import { Route, Routes } from '@angular/router';
import { ViewId } from './core/access/access';
import { accessGuard } from './core/access/access.guard';
import { viewDef } from './views';

const title = (view: ViewId) => `${viewDef(view)?.name ?? ''} · GasLink · Demo`;

/** Pantalla protegida por la guarda: `data.view` es su id del manifiesto (V01–V35). */
const screen = (path: string, view: ViewId, loadComponent: Route['loadComponent'], data: Record<string, unknown> = {}): Route => ({
  path,
  title: title(view),
  canMatch: [accessGuard],
  data: { view, ...data },
  loadComponent,
});

/**
 * Rutas de las 35 pantallas (prototype.yaml v2 → screens[]), anidadas por rol. Las rutas
 * literales (`nueva`, `nuevo`) van antes de las de parámetro para que «nuevo» no se lea como
 * un id (flow-map §1.4).
 */
export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'ingreso' },
  {
    path: 'ingreso',
    title: title('V01'),
    data: { view: 'V01' },
    loadComponent: () => import('./features/ingreso/ingreso.component').then((m) => m.IngresoComponent),
  },
  {
    path: 'admin',
    children: [
      screen('empresas', 'V02', () => import('./features/empresas/empresas.component').then((m) => m.EmpresasComponent)),
      screen('empresas/nueva', 'V03', () => import('./features/empresas/nueva-empresa.component').then((m) => m.NuevaEmpresaComponent)),
      screen('empresas/:empresaId', 'V04', () => import('./features/empresas/empresa-detalle.component').then((m) => m.EmpresaDetalleComponent)),
      screen('empresas/:empresaId/usuarios', 'V05', () =>
        import('./features/empresas/usuarios-empresa.component').then((m) => m.UsuariosEmpresaComponent)
      ),
      screen('empresas/:empresaId/usuarios/nuevo', 'V06', () =>
        import('./features/empresas/nuevo-usuario.component').then((m) => m.NuevoUsuarioComponent)
      ),
    ],
  },
  {
    path: 'empresa',
    children: [
      screen('configuracion/catalogo', 'V07', () => import('./features/catalogo/catalogo.component').then((m) => m.CatalogoComponent)),
      screen('configuracion/llave', 'V08', () => import('./features/catalogo/llave.component').then((m) => m.LlaveComponent)),
      screen('flota/vendedores', 'V09', () => import('./features/flota/vendedores.component').then((m) => m.VendedoresComponent)),
      screen('flota/vendedores/nuevo', 'V10', () => import('./features/flota/nuevo-vendedor.component').then((m) => m.NuevoVendedorComponent)),
      screen('flota/vendedores/:vendedorId', 'V11', () =>
        import('./features/flota/vendedor-detalle.component').then((m) => m.VendedorDetalleComponent)
      ),
      screen('flota/camiones', 'V12', () => import('./features/flota/camiones.component').then((m) => m.CamionesComponent)),
      screen('flota/camiones/nuevo', 'V13', () => import('./features/flota/nuevo-camion.component').then((m) => m.NuevoCamionComponent)),
      screen('flota/conductores', 'V14', () => import('./features/flota/conductores.component').then((m) => m.ConductoresComponent)),
      screen('flota/conductores/nuevo', 'V15', () =>
        import('./features/flota/nuevo-conductor.component').then((m) => m.NuevoConductorComponent)
      ),
      screen('cargues', 'V16', () => import('./features/cargue/cargues.component').then((m) => m.CarguesComponent)),
      screen('cargues/nuevo', 'V17', () => import('./features/cargue/nuevo-cargue.component').then((m) => m.NuevoCargueComponent)),
      screen('cargues/:cargaId', 'V18', () => import('./features/cargue/carga-detalle.component').then((m) => m.CargaDetalleComponent), {
        modo: 'empresa',
      }),
      screen('cuentas', 'V19', () => import('./features/cuenta/cuentas.component').then((m) => m.CuentasComponent)),
      screen('cuentas/:vendedorId', 'V20', () => import('./features/cuenta/cuenta.component').then((m) => m.CuentaComponent), {
        modo: 'empresa',
      }),
      screen('cuentas/:vendedorId/informe', 'V21', () => import('./features/cuenta/informe.component').then((m) => m.InformeComponent), {
        modo: 'empresa',
      }),
      screen('conciliacion', 'V22', () => import('./features/conciliacion/conciliacion.component').then((m) => m.ConciliacionComponent)),
      screen('conciliacion/:vendedorId', 'V23', () =>
        import('./features/conciliacion/conciliacion-vendedor.component').then((m) => m.ConciliacionVendedorComponent)
      ),
      screen('pagos', 'V24', () => import('./features/conciliacion/pagos.component').then((m) => m.PagosComponent)),
      screen('pagos/nuevo', 'V25', () => import('./features/conciliacion/registrar-pago.component').then((m) => m.RegistrarPagoComponent)),
    ],
  },
  {
    path: 'vendedor',
    children: [
      screen('cuenta', 'V26', () => import('./features/cuenta/cuenta.component').then((m) => m.CuentaComponent), { modo: 'vendedor' }),
      screen('cargas/:cargaId', 'V27', () => import('./features/cargue/carga-detalle.component').then((m) => m.CargaDetalleComponent), {
        modo: 'vendedor',
      }),
      screen('movimientos', 'V28', () => import('./features/cuenta/movimientos.component').then((m) => m.MovimientosComponent)),
      screen('informe', 'V29', () => import('./features/cuenta/informe.component').then((m) => m.InformeComponent), { modo: 'vendedor' }),
    ],
  },
  {
    path: 'conductor',
    children: [
      screen('camion', 'V30', () => import('./features/venta/mi-camion.component').then((m) => m.MiCamionComponent)),
      screen('ventas/nueva', 'V31', () => import('./features/venta/nueva-venta.component').then((m) => m.NuevaVentaComponent)),
      screen('ventas', 'V32', () => import('./features/venta/mis-ventas.component').then((m) => m.MisVentasComponent)),
      screen('ventas/:ventaId', 'V33', () => import('./features/venta/venta-detalle.component').then((m) => m.VentaDetalleComponent)),
      screen('ventas/:ventaId/cobro', 'V34', () => import('./features/cobro/cobro.component').then((m) => m.CobroComponent)),
      screen('ventas/:ventaId/montos', 'V35', () => import('./features/montos/montos.component').then((m) => m.MontosComponent)),
    ],
  },
  { path: '**', redirectTo: 'ingreso' },
];
