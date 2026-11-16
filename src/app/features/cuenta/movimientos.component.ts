import { Component, computed, inject } from '@angular/core';
import { cuentaVendedor } from '../../core/simulation/selectors';
import { DemoStore } from '../../core/state/demo.store';
import { MovimientosTablaComponent } from './cuenta-shared';

/**
 * V28 · Mis movimientos (F08, RN-09): la cuenta corriente del vendedor de la sesión con saldo
 * corrido (R-09). Los cobros en efectivo o a la llave del vendedor no van aquí (van en V26).
 */
@Component({
  selector: 'app-movimientos',
  imports: [MovimientosTablaComponent],
  template: `
    <h1 class="page-title mb-1">Mis movimientos</h1>
    <p class="mb-3 text-sm text-muted">Tus cargas y los abonos a tu cuenta, con el saldo después de cada uno.</p>
    @if (cuenta(); as c) {
      <section class="card overflow-x-auto">
        <app-movimientos-tabla [movimientos]="c.movimientos" />
      </section>
    }
  `,
})
export class MovimientosComponent {
  readonly store = inject(DemoStore);
  readonly cuenta = computed(() => {
    const id = this.store.vendedorId();
    return id ? cuentaVendedor(this.store.state(), id) : null;
  });
}
