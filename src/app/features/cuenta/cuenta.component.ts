import { Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  cuentaVendedor,
  ESTADO_EXISTENCIAS_LABEL,
  ESTADO_PAGO_LABEL,
  ESTADO_VENDEDOR_LABEL,
  MEDIO_LABEL,
  subtotalSeleccion,
  vendedorById,
} from '../../core/simulation/selectors';
import { DemoStore } from '../../core/state/demo.store';
import { AYUDA_EN_PODER, BadgeComponent, IlustrativoComponent } from '../../shared/badges.component';
import { Miga, MigasComponent } from '../../shared/migas.component';
import { ParamAjenoComponent } from '../../shared/param-ajeno.component';
import { CopPipe, FechaPipe, KgPipe } from '../../shared/pipes';
import { MovimientosTablaComponent, TONO_PAGO, TONO_VENDEDOR } from './cuenta-shared';

/**
 * V20 · Cuenta del vendedor (empresa) y V26 · Mi cuenta (vendedor) (F08; RN-09, RN-11, RN-13).
 * Es la misma cuenta, con el vendedor de la ruta (empresa, validado contra su empresa, E09) o el
 * de la sesión (vendedor, E36): saldo total y por carga, aplicación de los abonos, dinero en
 * poder y, para la empresa, movimientos con saldo corrido. Aquí no se registra nada. El informe
 * tiene su propia ruta (V21, V29).
 */
@Component({
  selector: 'app-cuenta',
  imports: [RouterLink, BadgeComponent, IlustrativoComponent, MigasComponent, ParamAjenoComponent, MovimientosTablaComponent, CopPipe, FechaPipe, KgPipe],
  template: `
    @if (esEmpresa()) {
      <app-migas [items]="migas()" />
    }
    <div>
      <h1 class="page-title mb-3">{{ esEmpresa() ? 'Cuenta del vendedor' : 'Mi cuenta' }}</h1>

      @if (ajeno(); as msg) {
        <app-param-ajeno [texto]="msg" enlace="Cuentas de vendedores" link="/empresa/cuentas" />
      } @else if (cuenta(); as c) {
        <div class="mb-3 flex flex-wrap items-center gap-2">
          <h2 class="text-lg font-bold text-navy" data-testid="cuenta-vendedor">{{ c.vendedor.nombre }}</h2>
          <app-badge [tone]="tonoVendedor[c.estado]" data-testid="resumen-estado">{{ estadoVendedor[c.estado] }}</app-badge>
          <span class="flex-1"></span>
          <a class="btn btn-primary" [routerLink]="rutaInforme()" [queryParams]="paramsInforme()" data-testid="btn-informe">Informe</a>
          @if (esEmpresa()) {
            @if (store.can('pago.registrar')) {
              <a class="btn" routerLink="/empresa/pagos/nuevo" [queryParams]="{ vendedor: c.vendedor.id }" data-testid="ir-registrar-pago">Registrar pago</a>
            }
            <a class="btn" [routerLink]="'/empresa/conciliacion/' + c.vendedor.id" data-testid="ir-conciliacion">Conciliación</a>
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
              <p class="text-xs font-semibold text-muted uppercase">Saldo a favor <app-ilustrativo detalle="Lo cobrado de más se aplica a la siguiente carga." /></p>
              <p class="text-2xl font-extrabold text-primary" data-testid="resumen-a-favor">Saldo a favor: {{ c.saldoAFavor | cop }}</p>
            } @else {
              <p class="text-xs font-semibold text-muted uppercase">Saldo</p>
              <p class="text-2xl font-extrabold text-navy" data-testid="resumen-saldo">{{ c.saldoGeneral | cop }}</p>
            }
          </div>
          <div class="card">
            <p class="text-xs font-semibold text-muted uppercase">
              Dinero en poder <app-ilustrativo [detalle]="ayudaEnPoder" />
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
                  <td class="whitespace-nowrap">
                    <a class="font-mono text-primary underline" [routerLink]="rutaCarga() + x.carga.id" [attr.data-testid]="'abrir-' + x.carga.id">{{ x.carga.id }}</a>
                  </td>
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
                    <button type="button" class="min-h-11 text-xs text-primary underline md:min-h-0" [attr.data-testid]="'detalle-' + x.carga.id" (click)="abrir(x.carga.id)">
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
                              <app-ilustrativo detalle="Si la venta salió de varias cargas, el cobro se reparte en proporción al valor de los cilindros." />
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

        <div class="grid gap-4" [class.xl:grid-cols-2]="esEmpresa()">
          @if (esEmpresa()) {
            <section class="card overflow-x-auto">
              <h2 class="card-title">Movimientos (cuenta corriente)</h2>
              <app-movimientos-tabla [movimientos]="c.movimientos" />
            </section>
          }
          <section class="card overflow-x-auto">
            <h2 class="card-title">{{ esEmpresa() ? 'Dinero en poder del vendedor' : 'Dinero en tu poder' }} <app-ilustrativo [detalle]="ayudaEnPoder" /></h2>
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
      }
    </div>

  `,
})
export class CuentaComponent {
  readonly ayudaEnPoder = AYUDA_EN_PODER;
  readonly store = inject(DemoStore);
  /** `:vendedorId` (solo la empresa, V20; se valida contra su empresa, E09). */
  readonly vendedorId = input<string>();
  /** Dato de la ruta: `empresa` (V20) o `vendedor` (V26). */
  readonly modo = input<'empresa' | 'vendedor'>('vendedor');
  readonly estadoPago = ESTADO_PAGO_LABEL;
  readonly estadoExistencias = ESTADO_EXISTENCIAS_LABEL;
  readonly estadoVendedor = ESTADO_VENDEDOR_LABEL;
  readonly tonoPago = TONO_PAGO;
  readonly tonoVendedor = TONO_VENDEDOR;
  readonly medio = MEDIO_LABEL;

