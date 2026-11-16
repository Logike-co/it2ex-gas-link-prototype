import { Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ESTADO_VENDEDOR_LABEL, filaConciliacion, referenciasDe, vendedorById } from '../../core/simulation/selectors';
import { DemoStore } from '../../core/state/demo.store';
import { BadgeComponent, IlustrativoComponent } from '../../shared/badges.component';
import { MigasComponent } from '../../shared/migas.component';
import { ParamAjenoComponent } from '../../shared/param-ajeno.component';
import { CopPipe, FechaPipe } from '../../shared/pipes';
import { TONO_VENDEDOR } from '../cuenta/cuenta-shared';

/**
 * V23 · Conciliación del vendedor (F09; RN-11, RN-14, S-06): su fila (vendido, pagado con
 * desglose, pendiente, en poder) y las referencias de todos sus abonos, con «Llegó» / «Quitar
 * marca» en los cobros a la llave de la empresa. La marca no mueve saldos (SUP-07). «Registrar
 * pago» abre V25 con el vendedor fijo y vuelve aquí al guardar (SUP-28).
 */
@Component({
  selector: 'app-conciliacion-vendedor',
  imports: [RouterLink, BadgeComponent, IlustrativoComponent, MigasComponent, ParamAjenoComponent, CopPipe, FechaPipe],
  template: `
    <app-migas
      [items]="[{ label: 'Cartera' }, { label: 'Conciliación', link: '/empresa/conciliacion' }, { label: fila()?.vendedor?.nombre ?? vendedorId() ?? '' }]"
    />
    @if (fila(); as f) {
      <div class="mb-3 flex flex-wrap items-center gap-2">
        <h1 class="page-title" data-testid="conciliacion-vendedor">{{ f.vendedor.nombre }}</h1>
        <app-badge [tone]="tonoVendedor[f.estado]" [attr.data-testid]="'estado-' + f.vendedor.id">{{ estadoVendedor[f.estado] }}</app-badge>
        @if (f.sinReferencia > 0) {
          <app-badge tone="error" [attr.data-testid]="'alerta-' + f.vendedor.id">{{ f.sinReferencia }} {{ f.sinReferencia === 1 ? 'cobro sin referencia' : 'cobros sin referencia' }}</app-badge>
        }
        <span class="flex-1"></span>
        @if (store.can('pago.registrar')) {
          <a class="btn btn-primary" routerLink="/empresa/pagos/nuevo" [queryParams]="{ vendedor: f.vendedor.id }" data-testid="ir-registrar-pago">Registrar pago</a>
        }
        <a class="btn" [routerLink]="'/empresa/cuentas/' + f.vendedor.id" data-testid="ver-cuenta">Ver cuenta</a>
      </div>

      <section class="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4" data-testid="fila-vendedor">
        <div class="card">
          <p class="text-xs font-semibold text-muted uppercase">Vendido (cargas)</p>
          <p class="text-2xl font-extrabold text-navy" [attr.data-testid]="'vendido-' + f.vendedor.id">{{ f.vendido | cop }}</p>
          <p class="font-mono text-xs text-muted">{{ f.placas.join(', ') }}</p>
        </div>
        <div class="card">
          <p class="text-xs font-semibold text-muted uppercase">
            Pagado <app-ilustrativo detalle="Lo cobrado a la llave de la empresa abona desde que se registra; «Llegó» solo confirma (SUP-07)." />
          </p>
          <p class="text-2xl font-extrabold text-navy" [attr.data-testid]="'pagado-' + f.vendedor.id">{{ f.pagado | cop }}</p>
          <p class="text-xs text-muted">
            confirmado <span [attr.data-testid]="'confirmado-' + f.vendedor.id">{{ f.confirmado | cop }}</span> · por confirmar
            <span [attr.data-testid]="'porconfirmar-' + f.vendedor.id">{{ f.porConfirmar | cop }}</span>
          </p>
        </div>
        <div class="card border-2" [class.border-accent]="f.pendiente > 0">
          <p class="text-xs font-semibold text-muted uppercase">Pendiente</p>
          <p class="text-2xl font-extrabold text-navy" [attr.data-testid]="'pendiente-' + f.vendedor.id">{{ f.pendiente | cop }}</p>
          @if (f.aFavor > 0) {
            <p class="text-xs text-primary">a favor {{ f.aFavor | cop }}</p>
          }
        </div>
        <div class="card">
          <p class="text-xs font-semibold text-muted uppercase">En poder <app-ilustrativo detalle="SUP-10" /></p>
          <p class="text-2xl font-extrabold text-navy" [attr.data-testid]="'enpoder-' + f.vendedor.id">{{ f.enPoder | cop }}</p>
        </div>
      </section>

      <section class="card overflow-x-auto" data-testid="detalle-vendedor">
        <h2 class="card-title">Referencias de los abonos</h2>
        <table class="table" data-testid="tabla-referencias">
          <thead>
            <tr><th>Fecha</th><th>Abono</th><th>Tipo</th><th>Camión</th><th>Conductor</th><th>Venta</th><th>Referencia</th><th class="num">Monto</th><th>Estado</th><th></th></tr>
          </thead>
          <tbody>
            @for (r of referencias(); track r.abono.id) {
              <tr [attr.data-testid]="'ref-' + r.abono.id">
                <td class="whitespace-nowrap">{{ r.abono.fechaHora | fecha }}</td>
                <td class="font-mono whitespace-nowrap">{{ r.abono.id }}</td>
                <td>{{ r.abono.tipo === 'cobro_empresa' ? 'Cobro a la llave de la empresa' : r.abono.pago?.forma === 'acuerdo' ? 'Pago según acuerdo' : 'Pago por transferencia' }}</td>
                <td class="font-mono whitespace-nowrap">{{ r.placa }}</td>
                <td>{{ r.conductor }}</td>
                <td class="font-mono whitespace-nowrap">{{ r.abono.ventaId ?? '—' }}</td>
                <td>
                  @if (r.abono.referencia) {
                    <span class="font-mono">{{ r.abono.referencia }}</span>
                  } @else if (r.abono.pago?.detalle) {
                    {{ r.abono.pago?.detalle }}
                  } @else {
                    <app-badge tone="error" data-testid="sin-referencia">Sin referencia</app-badge>
                  }
                </td>
                <td class="num">{{ r.abono.monto | cop }}</td>
                <td>
                  <app-badge [tone]="r.estado === 'por_confirmar' ? 'warn' : 'ok'" [attr.data-testid]="'estado-ref-' + r.abono.id">{{
                    r.estado === 'por_confirmar' ? 'Por confirmar' : r.estado === 'confirmado' ? 'Confirmado' : 'Registrado'
                  }}</app-badge>
                </td>
                <td>
                  @if (r.abono.cobro && store.can('cobro.marcarLlegada')) {
                    @if (r.estado === 'por_confirmar') {
                      <button type="button" class="btn btn-primary text-xs" [attr.data-testid]="'llego-' + r.abono.id" (click)="marcar(r.abono.id, true)">Llegó</button>
                    } @else {
                      <button type="button" class="btn text-xs" [attr.data-testid]="'quitar-' + r.abono.id" (click)="marcar(r.abono.id, false)">Quitar marca</button>
                    }
                  }
                </td>
              </tr>
            } @empty {
              <tr><td colspan="10" class="text-muted">Sin abonos todavía.</td></tr>
            }
          </tbody>
        </table>
      </section>
    } @else {
      <app-param-ajeno [texto]="'Ese vendedor no existe en ' + (store.empresa()?.nombre ?? '')" enlace="Conciliación" link="/empresa/conciliacion" />
    }
  `,
})
export class ConciliacionVendedorComponent {
  readonly store = inject(DemoStore);
  /** `:vendedorId` (validado contra la empresa de la sesión, §1.5). */
  readonly vendedorId = input<string>();
  readonly estadoVendedor = ESTADO_VENDEDOR_LABEL;
  readonly tonoVendedor = TONO_VENDEDOR;

  private readonly propio = computed(() => {
    const v = vendedorById(this.store.state(), this.vendedorId());
    return v && v.empresaId === this.store.empresaId() ? v.id : null;
  });
  readonly fila = computed(() => (this.propio() ? filaConciliacion(this.store.state(), this.propio() as string) : null));
  readonly referencias = computed(() => (this.propio() ? referenciasDe(this.store.state(), this.propio() as string) : []));

  marcar(cobroId: string, llego: boolean): void {
    const usuarioId = this.store.usuario()?.id ?? '';
    this.store.exec((sim) => sim.marcarLlegada(this.store.empresaId() ?? '', cobroId, llego, usuarioId));
  }
}
