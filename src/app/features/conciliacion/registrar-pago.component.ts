import { Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { formatMoney } from '../../core/simulation/format';
import { FormaPago } from '../../core/simulation/model';
import { cuentaVendedor, vendedorById, vendedoresDe } from '../../core/simulation/selectors';
import { DemoStore } from '../../core/state/demo.store';
import { Miga, MigasComponent } from '../../shared/migas.component';
import { ParamAjenoComponent } from '../../shared/param-ajeno.component';
import { CopPipe } from '../../shared/pipes';

/**
 * V25 · Registrar pago del vendedor (F10; RN-11, RN-13, RN-14). Solo la empresa registra el pago
 * del vendedor: transferencia (con referencia) o según acuerdo (con detalle), con «Pagar el
 * saldo». Se aplica a la carga más antigua con saldo (R-11). Con `?vendedor=` el vendedor queda
 * fijo; al guardar se abre la conciliación del vendedor (SUP-28).
 */
@Component({
  selector: 'app-registrar-pago',
  imports: [RouterLink, MigasComponent, ParamAjenoComponent, CopPipe],
  template: `
    <app-migas [items]="migas()" />
    <h1 class="page-title mb-3">Registrar pago del vendedor</h1>
    @if (ajeno()) {
      <app-param-ajeno [texto]="'Ese vendedor no existe en ' + (store.empresa()?.nombre ?? '')" enlace="Pagos de vendedores" link="/empresa/pagos" />
    } @else {
      <form class="card max-w-lg" (submit)="$event.preventDefault(); registrar()" data-testid="form-pago">
        <label class="label" for="pago-vendedor">Vendedor *</label>
        @if (fijo(); as v) {
          <p class="input flex items-center bg-surface-alt font-semibold" id="pago-vendedor" data-testid="pago-vendedor-fijo">{{ v.nombre }}</p>
        } @else {
          <select id="pago-vendedor" class="input" data-testid="pago-vendedor" [value]="elegido()" (change)="elegir(val($event))">
            <option value="">Elige el vendedor…</option>
            @for (v of vendedores(); track v.id) {
              <option [value]="v.id" [selected]="v.id === elegido()">{{ v.nombre }}</option>
            }
          </select>
        }
        @if (cuenta(); as c) {
          <p class="mt-2 mb-2 text-sm" data-testid="pago-pendiente">
            Pendiente <strong class="whitespace-nowrap">{{ c.saldoGeneral | cop }}</strong>
            @if (cargasConSaldo()) {
              <span class="text-muted"> ({{ cargasConSaldo() }})</span>
            }
          </p>
        }
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
          <button type="button" class="btn whitespace-nowrap" data-testid="pagar-saldo" [disabled]="!cuenta() || cuenta()?.saldoGeneral === 0" (click)="pagarSaldo()">
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
        <div class="mt-3 flex flex-wrap gap-2">
          <button type="submit" class="btn btn-primary flex-1" data-testid="registrar-pago">Registrar pago</button>
          <a class="btn" [routerLink]="cancelar()" data-testid="cancelar">Cancelar</a>
        </div>
      </form>
    }
  `,
})
export class RegistrarPagoComponent {
  readonly store = inject(DemoStore);
  private readonly router = inject(Router);
  /** `?vendedor=VEN-…`: vendedor fijo con su pendiente (SUP-28). */
  readonly vendedor = input<string>();

  private readonly empresaId = computed(() => this.store.empresaId() ?? '');
  readonly vendedores = computed(() => vendedoresDe(this.store.state(), this.empresaId()));
  readonly fijo = computed(() => {
    const v = vendedorById(this.store.state(), this.vendedor());
    return v && v.empresaId === this.empresaId() ? v : null;
  });
  readonly ajeno = computed(() => !!this.vendedor() && !this.fijo());
  readonly elegido = signal('');
  readonly idVendedor = computed(() => this.fijo()?.id ?? this.elegido());
  readonly cuenta = computed(() => (this.idVendedor() ? cuentaVendedor(this.store.state(), this.idVendedor()) : null));
  readonly cargasConSaldo = computed(() =>
    (this.cuenta()?.cargas ?? [])
      .filter((c) => c.saldo > 0)
      .map((c) => `${c.carga.id} ${formatMoney(c.saldo)}`)
      .join(' · ')
  );
  readonly cancelar = computed(() => (this.fijo() ? `/empresa/conciliacion/${this.fijo()?.id}` : '/empresa/pagos'));
  readonly migas = computed<Miga[]>(() => [{ label: 'Cartera' }, { label: 'Pagos de vendedores', link: '/empresa/pagos' }, { label: 'Registrar pago' }]);

  readonly forma = signal<FormaPago>('transferencia');
  readonly monto = signal('');
  readonly referencia = signal('');
  readonly detalle = signal('');
  readonly error = signal<string | null>(null);

  constructor() {
    effect(() => {
      this.idVendedor();
      untracked(() => {
        this.monto.set('');
        this.error.set(null);
      });
    });
  }

  val(event: Event): string {
    return (event.target as HTMLInputElement).value;
  }

  elegir(id: string): void {
    this.elegido.set(id);
  }

  pagarSaldo(): void {
    this.monto.set(String(this.cuenta()?.saldoGeneral ?? ''));
  }

  registrar(): void {
    const vendedorId = this.idVendedor();
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
      this.router.navigateByUrl(`/empresa/conciliacion/${r.value.vendedorId}`);
    } else {
      this.error.set(r.error);
    }
  }
}
