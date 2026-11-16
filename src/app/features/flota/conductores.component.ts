import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { placaDe, vendedorNombre } from '../../core/simulation/selectors';
import { DemoStore } from '../../core/state/demo.store';

/** V14 · Conductores (F04, RN-12): nombre, vendedor (enlace a su detalle), camión y si es el mismo vendedor. */
@Component({
  selector: 'app-conductores',
  imports: [RouterLink],
  template: `
    <div class="mb-3 flex flex-wrap items-center gap-2">
      <h1 class="page-title flex-1">Conductores</h1>
      @if (store.can('flota.editar')) {
        <a class="btn btn-primary" routerLink="/empresa/flota/conductores/nuevo" data-testid="nuevo-conductor">Nuevo conductor</a>
      }
    </div>
    <section class="card overflow-x-auto">
      <table class="table" data-testid="tabla-conductores">
        <thead>
          <tr><th>Conductor</th><th>Vendedor</th><th>Camión</th><th>Es el vendedor</th></tr>
        </thead>
        <tbody>
          @for (c of conductores(); track c.id) {
            <tr [attr.data-testid]="'conductor-' + c.id">
              <td class="font-semibold">{{ c.nombre }}</td>
              <td><a class="text-primary underline" [routerLink]="'/empresa/flota/vendedores/' + c.vendedorId">{{ c.vendedor }}</a></td>
              <td class="font-mono whitespace-nowrap">{{ c.placa }}</td>
              <td>{{ c.esElVendedor ? 'Sí' : 'No' }}</td>
            </tr>
          } @empty {
            <tr><td colspan="4" class="text-muted">Todavía no hay conductores.</td></tr>
          }
        </tbody>
      </table>
    </section>
  `,
})
export class ConductoresComponent {
  readonly store = inject(DemoStore);

  readonly conductores = computed(() => {
    const s = this.store.state();
    return s.conductores
      .filter((c) => c.empresaId === this.store.empresaId())
      .map((c) => ({ ...c, vendedor: vendedorNombre(s, c.vendedorId), placa: placaDe(s, c.vehiculoId) }));
  });
}
