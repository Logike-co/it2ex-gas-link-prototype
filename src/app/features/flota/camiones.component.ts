import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { vendedorNombre } from '../../core/simulation/selectors';
import { DemoStore } from '../../core/state/demo.store';

/** V12 · Camiones (F04, RV-04): placa, dueño (enlace a su detalle) y conductores asignados. */
@Component({
  selector: 'app-camiones',
  imports: [RouterLink],
  template: `
    <div class="mb-3 flex flex-wrap items-center gap-2">
      <h1 class="page-title flex-1">Camiones</h1>
      @if (store.can('flota.editar')) {
        <a class="btn btn-primary" routerLink="/empresa/flota/camiones/nuevo" data-testid="nuevo-camion">Nuevo camión</a>
      }
    </div>
    <section class="card overflow-x-auto">
      <table class="table" data-testid="tabla-camiones">
        <thead>
          <tr><th>Placa</th><th>Dueño</th><th>Conductores asignados</th></tr>
        </thead>
        <tbody>
          @for (c of camiones(); track c.id) {
            <tr [attr.data-testid]="'camion-' + c.id">
              <td class="font-mono font-semibold whitespace-nowrap">{{ c.placa }}</td>
              <td><a class="text-primary underline" [routerLink]="'/empresa/flota/vendedores/' + c.vendedorId">{{ c.dueno }}</a></td>
              <td>{{ c.conductores.join(', ') || '—' }}</td>
            </tr>
          } @empty {
            <tr><td colspan="3" class="text-muted">Todavía no hay camiones.</td></tr>
          }
        </tbody>
      </table>
    </section>
  `,
})
export class CamionesComponent {
  readonly store = inject(DemoStore);

  readonly camiones = computed(() => {
    const s = this.store.state();
    return s.vehiculos
      .filter((v) => v.empresaId === this.store.empresaId())
      .map((v) => ({
        ...v,
        dueno: vendedorNombre(s, v.vendedorId),
        conductores: s.conductores.filter((c) => c.vehiculoId === v.id).map((c) => c.nombre),
      }));
  });
}
