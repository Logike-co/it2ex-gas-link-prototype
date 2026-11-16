import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { cuentaVendedor, ESTADO_VENDEDOR_LABEL, faltaVendedor, vendedoresDe } from '../../core/simulation/selectors';
import { DemoStore } from '../../core/state/demo.store';
import { BadgeComponent } from '../../shared/badges.component';
import { TONO_VENDEDOR } from '../cuenta/cuenta-shared';

/**
 * V09 · Vendedores (F04, RN-12): vendedores de la empresa con su llave, sus camiones, sus
 * conductores y el estado de su cuenta. Marca «Sin camión» o «Sin conductor» (R-16). Cada fila
 * abre el detalle del vendedor (V11).
 */
@Component({
  selector: 'app-vendedores',
  imports: [RouterLink, BadgeComponent],
  template: `
    <div class="mb-3 flex flex-wrap items-center gap-2">
      <h1 class="page-title flex-1">Vendedores</h1>
      @if (store.can('flota.editar')) {
        <a class="btn btn-primary" routerLink="/empresa/flota/vendedores/nuevo" data-testid="nuevo-vendedor">Nuevo vendedor</a>
      }
    </div>
    <section class="card overflow-x-auto">
      <table class="table" data-testid="tabla-vendedores">
        <thead>
          <tr><th>Vendedor</th><th>Contacto</th><th>Llave</th><th>Camiones</th><th>Conductores</th><th>Cuenta</th></tr>
        </thead>
        <tbody>
          @for (v of vendedores(); track v.id) {
            <tr [attr.data-testid]="'vendedor-' + v.id">
              <td>
                <a class="font-semibold text-primary underline" [routerLink]="'/empresa/flota/vendedores/' + v.id" [attr.data-testid]="'abrir-' + v.id">{{ v.nombre }}</a>
              </td>
              <td>{{ v.contacto || '—' }}</td>
              <td class="font-mono text-xs">{{ v.llave || 'Sin llave' }}</td>
              <td class="whitespace-nowrap">
                @if (v.placas.length) {
                  {{ v.placas.length }} · {{ v.placas.join(', ') }}
                } @else {
                  <app-badge tone="warn" [attr.data-testid]="'sin-camion-' + v.id">Sin camión</app-badge>
                }
              </td>
              <td>
                @if (v.conductores.length) {
                  {{ v.conductores.length }} · {{ v.conductores.join(', ') }}
                } @else {
                  <app-badge tone="warn" [attr.data-testid]="'sin-conductor-' + v.id">Sin conductor</app-badge>
                }
              </td>
              <td><app-badge [tone]="tono[v.estado]">{{ v.estadoLabel }}</app-badge></td>
            </tr>
          } @empty {
            <tr><td colspan="6" class="text-muted">Todavía no hay vendedores.</td></tr>
          }
        </tbody>
      </table>
    </section>
  `,
})
export class VendedoresComponent {
  readonly store = inject(DemoStore);
  readonly tono = TONO_VENDEDOR;

  readonly vendedores = computed(() => {
    const s = this.store.state();
    return vendedoresDe(s, this.store.empresaId() ?? '').map((v) => {
      const estado = cuentaVendedor(s, v.id)?.estado ?? 'sin_cargas';
      return {
        ...v,
        llave: v.llave?.valor ?? '',
        placas: s.vehiculos.filter((x) => x.vendedorId === v.id).map((x) => x.placa),
        conductores: s.conductores.filter((x) => x.vendedorId === v.id).map((x) => x.nombre),
        falta: faltaVendedor(s, v.id),
        estado,
        estadoLabel: ESTADO_VENDEDOR_LABEL[estado],
      };
    });
  });
}
