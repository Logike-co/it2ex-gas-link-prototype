import { Routes } from '@angular/router';
import { accessGuard } from './core/access/access.guard';

const title = (name: string) => `${name} · GasLink · Demo`;

/** Rutas de las 10 vistas (prototype.yaml → screens[]). */
export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'ingreso' },
  {
    path: 'ingreso',
    title: title('Ingreso'),
    data: { view: 'V01' },
    loadComponent: () => import('./features/ingreso/ingreso.component').then((m) => m.IngresoComponent),
  },
  {
    path: 'admin/empresas',
    title: title('Empresas'),
    canMatch: [accessGuard],
    data: { view: 'V02' },
    loadComponent: () => import('./features/empresas/empresas.component').then((m) => m.EmpresasComponent),
  },
  {
    path: 'empresa/catalogo',
    title: title('Catálogo y llave'),
    canMatch: [accessGuard],
    data: { view: 'V03' },
    loadComponent: () => import('./features/catalogo/catalogo.component').then((m) => m.CatalogoComponent),
  },
  {
    path: 'empresa/flota',
    title: title('Flota'),
    canMatch: [accessGuard],
    data: { view: 'V04' },
    loadComponent: () => import('./features/flota/flota.component').then((m) => m.FlotaComponent),
  },
  {
    path: 'empresa/cargue',
    title: title('Cargue'),
    canMatch: [accessGuard],
    data: { view: 'V05' },
    loadComponent: () => import('./features/cargue/cargue.component').then((m) => m.CargueComponent),
  },
  {
    path: 'conductor/venta',
    title: title('Mi camión y nueva venta'),
    canMatch: [accessGuard],
    data: { view: 'V06' },
    loadComponent: () => import('./features/venta/venta.component').then((m) => m.VentaComponent),
  },
  {
    path: 'conductor/cobro',
    title: title('Cobro con QR'),
    canMatch: [accessGuard],
    data: { view: 'V07' },
    loadComponent: () => import('./features/cobro/cobro.component').then((m) => m.CobroComponent),
  },
  {
    path: 'conductor/montos',
    title: title('Registro de montos'),
    canMatch: [accessGuard],
    data: { view: 'V08' },
    loadComponent: () => import('./features/montos/montos.component').then((m) => m.MontosComponent),
  },
  {
    path: 'cuenta',
    title: title('Cuenta del vendedor'),
    canMatch: [accessGuard],
    data: { view: 'V09' },
    loadComponent: () => import('./features/cuenta/cuenta.component').then((m) => m.CuentaComponent),
  },
  {
    path: 'empresa/conciliacion',
    title: title('Conciliación'),
    canMatch: [accessGuard],
    data: { view: 'V10' },
    loadComponent: () => import('./features/conciliacion/conciliacion.component').then((m) => m.ConciliacionComponent),
  },
  { path: '**', redirectTo: 'ingreso' },
];
