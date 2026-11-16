import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  cargasDeCamion,
  conductorById,
  ESTADO_EXISTENCIAS_LABEL,
  estadoExistencias,
  existenciasCamion,
  vehiculoById,
  vendedorNombre,
} from '../../core/simulation/selectors';
import { DemoStore } from '../../core/state/demo.store';
import { BadgeComponent } from '../../shared/badges.component';
import { FechaPipe } from '../../shared/pipes';

/**
 * V30 · Mi camión (F06, RV-01), pensada para el celular: placa, vendedor y, por presentación,
 * cargadas / vendidas / quedan (R-03), con las cargas del camión. Es el inicio del conductor.
 */
@Component({
  selector: 'app-mi-camion',
  imports: [RouterLink, BadgeComponent, FechaPipe],
  template: `
    <div class="mx-auto max-w-lg">
      @if (camion(); as cam) {
        <section class="card mb-3" data-testid="mi-camion">
          <h1 class="page-title" data-testid="mi-camion-placa">Mi camión: {{ cam.placa }}</h1>
          <p class="mb-2 text-sm text-muted">De {{ vendedor() }}</p>
          @if (existencias().length) {
            <table class="table" data-testid="existencias">
              <thead>
                <tr><th>Cilindro</th><th class="num">Cargadas</th><th class="num">Vendidas</th><th class="num">Quedan</th></tr>
              </thead>
              <tbody>
                @for (e of existencias(); track e.presentacionId) {
                  <tr>
                    <td>{{ e.etiqueta }}</td>
                    <td class="num">{{ e.cargadas }}</td>
                    <td class="num">{{ e.vendidas }}</td>
                    <td class="num font-bold" [class.text-warning]="e.quedan < 0" [attr.data-testid]="'quedan-' + e.presentacionId">{{ e.quedan }}</td>
                  </tr>
                }
              </tbody>
            </table>
          } @else {
            <p class="warning-text" data-testid="sin-cargas">Tu camión no tiene cargas. Pídele a la empresa que registre el cargue</p>
          }
        </section>

        @if (cargas().length) {
          <section class="card mb-3">
            <h2 class="card-title">Cargas del camión</h2>
            <ul class="list-none space-y-1 p-0" data-testid="cargas-camion">
              @for (c of cargas(); track c.id) {
                <li class="flex flex-wrap items-center gap-2 border-b border-line pb-1" [attr.data-testid]="'carga-camion-' + c.id">
                  <span class="font-mono text-sm">{{ c.id }}</span>
                  <span class="text-xs text-muted">{{ c.fechaHora | fecha }}</span>
                  <app-badge [tone]="c.estado === 'sobrevendida' ? 'warn' : 'neutral'">{{ estadoLabel[c.estado] }}</app-badge>
                </li>
              }
            </ul>
          </section>
        }

        <div class="sticky bottom-0 bg-surface-alt pt-2 pb-3">
          <a class="btn btn-primary btn-lg w-full" routerLink="/conductor/ventas/nueva" data-testid="ir-nueva-venta">Nueva venta</a>
        </div>
      }
    </div>
  `,
})
export class MiCamionComponent {
  readonly store = inject(DemoStore);
  readonly estadoLabel = ESTADO_EXISTENCIAS_LABEL;
  private readonly conductor = computed(() => conductorById(this.store.state(), this.store.conductorId()));
  readonly camion = computed(() => vehiculoById(this.store.state(), this.conductor()?.vehiculoId));
  readonly vendedor = computed(() => vendedorNombre(this.store.state(), this.camion()?.vendedorId ?? ''));
  readonly existencias = computed(() => {
    const c = this.camion();
    return c ? existenciasCamion(this.store.state(), c.id) : [];
  });
  readonly cargas = computed(() => {
    const s = this.store.state();
    const c = this.camion();
    return c
      ? cargasDeCamion(s, c.id)
          .reverse()
          .map((x) => ({ ...x, estado: estadoExistencias(s, x) }))
      : [];
  });
}