  readonly esEmpresa = computed(() => this.modo() === 'empresa');

  /** E09: un vendedor que no es de la empresa de la sesión no se muestra. */
  readonly ajeno = computed(() => {
    if (!this.esEmpresa()) return null;
    const v = vendedorById(this.store.state(), this.vendedorId());
    return v && v.empresaId === this.store.empresaId() ? null : `Ese vendedor no existe en ${this.store.empresa()?.nombre ?? ''}`;
  });

  /** El vendedor de la ruta (empresa) o el de la sesión (vendedor, E36). */
  readonly idVendedor = computed<string | null>(() => {
    if (!this.esEmpresa()) return this.store.vendedorId();
    return this.ajeno() ? null : (this.vendedorId() ?? null);
  });

  readonly cuenta = computed(() => {
    const id = this.idVendedor();
    return id ? cuentaVendedor(this.store.state(), id) : null;
  });

  readonly migas = computed<Miga[]>(() => [
    { label: 'Cartera' },
    { label: 'Cuentas de vendedores', link: '/empresa/cuentas' },
    { label: this.cuenta()?.vendedor.nombre ?? this.vendedorId() ?? '' },
  ]);

  readonly rutaCarga = computed(() => (this.esEmpresa() ? '/empresa/cargues/' : '/vendedor/cargas/'));
  readonly rutaInforme = computed(() => (this.esEmpresa() ? `/empresa/cuentas/${this.idVendedor()}/informe` : '/vendedor/informe'));
  /** El informe lleva las cargas marcadas o, si no hay ninguna, todas (sin parámetro). */
  readonly paramsInforme = computed(() => (this.seleccion().length ? { cargas: this.seleccion().join(',') } : {}));

  readonly seleccion = signal<string[]>([]);
  readonly abierta = signal<string | null>(null);

  readonly subtotal = computed(() => {
    const c = this.cuenta();
    return c ? subtotalSeleccion(c, this.seleccion()) : { valor: 0, aplicado: 0, saldo: 0 };
  });

  constructor() {
    // La selección y el detalle son de un vendedor: se limpian al cambiar de vendedor.
    effect(() => {
      this.idVendedor();
      untracked(() => {
        this.seleccion.set([]);
        this.abierta.set(null);
      });
    });
  }

  marcar(id: string): void {
    this.seleccion.update((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }

  abrir(id: string): void {
    this.abierta.update((a) => (a === id ? null : id));
  }
}
