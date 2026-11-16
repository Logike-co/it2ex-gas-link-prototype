import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { conciliacion, ESTADO_VENDEDOR_LABEL } from '../../core/simulation/selectors';
import { DemoStore } from '../../core/state/demo.store';
import { BadgeComponent, IlustrativoComponent } from '../../shared/badges.component';
import { CopPipe } from '../../shared/pipes';
import { TONO_VENDEDOR } from '../cuenta/cuenta-shared';

/**
 * V22 · Conciliación (F09; RN-11, R-10). Una fila por vendedor con vendido, pagado (confirmado
 * / por confirmar), pendiente, en poder, alertas y estado, más los totales de la empresa. Cada
 * fila abre la conciliación del vendedor (V23).
 */
@Component({
  selector: 'app-conciliacion',
  imports: [RouterLink, BadgeComponent, IlustrativoComponent, CopPipe],
  template: `
    <h1 class="page-title mb-3">Conciliación</h1>

    <section class="card mb-4 overflow-x-auto">
      <table class="table" data-testid="tabla-conciliacion">
        <thead>
          <tr>
            <th>Vendedor</th>
            <th>Camiones</th>
            <th class="num">Vendido (cargas)</th>
            <th class="num">Pagado <app-ilustrativo detalle="Lo cobrado a la llave de la empresa abona desde que se registra; «Llegó» solo confirma (SUP-07)." /></th>
            <th class="num">Pendiente</th>
            <th class="num">En poder <app-ilustrativo detalle="SUP-10" /></th>
            <th>Alertas</th>
            <th>Estado</th>
          </tr>
        </thead>
        <tbody>
          @for (f of datos().filas; track f.vendedor.id) {
            <tr [attr.data-testid]="'fila-' + f.vendedor.id">
              <td>
                <a class="font-semibold text-primary underline" [routerLink]="'/empresa/conciliacion/' + f.vendedor.id" [attr.data-testid]="'ver-' + f.vendedor.id">{{ f.vendedor.nombre }}</a>
              </td>
              <td class="font-mono text-xs whitespace-nowrap">{{ f.placas.join(', ') }}</td>
              <td class="num" [attr.data-testid]="'vendido-' + f.vendedor.id">{{ f.vendido | cop }}</td>
              <td class="num">
                <span [attr.data-testid]="'pagado-' + f.vendedor.id">{{ f.pagado | cop }}</span>
                <div class="text-[11px] text-muted">
                  confirmado <span [attr.data-testid]="'confirmado-' + f.vendedor.id">{{ f.confirmado | cop }}</span> · por confirmar
                  <span [attr.data-testid]="'porconfirmar-' + f.vendedor.id">{{ f.porConfirmar | cop }}</span>
                </div>
              </td>
              <td class="num font-bold" [attr.data-testid]="'pendiente-' + f.vendedor.id">
                {{ f.pendiente | cop }}
                @if (f.aFavor > 0) {
                  <div class="text-[11px] font-normal text-primary">a favor {{ f.aFavor | cop }}</div>
                }
              </td>
              <td class="num" [attr.data-testid]="'enpoder-' + f.vendedor.id">{{ f.enPoder | cop }}</td>
              <td>
                @if (f.sinReferencia > 0) {
                  <app-badge tone="error" [attr.data-testid]="'alerta-' + f.vendedor.id">{{ f.sinReferencia }} {{ f.sinReferencia === 1 ? 'cobro sin referencia' : 'cobros sin referencia' }}</app-badge>
                }
              </td>
              <td><app-badge [tone]="tonoVendedor[f.estado]" [attr.data-testid]="'estado-' + f.vendedor.id">{{ estadoVendedor[f.estado] }}</app-badge></td>
            </tr>
          } @empty {
            <tr><td colspan="8" class="text-muted">Esta empresa todavía no tiene vendedores.</td></tr>
          }
        </tbody>
        <tfoot>
          <tr class="font-bold" data-testid="totales">
            <td colspan="2">Totales {{ empresaNombre() }}</td>
            <td class="num" data-testid="total-vendido">{{ datos().totales.vendido | cop }}</td>
            <td class="num" data-testid="total-pagado">{{ datos().totales.pagado | cop }}</td>
            <td class="num" data-testid="total-pendiente">{{ datos().totales.pendiente | cop }}</td>
            <td class="num" data-testid="total-enpoder">{{ datos().totales.enPoder | cop }}</td>
            <td colspan="2"></td>
          </tr>
        </tfoot>
      </table>
    </section>

  `,
})
export class ConciliacionComponent {
  readonly store = inject(DemoStore);
  readonly estadoVendedor = ESTADO_VENDEDOR_LABEL;
  readonly tonoVendedor = TONO_VENDEDOR;

  readonly empresaNombre = computed(() => this.store.empresa()?.nombre ?? '');
  readonly datos = computed(() => conciliacion(this.store.state(), this.store.empresaId() ?? ''));
}
