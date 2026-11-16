import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { formatMoney } from '../../core/simulation/format';
import { aplicarAbonos, byTime, usuarioById, vendedorNombre } from '../../core/simulation/selectors';
import { DemoStore } from '../../core/state/demo.store';
import { CopPipe, FechaPipe } from '../../shared/pipes';

/**
 * V24 · Pagos de vendedores (F10, RN-14): los pagos de la empresa, el más reciente primero, con
 * su aplicación a las cargas (R-11). Solo la empresa los registra (V25).
 */
@Component({
  selector: 'app-pagos',
  imports: [RouterLink, CopPipe, FechaPipe],
  template: `
    <div class="mb-3 flex flex-wrap items-center gap-2">
      <h1 class="page-title flex-1">Pagos de vendedores</h1>
      @if (store.can('pago.registrar')) {
        <a class="btn btn-primary" routerLink="/empresa/pagos/nuevo" data-testid="ir-registrar-pago">Registrar pago</a>
      }
    </div>
    @if (pagos().length) {
      <section class="card overflow-x-auto">
        <table class="table" data-testid="tabla-pagos">
          <thead>
            <tr><th>Pago</th><th>Fecha</th><th>Vendedor</th><th>Forma</th><th class="num">Monto</th><th>Referencia o detalle</th><th>Aplicación</th><th>Registrado por</th></tr>
          </thead>
          <tbody>
            @for (p of pagos(); track p.id) {
              <tr [attr.data-testid]="'pago-' + p.id">
                <td class="font-mono whitespace-nowrap">{{ p.id }}</td>
                <td class="whitespace-nowrap">{{ p.fechaHora | fecha }}</td>
                <td>
                  <a class="text-primary underline" [routerLink]="'/empresa/conciliacion/' + p.vendedorId">{{ p.vendedor }}</a>
                </td>
                <td>{{ p.forma === 'acuerdo' ? 'Según acuerdo' : 'Transferencia' }}</td>
                <td class="num">{{ p.monto | cop }}</td>
                <td>{{ p.referencia ?? p.detalle }}</td>
                <td class="text-xs" [attr.data-testid]="'aplicacion-' + p.id">{{ p.aplicacion }}</td>
                <td>{{ p.registradoPorNombre }}</td>
              </tr>
            }
          </tbody>
        </table>
      </section>
    } @else {
      <p class="card text-sm text-muted" data-testid="sin-pagos">Todavía no hay pagos registrados</p>
    }
  `,
})
export class PagosComponent {
  readonly store = inject(DemoStore);

  readonly pagos = computed(() => {
    const s = this.store.state();
    const propios = s.pagos.filter((p) => p.empresaId === this.store.empresaId());
    /** «CAR-A-002 $ 100.000 · CAR-A-003 $ 150.000» por pago (R-11). */
    const aplicacion = new Map<string, string[]>();
    for (const vendedorId of new Set(propios.map((p) => p.vendedorId))) {
      for (const a of aplicarAbonos(s, vendedorId).aplicaciones) {
        aplicacion.set(a.abonoId, [...(aplicacion.get(a.abonoId) ?? []), `${a.cargaId} ${formatMoney(a.monto)}`]);
      }
    }
    return propios
      .sort(byTime)
      .reverse()
      .map((p) => ({
        ...p,
        vendedor: vendedorNombre(s, p.vendedorId),
        aplicacion: aplicacion.get(p.id)?.join(' · ') ?? 'a favor',
        registradoPorNombre: usuarioById(s, p.registradoPor)?.nombre ?? p.registradoPor,
      }));
  });
}
