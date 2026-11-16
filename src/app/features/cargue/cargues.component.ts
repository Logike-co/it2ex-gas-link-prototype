import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  byTime,
  conductorNombre,
  cuentaVendedor,
  ESTADO_EXISTENCIAS_LABEL,
  ESTADO_PAGO_LABEL,
  placaDe,
  vendedorNombre,
} from '../../core/simulation/selectors';
import { DemoStore } from '../../core/state/demo.store';
import { BadgeComponent } from '../../shared/badges.component';
import { CopPipe, FechaPipe, KgPipe } from '../../shared/pipes';
import { TONO_PAGO } from '../cuenta/cuenta-shared';

/**
 * V16 · Cargues (F05, RN-02): las cargas de la empresa, la más reciente primero, con su estado
 * de pago y de existencias. Es el inicio de la empresa. Cada fila abre su detalle (V18).
 */
@Component({
  selector: 'app-cargues',
  imports: [RouterLink, BadgeComponent, CopPipe, FechaPipe, KgPipe],
  template: `
    <div class="mb-3 flex flex-wrap items-center gap-2">
      <h1 class="page-title flex-1">Cargues</h1>
      @if (store.can('carga.registrar')) {
        <a class="btn btn-primary" routerLink="/empresa/cargues/nuevo" data-testid="nuevo-cargue">Nuevo cargue</a>
      }
    </div>
    @if (cargas().length) {
      <section class="card overflow-x-auto">
        <table class="table" data-testid="tabla-cargas">
          <thead>
            <tr>
              <th>Carga</th><th>Fecha</th><th>Vendedor</th><th>Camión</th><th>Conductor</th><th class="num">Peso</th><th class="num">Valor</th><th>Pago</th><th>Existencias</th>
            </tr>
          </thead>
          <tbody>
            @for (c of cargas(); track c.id) {
              <tr [attr.data-testid]="'carga-' + c.id">
                <td class="whitespace-nowrap">
                  <a class="font-mono text-primary underline" [routerLink]="'/empresa/cargues/' + c.id" [attr.data-testid]="'abrir-' + c.id">{{ c.id }}</a>
                </td>
                <td class="whitespace-nowrap">{{ c.fechaHora | fecha }}</td>
                <td>{{ c.vendedor }}</td>
                <td class="font-mono whitespace-nowrap">{{ c.placa }}</td>
                <td>{{ c.conductor }}</td>
                <td class="num">{{ c.pesoTotalDecimasKg | kg }}</td>
                <td class="num">{{ c.valorConsolidado | cop }}</td>
                <td><app-badge [tone]="c.pagoTone" [attr.data-testid]="'estado-' + c.id">{{ c.pago }}</app-badge></td>
                <td><app-badge [tone]="c.existencias === 'Sobrevendida' ? 'warn' : 'neutral'">{{ c.existencias }}</app-badge></td>
              </tr>
            }
          </tbody>
        </table>
      </section>
    } @else {
      <div class="card text-center" data-testid="sin-cargues">
        <p class="mb-2 font-semibold">Todavía no hay cargues</p>
        @if (store.can('carga.registrar')) {
          <a class="btn btn-primary" routerLink="/empresa/cargues/nuevo">Nuevo cargue</a>
        }
      </div>
    }
  `,
})
export class CarguesComponent {
  readonly store = inject(DemoStore);

  readonly cargas = computed(() => {
    const s = this.store.state();
    return s.cargas
      .filter((c) => c.empresaId === this.store.empresaId())
      .sort(byTime)
      .reverse()
      .map((c) => {
        const cc = cuentaVendedor(s, c.vendedorId)?.cargas.find((x) => x.carga.id === c.id);
        return {
          ...c,
          vendedor: vendedorNombre(s, c.vendedorId),
          placa: placaDe(s, c.vehiculoId),
          conductor: conductorNombre(s, c.conductorId),
          pago: cc ? ESTADO_PAGO_LABEL[cc.estadoPago] : '—',
          pagoTone: cc ? TONO_PAGO[cc.estadoPago] : ('neutral' as const),
          existencias: cc ? ESTADO_EXISTENCIAS_LABEL[cc.estadoExistencias] : '—',
        };
      });
  });
}
