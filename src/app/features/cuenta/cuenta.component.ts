import { Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import {
  cuentaVendedor,
  ESTADO_EXISTENCIAS_LABEL,
  ESTADO_PAGO_LABEL,
  ESTADO_VENDEDOR_LABEL,
  EstadoPago,
  EstadoVendedor,
  MEDIO_LABEL,
  subtotalSeleccion,
  vendedoresDe,
} from '../../core/simulation/selectors';
import { formatMoney } from '../../core/simulation/format';
import { DemoStore } from '../../core/state/demo.store';
import { BadgeComponent, BadgeTone, IlustrativoComponent } from '../../shared/badges.component';
import { CodeTextComponent } from '../../shared/code-text.component';
import { CopPipe, FechaPipe, KgPipe } from '../../shared/pipes';
import { DISCLAIMER } from '../../brand';

export const TONO_PAGO: Record<EstadoPago, BadgeTone> = { pendiente: 'neutral', abonada: 'warn', saldada: 'ok' };
export const TONO_VENDEDOR: Record<EstadoVendedor, BadgeTone> = { sin_cargas: 'neutral', con_saldo: 'warn', al_dia: 'ok', a_favor: 'info' };

/**
 * V09 · Cuenta del vendedor e informe (F08, F08b; RN-09, RN-11, RN-13). Cuenta corriente con
 * saldo total y por carga, aplicaciones de los abonos (origen o la más antigua), movimientos
 * con saldo corrido y dinero en poder del vendedor. Solo lectura. La empresa elige el vendedor
 * (solo de los suyos, E09); el vendedor ve solo su cuenta (E36).
 */
@Component({
  selector: 'app-cuenta',
  imports: [RouterLink, BadgeComponent, IlustrativoComponent, CodeTextComponent, CopPipe, FechaPipe, KgPipe],
  template: `
    <div [class.no-print]="informe()">
      <div class="mb-3 flex flex-wrap items-center gap-2">
        <h1 class="page-title flex-1">{{ esEmpresa() ? 'Cuentas' : 'Mi cuenta' }}</h1>
        @if (esEmpresa()) {
          <label class="sr-only" for="sel-vendedor">Vendedor</label>
          <select id="sel-vendedor" class="input w-auto" data-testid="selector-vendedor" (change)="elegir($event)">
            @for (v of vendedores(); track v.id) {
              <option [value]="v.id" [selected]="v.id === vendedorId()">{{ v.nombre }}</option>
            }
          </select>
        }
      </div>

      @if (ajeno(); as msg) {
        <p class="error-text" data-testid="vendedor-ajeno" role="alert">{{ msg }}</p>
      } @else if (cuenta(); as c) {
        <div class="mb-3 flex flex-wrap items-center gap-2">
          <h2 class="text-lg font-bold text-navy" data-testid="cuenta-vendedor">{{ c.vendedor.nombre }}</h2>
          <app-badge [tone]="tonoVendedor[c.estado]" data-testid="resumen-estado">{{ estadoVendedor[c.estado] }}</app-badge>
          <span class="flex-1"></span>
          <button type="button" class="btn btn-primary" data-testid="btn-informe" (click)="informe.set(true)">Informe</button>
          @if (esEmpresa()) {
            <a class="btn" [routerLink]="'/empresa/conciliacion'" [queryParams]="{ vendedor: c.vendedor.id }" data-testid="ir-conciliacion">Ir a la conciliación</a>
          }
        </div>

        <section class="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4" data-testid="resumen">
          <div class="card">
            <p class="text-xs font-semibold text-muted uppercase">Total cargado</p>
            <p class="text-2xl font-extrabold text-navy" data-testid="resumen-cargado">{{ c.totalCargado | cop }}</p>
          </div>
          <div class="card">
            <p class="text-xs font-semibold text-muted uppercase">Abonado</p>
            <p class="text-2xl font-extrabold text-navy" data-testid="resumen-abonado">{{ c.totalAbonado | cop }}</p>
            <p class="text-xs text-muted">Llave de la empresa {{ c.cobrosEmpresa | cop }} · pagos del vendedor {{ c.pagosVendedor | cop }}</p>
          </div>
          <div class="card border-2" [class.border-accent]="c.saldoGeneral > 0">
            @if (c.saldoAFavor > 0) {
              <p class="text-xs font-semibold text-muted uppercase">Saldo a favor <app-ilustrativo detalle="Lo cobrado de más se aplica a la siguiente carga (SUP-06)." /></p>
              <p class="text-2xl font-extrabold text-primary" data-testid="resumen-a-favor">Saldo a favor: {{ c.saldoAFavor | cop }}</p>
            } @else {
              <p class="text-xs font-semibold text-muted uppercase">Saldo</p>
              <p class="text-2xl font-extrabold text-navy" data-testid="resumen-saldo">{{ c.saldoGeneral | cop }}</p>
            }
          </div>
          <div class="card">
            <p class="text-xs font-semibold text-muted uppercase">
              Dinero en poder <app-ilustrativo detalle="Suma de efectivo y llave del vendedor; no se descuenta con sus pagos (SUP-10)." />
            </p>
            <p class="text-2xl font-extrabold text-navy">{{ c.enPoder.total | cop }}</p>
            <p class="text-xs" data-testid="resumen-en-poder">
              {{ esEmpresa() ? 'Dinero en poder del vendedor' : 'Dinero en tu poder' }}: <span class="whitespace-nowrap">{{ c.enPoder.total | cop }}</span> (efectivo
              <span class="whitespace-nowrap">{{ c.enPoder.efectivo | cop }}</span> · {{ esEmpresa() ? 'su llave' : 'tu llave' }}
              <span class="whitespace-nowrap">{{ c.enPoder.llaveVendedor | cop }}</span>)
            </p>
            <p class="text-xs text-muted" data-testid="resumen-pagado-vendedor">Pagado por el vendedor a la empresa: {{ c.pagosVendedor | cop }}</p>
          </div>
        </section>

        <section class="card mb-4 overflow-x-auto">
          <h2 class="card-title">Cargas</h2>
          <table class="table" data-testid="tabla-cargas-cuenta">
            <thead>
              <tr>
                <th><span class="sr-only">Marcar</span></th>
                <th>Carga</th><th>Fecha</th><th>Camión</th><th>Conductor</th><th class="num">Peso</th>
                <th class="num">Valor</th><th class="num">Abonado</th><th class="num">Saldo</th><th>Pago</th><th>Existencias</th><th></th>
              </tr>
            </thead>
            <tbody>
              @for (x of c.cargas; track x.carga.id) {
                <tr [attr.data-testid]="'cuenta-carga-' + x.carga.id">
                  <td>
                    <input
                      type="checkbox"
                      class="h-5 w-5"
                      [attr.aria-label]="'Marcar ' + x.carga.id"
                      [attr.data-testid]="'marcar-' + x.carga.id"
                      [checked]="seleccion().includes(x.carga.id)"
                      (change)="marcar(x.carga.id)"
                    />
                  </td>
                  <td class="font-mono whitespace-nowrap">{{ x.carga.id }}</td>
                  <td class="whitespace-nowrap">{{ x.carga.fechaHora | fecha }}</td>
                  <td class="font-mono whitespace-nowrap">{{ x.placa }}</td>
                  <td>{{ x.conductor }}</td>
                  <td class="num">{{ x.carga.pesoTotalDecimasKg | kg }}</td>
                  <td class="num">{{ x.carga.valorConsolidado | cop }}</td>
                  <td class="num" [attr.data-testid]="'abonado-' + x.carga.id">{{ x.aplicado | cop }}</td>
                  <td class="num font-bold" [attr.data-testid]="'saldo-' + x.carga.id">{{ x.saldo | cop }}</td>
                  <td><app-badge [tone]="tonoPago[x.estadoPago]" [attr.data-testid]="'estado-' + x.carga.id">{{ estadoPago[x.estadoPago] }}</app-badge></td>
                  <td>{{ estadoExistencias[x.estadoExistencias] }}</td>
                  <td>
                    <button type="button" class="text-xs text-primary underline" [attr.data-testid]="'detalle-' + x.carga.id" (click)="abrir(x.carga.id)">
                      {{ abierta() === x.carga.id ? 'Ocultar' : 'Abonos' }}
                    </button>
                  </td>
                </tr>
                @if (abierta() === x.carga.id) {
                  <tr>
                    <td colspan="12" class="bg-surface-alt" [attr.data-testid]="'aplicaciones-' + x.carga.id">
                      @for (a of x.aplicaciones; track a.abonoId + a.regla) {
                        <div class="flex flex-wrap gap-x-3 text-xs" [attr.data-testid]="'aplicacion-' + a.abonoId">
                          <span class="font-mono">{{ a.abonoId }}</span>
                          <span>{{ a.abono.fechaHora | fecha }}</span>
                          <span>{{ a.abono.tipo === 'cobro_empresa' ? 'Cobro a la llave de la empresa' : 'Pago del vendedor' }}</span>
                          <span class="font-semibold">
                            {{ a.regla === 'origen' ? 'origen' : 'a la más antigua' }}
                            @if (a.regla === 'origen') {
                              <app-ilustrativo detalle="Si la venta salió de varias cargas, el cobro se reparte en proporción al valor de los cilindros (SUP-05)." />
                            }
                          </span>
                          <span class="num">{{ a.monto | cop }}</span>
                        </div>
                      } @empty {
                        <span class="text-xs text-muted">Sin abonos aplicados.</span>
                      }
                    </td>
                  </tr>
                }
              } @empty {
                <tr><td colspan="12" class="text-muted">Sin cargas.</td></tr>
              }
            </tbody>
          </table>
          @if (seleccion().length) {
            <p class="mt-2 rounded-lg bg-primary-soft px-3 py-2 text-sm" data-testid="subtotal-seleccion">
              Selección ({{ seleccion().length }}): valor <strong data-testid="sel-valor">{{ subtotal().valor | cop }}</strong> · abonado
              <strong data-testid="sel-abonado">{{ subtotal().aplicado | cop }}</strong> · saldo <strong data-testid="sel-saldo">{{ subtotal().saldo | cop }}</strong>
            </p>
          }
        </section>

        <div class="grid gap-4 xl:grid-cols-2">
          <section class="card overflow-x-auto">
            <h2 class="card-title">Movimientos (cuenta corriente)</h2>
            <table class="table" data-testid="tabla-movimientos">
              <thead>
                <tr><th>Fecha</th><th>Movimiento</th><th class="num">Cargo</th><th class="num">Abono</th><th class="num">Saldo</th></tr>
              </thead>
              <tbody>
                @for (m of c.movimientos; track m.id) {
                  <tr [attr.data-testid]="'mov-' + m.id">
                    <td class="whitespace-nowrap">{{ m.fechaHora | fecha }}</td>
                    <td><app-code-text [text]="m.descripcion" /></td>
                    <td class="num">{{ m.cargo ? (m.cargo | cop) : '' }}</td>
                    <td class="num">{{ m.abono ? (m.abono | cop) : '' }}</td>
                    <td class="num font-semibold">{{ m.saldo < 0 ? (-m.saldo | cop) + ' a favor' : (m.saldo | cop) }}</td>
                  </tr>
                } @empty {
                  <tr><td colspan="5" class="text-muted">Sin movimientos.</td></tr>
                }
              </tbody>
            </table>
          </section>
          <section class="card overflow-x-auto">
            <h2 class="card-title">Dinero en poder del vendedor <app-ilustrativo detalle="SUP-10" /></h2>
            <p class="mb-2 text-xs text-muted">Cobros en efectivo y a la llave del vendedor: no abonan a la cuenta.</p>
            <table class="table" data-testid="tabla-en-poder">
              <thead>
                <tr><th>Cobro</th><th>Fecha</th><th>Medio</th><th>Venta</th><th class="num">Monto</th></tr>
              </thead>
              <tbody>
                @for (x of c.cobrosEnPoder; track x.id) {
                  <tr>
                    <td class="font-mono whitespace-nowrap">{{ x.id }}</td>
                    <td class="whitespace-nowrap">{{ x.fechaHora | fecha }}</td>
                    <td>{{ medio[x.medio] }}{{ x.referencia ? ' · ref. ' + x.referencia : '' }}</td>
                    <td class="font-mono whitespace-nowrap">{{ x.ventaId }}</td>
                    <td class="num">{{ x.monto | cop }}</td>
                  </tr>
                } @empty {
                  <tr><td colspan="5" class="text-muted">Sin cobros en su poder.</td></tr>
                }
              </tbody>
            </table>
          </section>
        </div>
      } @else {
        <p class="card text-sm text-muted">No hay vendedores en esta empresa todavía.</p>
      }
    </div>

    @if (informe() && cuenta(); as c) {
      <div class="informe-imprimible fixed inset-0 z-[70] overflow-y-auto bg-white print:static print:overflow-visible" role="dialog" aria-modal="true" aria-label="Informe de la cuenta" data-testid="informe">
        <div class="border-b-2 border-accent bg-navy py-1 text-center text-xs font-extrabold tracking-widest text-white" data-testid="informe-leyenda">{{ disclaimer }}</div>
        <div class="mx-auto max-w-4xl p-4 md:p-6">
          <div class="no-print mb-4 flex gap-2">
            <button type="button" class="btn btn-primary" data-testid="btn-imprimir" (click)="imprimir()">Imprimir</button>
            <button type="button" class="btn" data-testid="cerrar-informe" (click)="informe.set(false)">Cerrar</button>
          </div>
          <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
            <img src="gaslink-logo.png" alt="GasLink · Gestión comercial del gas" class="h-14 w-auto" width="168" height="56" />
            <div class="text-right text-sm">
              <p class="text-lg font-extrabold text-navy">Informe de la cuenta del vendedor</p>
              <p>{{ empresaNombre() }}</p>
              <p class="text-muted">Generado {{ ahora() | fecha }}</p>
            </div>
          </div>
          <p class="mb-3 text-base"><strong>Vendedor: </strong><span data-testid="informe-vendedor">{{ c.vendedor.nombre }}</span> · {{ estadoVendedor[c.estado] }}</p>

          <h3 class="mt-4 mb-1 font-bold text-navy">Cargas incluidas ({{ cargasInforme().length }})</h3>
          <table class="table" data-testid="informe-cargas">
            <thead><tr><th>Carga</th><th>Fecha</th><th>Camión</th><th class="num">Valor</th><th class="num">Abonado</th><th class="num">Saldo</th><th>Estado</th></tr></thead>
            <tbody>
              @for (x of cargasInforme(); track x.carga.id) {
                <tr>
                  <td class="font-mono">{{ x.carga.id }}</td>
                  <td>{{ x.carga.fechaHora | fecha }}</td>
                  <td class="font-mono">{{ x.placa }}</td>
                  <td class="num">{{ x.carga.valorConsolidado | cop }}</td>
                  <td class="num">{{ x.aplicado | cop }}</td>
                  <td class="num">{{ x.saldo | cop }}</td>
                  <td>{{ estadoPago[x.estadoPago] }}</td>
                </tr>
              }
            </tbody>
            <tfoot>
              <tr class="font-bold">
                <td colspan="3">Subtotal de las cargas incluidas</td>
                <td class="num">{{ subtotalInforme().valor | cop }}</td>
                <td class="num">{{ subtotalInforme().aplicado | cop }}</td>
                <td class="num" data-testid="informe-subtotal-saldo">{{ subtotalInforme().saldo | cop }}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>

          <h3 class="mt-4 mb-1 font-bold text-navy">Abonos y su aplicación</h3>
          <table class="table" data-testid="informe-abonos">
            <thead><tr><th>Abono</th><th>Fecha</th><th>Tipo</th><th>Referencia</th><th class="num">Monto</th><th>Aplicado a</th></tr></thead>
            <tbody>
              @for (a of abonosInforme(); track a.abono.id) {
                <tr>
                  <td class="font-mono">{{ a.abono.id }}</td>
                  <td>{{ a.abono.fechaHora | fecha }}</td>
                  <td>{{ a.abono.tipo === 'cobro_empresa' ? 'Cobro a la llave de la empresa' : 'Pago del vendedor' }}</td>
                  <td>{{ a.abono.referencia || (a.abono.pago?.detalle ?? 'Sin referencia') }}</td>
                  <td class="num">{{ a.abono.monto | cop }}</td>
                  <td>{{ a.texto }}</td>
                </tr>
              } @empty {
                <tr><td colspan="6" class="text-muted">Sin abonos a estas cargas.</td></tr>
              }
            </tbody>
          </table>

          <h3 class="mt-4 mb-1 font-bold text-navy">Dinero en poder del vendedor</h3>
          <p class="text-sm">Efectivo {{ c.enPoder.efectivo | cop }} · llave del vendedor {{ c.enPoder.llaveVendedor | cop }} · total <strong>{{ c.enPoder.total | cop }}</strong></p>
          <p class="text-sm">Pagado por el vendedor a la empresa: {{ c.pagosVendedor | cop }}</p>

          <h3 class="mt-4 mb-1 font-bold text-navy">Totales de la cuenta</h3>
          <table class="table max-w-md">
            <tbody>
              <tr><td>Total cargado</td><td class="num">{{ c.totalCargado | cop }}</td></tr>
              <tr><td>Total abonado</td><td class="num">{{ c.totalAbonado | cop }}</td></tr>
              <tr class="font-bold"><td>Saldo</td><td class="num" data-testid="informe-saldo">{{ c.saldoGeneral | cop }}</td></tr>
              @if (c.saldoAFavor > 0) {
                <tr><td>Saldo a favor</td><td class="num">{{ c.saldoAFavor | cop }}</td></tr>
              }
            </tbody>
          </table>
          <p class="mt-6 text-center text-xs font-bold tracking-widest text-navy">{{ disclaimer }}</p>
        </div>
      </div>
    }
  `,
})
export class CuentaComponent {
  readonly store = inject(DemoStore);
  private readonly router = inject(Router);
  /** `?vendedor=VEN-…` (solo para la empresa; el vendedor lo ignora, E36). */
  readonly vendedor = input<string>();
  readonly disclaimer = DISCLAIMER;
  readonly estadoPago = ESTADO_PAGO_LABEL;
  readonly estadoExistencias = ESTADO_EXISTENCIAS_LABEL;
  readonly estadoVendedor = ESTADO_VENDEDOR_LABEL;
  readonly tonoPago = TONO_PAGO;
  readonly tonoVendedor = TONO_VENDEDOR;
  readonly medio = MEDIO_LABEL;

  readonly esEmpresa = computed(() => this.store.perfil() === 'empresa');
  readonly vendedores = computed(() => (this.esEmpresa() ? vendedoresDe(this.store.state(), this.store.empresaId() ?? '') : []));
  readonly empresaNombre = computed(() => this.store.empresa()?.nombre ?? '');

  /** E09: un vendedor que no es de la empresa de la sesión no se muestra. */
  readonly ajeno = computed(() => {
    const id = this.vendedor();
    if (!this.esEmpresa() || !id) return null;
    return this.vendedores().some((v) => v.id === id) ? null : `Ese vendedor no existe en ${this.empresaNombre()}`;
  });

  readonly vendedorId = computed<string | null>(() => {
    if (!this.esEmpresa()) return this.store.perfilActivo()?.vendedorId ?? null;
    if (this.ajeno()) return null;
    const id = this.vendedor();
    if (id) return id;
    const s = this.store.state();
    const vs = this.vendedores();
    return (vs.find((v) => (cuentaVendedor(s, v.id)?.saldoGeneral ?? 0) > 0) ?? vs[0])?.id ?? null;
  });

  readonly cuenta = computed(() => {
    const id = this.vendedorId();
    return id ? cuentaVendedor(this.store.state(), id) : null;
  });

  readonly seleccion = signal<string[]>([]);
  readonly abierta = signal<string | null>(null);
  readonly informe = signal(false);
  readonly ahora = signal(new Date().toISOString());

  readonly subtotal = computed(() => {
    const c = this.cuenta();
    return c ? subtotalSeleccion(c, this.seleccion()) : { valor: 0, aplicado: 0, saldo: 0 };
  });

  /** El informe lleva las cargas marcadas o, si no hay ninguna, todas. */
  readonly cargasInforme = computed(() => {
    const c = this.cuenta();
    if (!c) return [];
    return this.seleccion().length ? c.cargas.filter((x) => this.seleccion().includes(x.carga.id)) : c.cargas;
  });
  readonly subtotalInforme = computed(() => {
    const c = this.cuenta();
    return c ? subtotalSeleccion(c, this.cargasInforme().map((x) => x.carga.id)) : { valor: 0, aplicado: 0, saldo: 0 };
  });
  readonly abonosInforme = computed(() => {
    const c = this.cuenta();
    if (!c) return [];
    const ids = this.cargasInforme().map((x) => x.carga.id);
    return c.abonos
      .filter((a) => a.aplicaciones.some((x) => ids.includes(x.cargaId)) || (a.aplicaciones.length === 0 && ids.length === c.cargas.length))
      .map((a) => ({
        abono: a.abono,
        texto:
          [
            ...a.aplicaciones.map((x) => `${x.cargaId} ${formatMoney(x.monto)} (${x.regla === 'origen' ? 'origen' : 'a la más antigua'})`),
            ...(a.sinAplicar > 0 ? [`a favor ${formatMoney(a.sinAplicar)}`] : []),
          ].join(' · ') || '—',
      }));
  });

  constructor() {
    // La selección y el detalle son de un vendedor: se limpian al cambiar de vendedor.
    effect(() => {
      this.vendedorId();
      untracked(() => {
        this.seleccion.set([]);
        this.abierta.set(null);
      });
    });
  }

  elegir(event: Event): void {
    const id = (event.target as HTMLSelectElement).value;
    this.router.navigate(['/cuenta'], { queryParams: { vendedor: id } });
  }

  marcar(id: string): void {
    this.seleccion.update((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }

  abrir(id: string): void {
    this.abierta.update((a) => (a === id ? null : id));
  }

  imprimir(): void {
    this.ahora.set(new Date().toISOString());
    window.print();
  }
}
