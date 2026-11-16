import { Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { formatMoney, parsePesos } from '../../core/simulation/format';
import { MedioCobro, MEDIOS } from '../../core/simulation/model';
import { cobrosDeVenta, MEDIO_LABEL, resumenVenta, textoVenta, ventaById } from '../../core/simulation/selectors';
import { DemoStore } from '../../core/state/demo.store';
import { BadgeComponent } from '../../shared/badges.component';
import { MigasComponent } from '../../shared/migas.component';
import { ParamAjenoComponent } from '../../shared/param-ajeno.component';
import { CopPipe } from '../../shared/pipes';

interface Linea {
  medio: MedioCobro;
  monto: string;
  referencia: string;
}

/**
 * V35 · Registro de montos (F07; RN-08, RV-02, RV-03), pensada para el celular. Siempre sale de
 * una venta (la de la ruta, R-16). Una línea por medio recibido, con su referencia; se prellenan
 * con el reparto del cobro con QR (V34) o, sin reparto, con efectivo por lo que falta. Un monto
 * en cero bloquea; la falta de referencia en la llave de la empresa y cobrar de más solo avisan
 * (RN-10, SUP-08, SUP-20). Al guardar vuelve al detalle de la venta (V33).
 */
@Component({
  selector: 'app-montos',
  imports: [RouterLink, BadgeComponent, MigasComponent, ParamAjenoComponent, CopPipe],
  template: `
    <div class="mx-auto max-w-lg">
      <app-migas
        [items]="[
          { label: 'Venta en calle' },
          { label: 'Mis ventas', link: '/conductor/ventas' },
          { label: ventaId() ?? '', link: '/conductor/ventas/' + ventaId() },
          { label: 'Registro de montos' },
        ]"
      />
      <h1 class="page-title mb-3">Registro de montos</h1>
      @if (resumen(); as r) {
        <section class="card mb-3" data-testid="montos-venta">
          <div class="flex flex-wrap items-baseline gap-x-3">
            <span class="font-mono font-bold">{{ r.venta.id }}</span>
            <span>Valor <strong>{{ r.venta.valor | cop }}</strong></span>
            <span>Cobrado {{ r.cobrado | cop }}</span>
            <span>Falta por registrar <strong data-testid="montos-falta">{{ falta() | cop }}</strong></span>
            <app-badge [tone]="r.estado === 'cobrada' ? 'ok' : r.estado === 'parcial' ? 'warn' : 'info'" data-testid="montos-estado">{{ estadoTexto() }}</app-badge>
          </div>
          @if (registrados().length) {
            <ul class="mt-2 list-none p-0 text-xs text-muted">
              @for (c of registrados(); track c.id) {
                <li>{{ c.id }} · {{ medioLabel[c.medio] }} · {{ c.monto | cop }}{{ c.referencia ? ' · ref. ' + c.referencia : '' }}</li>
              }
            </ul>
          }
        </section>

        <form (submit)="$event.preventDefault(); guardar(false)" data-testid="form-montos">
          @for (l of lineas(); track $index; let i = $index) {
            <fieldset class="card mb-3" [attr.data-testid]="'linea-' + i">
              <legend class="sr-only">Línea {{ i + 1 }}</legend>
              <div class="mb-2 grid grid-cols-3 gap-1" role="radiogroup" [attr.aria-label]="'Medio de la línea ' + (i + 1)">
                @for (m of medios; track m) {
                  <button
                    type="button"
                    role="radio"
                    class="btn btn-lg px-1 text-xs leading-tight"
                    [class.btn-primary]="l.medio === m"
                    [attr.aria-checked]="l.medio === m"
                    [attr.data-testid]="'medio-' + i + '-' + m"
                    (click)="cambiar(i, { medio: m })"
                  >
                    {{ medioLabel[m] }}
                  </button>
                }
              </div>
              <label class="label" [for]="'monto-' + i">Monto (COP)</label>
              <input [id]="'monto-' + i" class="input input-lg" inputmode="numeric" [attr.data-testid]="'monto-' + i" [value]="l.monto" (input)="cambiar(i, { monto: val($event) })" />
              @if (l.medio !== 'efectivo') {
                <label class="label mt-2" [for]="'ref-' + i">
                  {{ l.medio === 'llave_empresa' ? 'Referencia de la transferencia (importante para la empresa)' : 'Referencia (opcional)' }}
                </label>
                <input [id]="'ref-' + i" class="input input-lg" autocapitalize="characters" [attr.data-testid]="'referencia-' + i" [value]="l.referencia" (input)="cambiar(i, { referencia: val($event) })" />
              }
              @if (lineas().length > 1) {
                <button type="button" class="btn mt-2 text-xs" [attr.data-testid]="'quitar-' + i" (click)="quitar(i)">Quitar línea</button>
              }
            </fieldset>
          }
          <button type="button" class="btn btn-lg mb-3 w-full" data-testid="agregar-linea" (click)="agregar()">Agregar línea</button>

          @if (exceso() > 0) {
            <p class="warning-text" data-testid="aviso-exceso">Registraste {{ excesoTexto() }} más que el valor de la venta</p>
          }
          @if (error(); as e) {
            <p class="error-text" data-testid="error-montos" role="alert">{{ e }}</p>
          }
          @if (confirmarSinReferencia()) {
            <div class="warning-text" data-testid="confirmar-sin-referencia" role="alertdialog">
              <p class="mb-2">Sin referencia, la empresa no podrá cuadrar este pago. ¿Guardar de todas formas?</p>
              <div class="flex gap-2">
                <button type="button" class="btn btn-lg flex-1" data-testid="volver-referencia" (click)="confirmarSinReferencia.set(false)">Escribir la referencia</button>
                <button type="button" class="btn btn-accent btn-lg flex-1" data-testid="guardar-sin-referencia" (click)="guardar(true)">Guardar sin referencia</button>
              </div>
            </div>
          }
          <div class="sticky bottom-0 flex gap-2 bg-surface-alt pt-2 pb-3">
            <button type="submit" class="btn btn-primary btn-lg flex-1" data-testid="guardar-cobros">Guardar cobros</button>
            <a class="btn btn-lg" [routerLink]="'/conductor/ventas/' + r.venta.id" data-testid="cancelar">Cancelar</a>
          </div>
        </form>
      } @else {
        <app-param-ajeno texto="Esa venta no está entre tus ventas" enlace="Mis ventas" link="/conductor/ventas" />
      }
    </div>
  `,
})
export class MontosComponent {
  readonly store = inject(DemoStore);
  private readonly router = inject(Router);
  /** `:ventaId` (validada contra el conductor de la sesión, §1.5). */
  readonly ventaId = input<string>();
  readonly medios = MEDIOS;
  readonly medioLabel = MEDIO_LABEL;

  private readonly conductorId = computed(() => this.store.conductorId() ?? '');

  readonly resumen = computed(() => {
    const v = ventaById(this.store.state(), this.ventaId());
    return v && v.conductorId === this.conductorId() ? resumenVenta(this.store.state(), v) : null;
  });
  private readonly ventaKey = computed(() => this.resumen()?.venta.id ?? null);
  readonly falta = computed(() => Math.max(0, this.resumen()?.porCobrar ?? 0));
  readonly estadoTexto = computed(() => (this.resumen() ? textoVenta(this.resumen()!) : ''));
  readonly registrados = computed(() => (this.resumen() ? cobrosDeVenta(this.store.state(), this.resumen()!.venta.id) : []));

  readonly lineas = signal<Linea[]>([]);
  readonly error = signal<string | null>(null);
  readonly confirmarSinReferencia = signal(false);

  /** E28: lo registrado de más frente a lo que falta por cobrar (aviso, no bloquea). */
  readonly exceso = computed(() => {
    const total = this.lineas().reduce((a, l) => {
      const p = parsePesos(l.monto);
      return a + (p.kind === 'ok' && p.value > 0 ? p.value : 0);
    }, 0);
    return Math.max(0, total - this.falta());
  });
  readonly excesoTexto = computed(() => formatMoney(this.exceso()));

  constructor() {
    // Las líneas se prellenan con el reparto de V34 (o con efectivo por lo que falta).
    effect(() => {
      this.ventaKey();
      untracked(() => this.prellenar());
    });
  }

  private prellenar(): void {
    const r = this.resumen();
    this.error.set(null);
    this.confirmarSinReferencia.set(false);
    if (!r) {
      this.lineas.set([]);
      return;
    }
    const falta = Math.max(0, r.porCobrar);
    const v = r.venta;
    const lineas: Linea[] = [];
    if (r.cobrado === 0 && v.qr) {
      if (v.montoQrEmpresa > 0) lineas.push({ medio: 'llave_empresa', monto: String(v.montoQrEmpresa), referencia: '' });
      if (v.montoQrVendedor > 0) lineas.push({ medio: 'llave_vendedor', monto: String(v.montoQrVendedor), referencia: '' });
      const resto = falta - v.montoQrEmpresa - v.montoQrVendedor;
      if (resto > 0) lineas.push({ medio: 'efectivo', monto: String(resto), referencia: '' });
    }
    this.lineas.set(lineas.length ? lineas : [{ medio: 'efectivo', monto: falta > 0 ? String(falta) : '', referencia: '' }]);
  }

  val(event: Event): string {
    return (event.target as HTMLInputElement).value;
  }

  cambiar(i: number, cambio: Partial<Linea>): void {
    this.lineas.update((ls) => ls.map((l, j) => (j === i ? { ...l, ...cambio } : l)));
    this.confirmarSinReferencia.set(false);
  }

  agregar(): void {
    this.lineas.update((ls) => [...ls, { medio: 'efectivo', monto: '', referencia: '' }]);
  }

  quitar(i: number): void {
    this.lineas.update((ls) => ls.filter((_, j) => j !== i));
  }

  guardar(sinReferencia: boolean): void {
    const r = this.resumen();
    if (!r) return;
    const lineas = this.lineas();
    if (lineas.some((l) => {
      const p = parsePesos(l.monto);
      return p.kind !== 'ok' || p.value <= 0;
    })) {
      this.error.set('El monto debe ser mayor que cero');
      this.confirmarSinReferencia.set(false);
      return;
    }
    if (!sinReferencia && lineas.some((l) => l.medio === 'llave_empresa' && !l.referencia.trim())) {
      this.error.set(null);
      this.confirmarSinReferencia.set(true);
      return;
    }
    const res = this.store.exec((sim) =>
      sim.registrarCobros(
        this.conductorId(),
        r.venta.id,
        lineas.map((l) => ({ medio: l.medio, monto: l.monto, referencia: l.referencia }))
      )
    );
    this.confirmarSinReferencia.set(false);
    this.error.set(res.ok ? null : res.error);
    if (res.ok) {
      this.router.navigateByUrl(`/conductor/ventas/${r.venta.id}`);
    }
  }
}
