import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { configuracionCompleta, usuariosDeEmpresa } from '../../core/simulation/selectors';
import { DemoStore } from '../../core/state/demo.store';
import { BadgeComponent } from '../../shared/badges.component';
import { FechaPipe } from '../../shared/pipes';

/**
 * V02 · Empresas (F01, RN-01): el administrador de la plataforma ve las empresas con sus
 * usuarios activos y su configuración. No ve cifras, flota ni cuentas de ninguna empresa.
 */
@Component({
  selector: 'app-empresas',
  imports: [RouterLink, BadgeComponent, FechaPipe],
  template: `
    <div class="mb-3 flex flex-wrap items-center gap-2">
      <h1 class="page-title flex-1">Empresas</h1>
      @if (store.can('empresa.crear')) {
        <a class="btn btn-primary" routerLink="/admin/empresas/nueva" data-testid="nueva-empresa">Nueva empresa</a>
      }
    </div>
    <p class="mb-4 text-sm text-muted">Empresas distribuidoras que usan GasLink. Cada una ve solo sus datos. Abre una para ver sus usuarios.</p>

    <section class="card overflow-x-auto">
      <table class="table" data-testid="tabla-empresas">
        <thead>
          <tr>
            <th>Id</th>
            <th>Empresa</th>
            <th>Ciudad</th>
            <th>Usuarios activos</th>
            <th>Alta</th>
            <th>Configuración</th>
          </tr>
        </thead>
        <tbody>
          @for (e of filas(); track e.id) {
            <tr [attr.data-testid]="'empresa-' + e.id">
              <td class="font-mono whitespace-nowrap">{{ e.id }}</td>
              <td>
                <a class="font-semibold text-primary underline" [routerLink]="'/admin/empresas/' + e.id" [attr.data-testid]="'abrir-' + e.id">{{ e.nombre }}</a>
              </td>
              <td>{{ e.ciudad || '—' }}</td>
              <td class="whitespace-nowrap" [attr.data-testid]="'usuarios-' + e.id">{{ e.activos }} de {{ e.total }}</td>
              <td class="whitespace-nowrap">{{ e.creadaEn | fecha }}</td>
              <td>
                <app-badge [tone]="e.completa ? 'ok' : 'warn'" [attr.data-testid]="'config-' + e.id">{{
                  e.completa ? 'Configuración completa' : 'Configuración pendiente'
                }}</app-badge>
              </td>
            </tr>
          }
        </tbody>
      </table>
      <p class="mt-2 text-xs text-muted" data-testid="total-empresas">{{ filas().length }} empresas</p>
    </section>
  `,
})
export class EmpresasComponent {
  readonly store = inject(DemoStore);

  readonly filas = computed(() => {
    const s = this.store.state();
    return s.empresas.map((e) => {
      const usuarios = usuariosDeEmpresa(s, e.id);
      return { ...e, activos: usuarios.filter((u) => u.activo).length, total: usuarios.length, completa: configuracionCompleta(s, e.id) };
    });
  });
}
