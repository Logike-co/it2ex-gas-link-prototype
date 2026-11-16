import { Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { formatMoney, parsePesos } from '../../core/simulation/format';
import { QrElegido } from '../../core/simulation/model';
import { empresaById, resumenVenta, vendedorById, ventaById } from '../../core/simulation/selectors';
import { DemoStore } from '../../core/state/demo.store';
import { MigasComponent } from '../../shared/migas.component';
import { ParamAjenoComponent } from '../../shared/param-ajeno.component';
import { CopPipe } from '../../shared/pipes';
import { QrMuestraComponent } from '../../shared/qr-muestra.component';

/**
 * V34 · Cobro con QR (F06, F06b; RN-07, S-08). Siempre sale de una venta (la de la ruta, R-16):
 * el conductor elige el QR de la empresa, el del vendedor o ambos, reparte el monto y muestra QR
 * de muestra generados en el navegador. Esta pantalla no crea cobros: «Registrar lo recibido»
 * lleva al registro de montos (V35) con las líneas prellenadas.
 */
@Component({
  selector: 'app-cobro',
  imports: [RouterLink, MigasComponent, ParamAjenoComponent, CopPipe, QrMuestraComponent],
  template: `
    <div class="mx-auto max-w-lg">
      <app-migas
        [items]="[
          { label: 'Venta en calle' },
          { label: 'Mis ventas', link: '/conductor/ventas' },
          { label: ventaId() ?? '', link: '/conductor/ventas/' + ventaId() },
          { label: 'Cobro con QR' },
        ]"
      />
      <h1 class="page-title mb-3">Cobro con QR</h1>
      @if (resumen(); as r) {
        <section class="card mb-3" data-testid="cobro-venta">
          <div class="flex flex-wrap items-baseline gap-x-3">
            <span class="font-mono font-bold" data-testid="cobro-venta-id">{{ r.venta.id }}</span>
            <span>Valor <strong>{{ r.venta.valor | cop }}</strong></span>
            <span>Cobrado {{ r.cobrado | cop }}</span>
            <span>Falta <strong data-testid="cobro-falta">{{ falta() | cop }}</strong></span>
          </div>
        </section>

        <section class="card mb-3">
          <h2 class="card-title">¿Qué QR muestras?</h2>
          <div class="grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label="QR a mostrar">
            @for (o of opciones(); track o.id) {
              <button
                type="button"
                role="radio"
                class="btn btn-lg flex-col"
                [class.btn-primary]="qr() === o.id"
                [attr.aria-checked]="qr() === o.id"
                [disabled]="o.disabled"
                [title]="o.ayuda"
                [attr.data-testid]="'opcion-qr-' + o.id"
                (click)="elegir(o.id)"
              >
                {{ o.label }}
                @if (o.disabled) {
                  <span class="text-[11px] font-normal" [attr.data-testid]="'ayuda-qr-' + o.id">{{ o.ayuda }}</span>
                }
              </button>
            }
          </div>

          @if (qr(); as q) {
            <div class="mt-3 grid gap-3" [class.sm:grid-cols-2]="q === 'ambos'">
              @if (q !== 'vendedor') {
                <div>
                  <label class="label" for="monto-empresa">A la llave de la empresa (COP)</label>
                  <input id="monto-empresa" class="input input-lg" inputmode="numeric" data-testid="monto-qr-empresa" [value]="montoEmpresa()" (input)="montoEmpresa.set(val($event))" />
                </div>
              }
              @if (q !== 'empresa') {
                <div>
                  <label class="label" for="monto-vendedor">A la llave del vendedor (COP)</label>
                  <input id="monto-vendedor" class="input input-lg" inputmode="numeric" data-testid="monto-qr-vendedor" [value]="montoVendedor()" (input)="montoVendedor.set(val($event))" />
                </div>
              }
            </div>
            @if (reparto().error; as e) {
              <p class="error-text" data-testid="error-reparto" role="alert">{{ e }}</p>
            } @else {
              <p class="mt-2 text-base font-bold text-navy" data-testid="resto-efectivo">Resto en efectivo: {{ reparto().resto | cop }}</p>
            }
          }
        </section>

        @if (qr() && !reparto().error) {
          <section class="card mb-3" data-testid="qrs">
            <div class="grid gap-6" [class.sm:grid-cols-2]="qr() === 'ambos'">
              @if (qr() !== 'vendedor' && reparto().empresa > 0 && llaveEmpresa()) {
                <app-qr-muestra destino="empresa" titulo="QR de la empresa" [llave]="llaveEmpresa() ?? ''" [monto]="reparto().empresa" [ventaId]="r.venta.id" />
              }
              @if (qr() !== 'empresa' && reparto().vendedor > 0 && llaveVendedor()) {
                <app-qr-muestra destino="vendedor" titulo="QR del vendedor" [llave]="llaveVendedor() ?? ''" [monto]="reparto().vendedor" [ventaId]="r.venta.id" />
              }
            </div>
            <p class="mt-3 text-center text-xs text-muted">Imagen de muestra generada en el navegador. No es un código de pago real.</p>
          </section>
        }

        <div class="sticky bottom-0 flex gap-2 bg-surface-alt pt-2 pb-3">
          <button type="button" class="btn btn-primary btn-lg flex-1" data-testid="registrar-recibido" [disabled]="!!reparto().error" (click)="registrarRecibido()">
            Registrar lo recibido
          </button>
          <a class="btn btn-lg" [routerLink]="'/conductor/ventas/' + r.venta.id" data-testid="volver-venta">Volver a la venta</a>
        </div>
      } @else {
        <app-param-ajeno texto="Esa venta no está entre tus ventas" enlace="Mis ventas" link="/conductor/ventas" />
      }
    </div>
  `,
})
export class CobroComponent {
  readonly store = inject(DemoStore);
  private readonly router = inject(Router);
  /** `:ventaId` (validada contra el conductor de la sesión, §1.5). */
  readonly ventaId = input<string>();

  private readonly conductorId = computed(() => this.store.conductorId() ?? '');

  /** La venta de la ruta, si es del conductor de la sesión. */
  readonly resumen = computed(() => {
    const s = this.store.state();
    const v = ventaById(s, this.ventaId());
    return v && v.conductorId === this.conductorId() ? resumenVenta(s, v) : null;
  });

  /** Id de la venta en pantalla: el reparto se reinicia solo cuando cambia. */
  private readonly ventaKey = computed(() => this.resumen()?.venta.id ?? null);

  readonly falta = computed(() => Math.max(0, this.resumen()?.porCobrar ?? 0));
  readonly llaveEmpresa = computed(() => empresaById(this.store.state(), this.resumen()?.venta.empresaId)?.llave?.valor ?? null);
  readonly llaveVendedor = computed(() => vendedorById(this.store.state(), this.resumen()?.venta.vendedorId)?.llave?.valor ?? null);

  readonly opciones = computed(() => [
    { id: 'empresa' as const, label: 'QR de la empresa', disabled: !this.llaveEmpresa(), ayuda: 'La empresa no tiene llave de cobro' },
    { id: 'vendedor' as const, label: 'QR del vendedor', disabled: !this.llaveVendedor(), ayuda: 'El vendedor no tiene llave de cobro' },
    { id: 'ambos' as const, label: 'Ambos', disabled: !this.llaveEmpresa() || !this.llaveVendedor(), ayuda: 'Faltan llaves de cobro' },
  ]);

  readonly qr = signal<QrElegido | null>(null);
  readonly montoEmpresa = signal('');
  readonly montoVendedor = signal('');

  /** Reparto (E22, E24): montos ≥ 0 que no superan lo que falta por cobrar. */
  readonly reparto = computed(() => {
    const q = this.qr();
    const leer = (t: string) => parsePesos(t);
    const e = q && q !== 'vendedor' ? leer(this.montoEmpresa()) : ({ kind: 'ok', value: 0 } as const);
    const v = q && q !== 'empresa' ? leer(this.montoVendedor()) : ({ kind: 'ok', value: 0 } as const);
    const empresa = e.kind === 'ok' ? e.value : 0;
    const vendedor = v.kind === 'ok' ? v.value : 0;
    let error: string | null = null;
    if (e.kind === 'invalid' || v.kind === 'invalid') {
      error = 'Escribe un valor en pesos, sin decimales';
    } else if (empresa < 0 || vendedor < 0) {
      error = 'Los montos no pueden ser negativos';
    } else if (empresa + vendedor > this.falta()) {
      const exceso = formatMoney(empresa + vendedor - this.falta());
      error = this.resumen()?.cobrado ? `El reparto supera lo que falta por cobrar en ${exceso}` : `El reparto supera el valor de la venta en ${exceso}`;
    }
    return { empresa, vendedor, resto: Math.max(0, this.falta() - empresa - vendedor), error };
  });

  constructor() {
    // Al cambiar de venta, se vuelve a elegir: por defecto, lo que haya guardado o el QR de la empresa.
    effect(() => {
      this.ventaKey();
      untracked(() => {
        const r = this.resumen();
        const opciones = this.opciones();
        const previo = r?.venta.qr;
        const primera = opciones.find((o) => !o.disabled)?.id ?? null;
        this.elegir(previo && !opciones.find((o) => o.id === previo)?.disabled ? previo : primera, true);
      });
    });
  }

  val(event: Event): string {
    return (event.target as HTMLInputElement).value;
  }

  /** Con una llave, el monto por defecto es lo que falta por cobrar; con ambas, se reparte. */
  elegir(q: QrElegido | null, inicial = false): void {
    this.qr.set(q);
    const r = this.resumen();
    const falta = String(this.falta());
    if (inicial && r?.venta.qr && r.venta.qr === q && (r.venta.montoQrEmpresa || r.venta.montoQrVendedor)) {
      this.montoEmpresa.set(String(r.venta.montoQrEmpresa));
      this.montoVendedor.set(String(r.venta.montoQrVendedor));
      return;
    }
    this.montoEmpresa.set(q === 'vendedor' ? '0' : falta);
    this.montoVendedor.set(q === 'vendedor' ? falta : '0');
  }

  registrarRecibido(): void {
    const r = this.resumen();
    const q = this.qr();
    if (!r) return;
    if (q) {
      const res = this.store.exec((sim) => sim.registrarReparto(this.conductorId(), r.venta.id, q, this.reparto().empresa, this.reparto().vendedor));
      if (!res.ok) return;
    }
    this.router.navigateByUrl(`/conductor/ventas/${r.venta.id}/montos`, this.store.conAviso());
  }
}
