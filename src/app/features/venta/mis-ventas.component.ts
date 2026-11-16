import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { localDate } from '../../core/simulation/clock';
import { byTime, resumenVenta, textoVenta } from '../../core/simulation/selectors';
import { DemoStore } from '../../core/state/demo.store';
import { BadgeComponent } from '../../shared/badges.component';
import { CopPipe, FechaPipe } from '../../shared/pipes';

/**
 * V32 · Mis ventas (F06), pensada para el celular: las ventas del conductor de hoy y las que
 * tienen saldo por cobrar. Cada venta abre su detalle (V33); «Cobrar» abre el cobro con QR de esa
 * venta (V34). El cobro siempre sale de una venta (R-16).
 */
@Component({
  selector: 'app-mis-ventas',
  imports: [RouterLink, BadgeComponent, CopPipe, FechaPipe],
  template: `
    <div class="mx-auto max-w-lg">
      <h1 class="page-title mb-3">Mis ventas</h1>
      <section class="card">
        <ul class="list-none space-y-2 p-0" data-testid="mis-ventas">
          @for (r of ventas(); track r.venta.id) {
            <li class="flex flex-wrap items-center gap-2 border-b border-line pb-2" [attr.data-testid]="'venta-' + r.venta.id">
              <a class="btn btn-lg min-w-0 flex-1 justify-start gap-2" [routerLink]="'/conductor/ventas/' + r.venta.id" [attr.data-testid]="'abrir-' + r.venta.id">
                <span class="font-mono text-sm">{{ r.venta.id }}</span>
                <span class="font-bold">{{ r.venta.valor | cop }}</span>
              </a>
              <app-badge [tone]="r.estado === 'cobrada' ? 'ok' : r.estado === 'parcial' ? 'warn' : 'info'" [attr.data-testid]="'estado-venta-' + r.venta.id">{{ r.texto }}</app-badge>
              <span class="w-full text-xs text-muted">{{ r.venta.fechaHora | fecha }} · cobrado {{ r.cobrado | cop }}</span>
              @if (r.estado !== 'cobrada') {
                <a class="btn btn-primary btn-lg w-full" [routerLink]="'/conductor/ventas/' + r.venta.id + '/cobro'" [attr.data-testid]="'cobrar-' + r.venta.id">Cobrar</a>
              }
            </li>
          } @empty {
            <li class="text-sm text-muted" data-testid="sin-ventas">Todavía no tienes ventas hoy.</li>
          }
        </ul>
      </section>
    </div>
  `,
})
export class MisVentasComponent {
  readonly store = inject(DemoStore);

  readonly ventas = computed(() => {
    const s = this.store.state();
    const id = this.store.conductorId();
    const hoy = localDate(new Date());
    return s.ventas
      .filter((v) => v.conductorId === id)
      .map((v) => resumenVenta(s, v))
      .filter((r) => localDate(new Date(r.venta.fechaHora)) === hoy || r.estado !== 'cobrada')
      .sort((a, b) => byTime(b.venta, a.venta))
      .map((r) => ({ ...r, texto: textoVenta(r) }));
  });
}
