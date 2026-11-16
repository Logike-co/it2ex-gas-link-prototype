import { Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { RouterLink } from '@angular/router';
import { formatMoney } from '../../core/simulation/format';
import { FormaPago } from '../../core/simulation/model';
import {
  conciliacion,
  cuentaVendedor,
  ESTADO_PAGO_LABEL,
  ESTADO_VENDEDOR_LABEL,
  referenciasDe,
  vendedoresDe,
} from '../../core/simulation/selectors';
import { DemoStore } from '../../core/state/demo.store';
import { BadgeComponent, IlustrativoComponent } from '../../shared/badges.component';
import { CopPipe, FechaPipe } from '../../shared/pipes';
import { TONO_PAGO, TONO_VENDEDOR } from '../cuenta/cuenta.component';

/**
 * V10 · Conciliación y pago del vendedor (F09, F10; RN-11, RN-13, RN-14). Una fila por vendedor
 * con vendido, pagado (confirmado / por confirmar), pendiente, en poder y alertas; el detalle
 * de un vendedor muestra las referencias con la marca «Llegó» y el registro del pago, que solo
 * hace la empresa.
 */
@Component({
  selector: 'app-conciliacion',
  imports: [RouterLink, BadgeComponent, IlustrativoComponent, CopPipe, FechaPipe],
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
            <tr [attr.data-testid]="'fila-' + f.vendedor.id" [class.bg-primary-soft]="f.vendedor.id === vendedorId()">
              <td>
                <a class="font-semibold text-primary underline" [routerLink]="[]" [queryParams]="{ vendedor: f.vendedor.id }" [attr.data-testid]="'ver-' + f.vendedor.id">{{ f.vendedor.nombre }}</a>
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

    @if (ajeno(); as msg) {
      <p class="error-text" data-testid="vendedor-ajeno" role="alert">{{ msg }}</p>
    } @else if (cuenta(); as c) {
      <div class="grid gap-4 xl:grid-cols-[1fr_22rem]">
        <section class="card overflow-x-auto" data-testid="detalle-vendedor">
          <div class="card-title">
            <span class="flex-1">Referencias de {{ c.vendedor.nombre }}</span>
            <a class="btn text-xs" [routerLink]="'/cuenta'" [queryParams]="{ vendedor: c.vendedor.id }" data-testid="ver-cuenta">Ver su cuenta</a>
          </div>
          <table class="table" data-testid="tabla-referencias">
            <thead>
              <tr><th>Fecha</th><th>Abono</th><th>Tipo</th><th>Camión</th><th>Conductor</th><th>Venta</th><th>Referencia</th><th class="num">Monto</th><th>Estado</th><th></th></tr>
            </thead>
            <tbody>
              @for (r of referencias(); track r.abono.id) {
                <tr [attr.data-testid]="'ref-' + r.abono.id">
                  <td class="whitespace-nowrap">{{ r.abono.fechaHora | fecha }}</td>
                  <td class="font-mono whitespace-nowrap">{{ r.abono.id }}</td>
                  <td>{{ r.abono.tipo === 'cobro_empresa' ? 'Cobro a la llave de la empresa' : (r.abono.pago?.forma === 'acuerdo' ? 'Pago según acuerdo' : 'Pago por transferencia') }}</td>
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

        @if (store.can('pago.registrar')) {
          <form class="card" (submit)="$event.preventDefault(); registrar()" data-testid="form-pago">
            <h2 class="card-title">Registrar pago del vendedor</h2>
            <p class="mb-2 text-sm" data-testid="pago-pendiente">
              Pendiente <strong class="whitespace-nowrap">{{ c.saldoGeneral | cop }}</strong>
              @if (cargasConSaldo().length) {
                <span class="text-muted"> ({{ cargasConSaldo() }})</span>
              }
            </p>
            <div class="mb-2 grid grid-cols-2 gap-1" role="radiogroup" aria-label="Forma de pago">
              <button type="button" role="radio" class="btn" [class.btn-primary]="forma() === 'transferencia'" [attr.aria-checked]="forma() === 'transferencia'" data-testid="forma-transferencia" (click)="forma.set('transferencia')">
                Transferencia
              </button>
              <button type="button" role="radio" class="btn" [class.btn-primary]="forma() === 'acuerdo'" [attr.aria-checked]="forma() === 'acuerdo'" data-testid="forma-acuerdo" (click)="forma.set('acuerdo')">
                Según acuerdo
              </button>
            </div>
            <label class="label" for="pago-monto">Monto (COP)</label>
            <div class="mb-2 flex gap-2">
              <input id="pago-monto" class="input" inputmode="numeric" data-testid="pago-monto" [value]="monto()" (input)="monto.set(val($event))" />
              <button type="button" class="btn whitespace-nowrap" data-testid="pagar-saldo" [disabled]="c.saldoGeneral === 0" (click)="monto.set(String(c.saldoGeneral))">
                Pagar el saldo
              </button>
            </div>
            @if (forma() === 'transferencia') {
              <label class="label" for="pago-ref">Referencia de la transferencia *</label>
              <input id="pago-ref" class="input" autocapitalize="characters" data-testid="pago-referencia" [value]="referencia()" (input)="referencia.set(val($event))" />
            } @else {
              <label class="label" for="pago-detalle">Detalle del acuerdo *</label>
              <input id="pago-detalle" class="input" placeholder="Ej.: Efectivo entregado en la bodega" data-testid="pago-detalle" [value]="detalle()" (input)="detalle.set(val($event))" />
            }
            <p class="mt-2 text-xs text-muted">El pago se aplica a la carga más antigua con saldo y, si sobra, a la siguiente.</p>
            @if (error(); as e) {
              <p class="error-text" data-testid="error-pago" role="alert">{{ e }}</p>
            }
            <button type="submit" class="btn btn-primary mt-3 w-full" data-testid="registrar-pago">Registrar pago</button>
            @if (ultimo(); as u) {
              <p class="mt-2 rounded-lg bg-success-soft px-3 py-2 text-sm text-success" data-testid="ultimo-pago">{{ u }}</p>
            }
          </form>
        }
      </div>
    } @else {
      <p class="card text-sm text-muted" data-testid="elige-vendedor">Elige un vendedor de la tabla para ver sus referencias y registrar pagos.</p>
    }
  `,
})
export class ConciliacionComponent {
  readonly store = inject(DemoStore);
  /** `?vendedor=VEN-…` */
  readonly vendedor = input<string>();
  readonly estadoVendedor = ESTADO_VENDEDOR_LABEL;
  readonly tonoVendedor = TONO_VENDEDOR;
  readonly tonoPago = TONO_PAGO;
  readonly estadoPago = ESTADO_PAGO_LABEL;
  readonly String = String;

  private readonly empresaId = computed(() => this.store.empresaId() ?? '');
  readonly empresaNombre = computed(() => this.store.empresa()?.nombre ?? '');
  readonly datos = computed(() => conciliacion(this.store.state(), this.empresaId()));

  readonly ajeno = computed(() => {
    const id = this.vendedor();
    if (!id) return null;
    return vendedoresDe(this.store.state(), this.empresaId()).some((v) => v.id === id) ? null : `Ese vendedor no existe en ${this.empresaNombre()}`;
  });
  readonly vendedorId = computed(() => (this.vendedor() && !this.ajeno() ? (this.vendedor() as string) : null));
  readonly cuenta = computed(() => (this.vendedorId() ? cuentaVendedor(this.store.state(), this.vendedorId() as string) : null));
  readonly referencias = computed(() => (this.vendedorId() ? referenciasDe(this.store.state(), this.vendedorId() as string) : []));
  readonly cargasConSaldo = computed(() =>
    (this.cuenta()?.cargas ?? [])
      .filter((c) => c.saldo > 0)
      .map((c) => `${c.carga.id} ${formatMoney(c.saldo)}`)
      .join(' · ')
  );

  readonly forma = signal<FormaPago>('transferencia');
  readonly monto = signal('');
  readonly referencia = signal('');
  readonly detalle = signal('');
  readonly error = signal<string | null>(null);
  readonly ultimo = signal<string | null>(null);

  constructor() {
    effect(() => {
      this.vendedorId();
      untracked(() => this.limpiar(true));
    });
  }

  val(event: Event): string {
    return (event.target as HTMLInputElement).value;
  }

  private limpiar(todo: boolean): void {
    this.monto.set('');
    this.referencia.set('');
    this.detalle.set('');
    this.error.set(null);
    if (todo) {
      this.forma.set('transferencia');
      this.ultimo.set(null);
    }
  }

  marcar(cobroId: string, llego: boolean): void {
    const usuarioId = this.store.usuario()?.id ?? '';
    this.store.exec((sim) => sim.marcarLlegada(this.empresaId(), cobroId, llego, usuarioId));
  }

  registrar(): void {
    const vendedorId = this.vendedorId();
    if (!vendedorId) return;
    const usuarioId = this.store.usuario()?.id ?? '';
    const r = this.store.exec((sim) =>
      sim.registrarPago(this.empresaId(), usuarioId, {
        vendedorId,
        forma: this.forma(),
        monto: this.monto(),
        referencia: this.referencia(),
        detalle: this.detalle(),
      })
    );
    if (r.ok) {
      this.limpiar(false);
      this.ultimo.set(r.message ?? null);
    } else {
      this.error.set(r.error);
    }
  }
}
