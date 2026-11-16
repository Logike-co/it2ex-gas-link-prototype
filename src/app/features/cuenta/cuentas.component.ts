import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { cuentaVendedor, CuentaVendedor, ESTADO_VENDEDOR_LABEL, vendedoresDe } from '../../core/simulation/selectors';
import { DemoStore } from '../../core/state/demo.store';
import { BadgeComponent } from '../../shared/badges.component';
import { CopPipe } from '../../shared/pipes';
import { TONO_VENDEDOR } from './cuenta-shared';

/**
 * V19 · Cuentas de vendedores (F08, RN-09): una fila por vendedor de la empresa con cargado,
 * abonado, saldo (o a favor), dinero en poder y estado. Cada fila abre su cuenta (V20).
 */
@Component({
  selector: 'app-cuentas',
  imports: [RouterLink, BadgeComponent, CopPipe],
  template: `
    <h1 class="page-title mb-3">Cuentas de vendedores</h1>
    <section class="card overflow-x-auto">
      <table class="table" data-testid="tabla-cuentas">
        <thead>
          <tr><th>Vendedor</th><th class="num">Cargado</th><th class="num">Abonado</th><th class="num">Saldo</th><th class="num">En poder</th><th>Estado</th></tr>
        </thead>
        <tbody>
          @for (c of cuentas(); track c.vendedor.id) {
            <tr [attr.data-testid]="'cuenta-fila-' + c.vendedor.id">
              <td>
                <a class="font-semibold text-primary underline" [routerLink]="'/empresa/cuentas/' + c.vendedor.id" [attr.data-testid]="'abrir-' + c.vendedor.id">{{ c.vendedor.nombre }}</a>
              </td>
              <td class="num">{{ c.totalCargado | cop }}</td>
              <td class="num">{{ c.totalAbonado | cop }}</td>
              <td class="num font-bold" [attr.data-testid]="'cuenta-saldo-' + c.vendedor.id">
                {{ c.saldoAFavor > 0 ? (c.saldoAFavor | cop) + ' a favor' : (c.saldoGeneral | cop) }}
              </td>
              <td class="num">{{ c.enPoder.total | cop }}</td>
              <td><app-badge [tone]="tono[c.estado]">{{ estado[c.estado] }}</app-badge></td>
            </tr>
          } @empty {
            <tr><td colspan="6" class="text-muted">Esta empresa todavía no tiene vendedores.</td></tr>
          }
        </tbody>
      </table>
    </section>
  `,
})
export class CuentasComponent {
  readonly store = inject(DemoStore);
  readonly tono = TONO_VENDEDOR;
  readonly estado = ESTADO_VENDEDOR_LABEL;
  readonly cuentas = computed(() => {
    const s = this.store.state();
    return vendedoresDe(s, this.store.empresaId() ?? '')
      .map((v) => cuentaVendedor(s, v.id))
      .filter((c): c is CuentaVendedor => !!c);
  });
}
