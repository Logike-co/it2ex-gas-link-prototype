import { Component, computed, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DISCLAIMER } from '../../brand';
import { formatMoney } from '../../core/simulation/format';
import { cuentaVendedor, ESTADO_PAGO_LABEL, ESTADO_VENDEDOR_LABEL, subtotalSeleccion, vendedorById } from '../../core/simulation/selectors';
import { DemoStore } from '../../core/state/demo.store';
import { MigasComponent } from '../../shared/migas.component';
import { ParamAjenoComponent } from '../../shared/param-ajeno.component';
import { CopPipe, FechaPipe } from '../../shared/pipes';

/**
 * V21 · Informe de la cuenta (empresa) y V29 · Mi informe (vendedor) (F08b, RN-09): vista
 * imprimible con vendedor, fecha, cargas incluidas (`?cargas=`; sin parámetro, todas; las
 * ajenas se ignoran), abonos con su aplicación, dinero en poder y totales. Lleva la leyenda
 * obligatoria arriba y abajo (E37).
 */
@Component({
  selector: 'app-informe',
  imports: [RouterLink, MigasComponent, ParamAjenoComponent, CopPipe, FechaPipe],
  template: `
    @if (esEmpresa()) {
      <div class="no-print">
        <app-migas
          [items]="[
            { label: 'Cartera' },
            { label: 'Cuentas de vendedores', link: '/empresa/cuentas' },
            { label: cuenta()?.vendedor?.nombre ?? vendedorId() ?? '', link: volver() },
            { label: 'Informe' },
          ]"
        />
      </div>
    }
    @if (ajeno(); as msg) {
      <app-param-ajeno [texto]="msg" enlace="Cuentas de vendedores" link="/empresa/cuentas" />
    } @else if (cuenta(); as c) {
      <div class="no-print mb-3 flex flex-wrap gap-2">
        <button type="button" class="btn btn-primary" data-testid="btn-imprimir" (click)="imprimir()">Imprimir</button>
        <a class="btn" [routerLink]="volver()" data-testid="volver-cuenta">Volver a la cuenta</a>
      </div>
      <article class="informe-imprimible mx-auto max-w-4xl rounded-xl border border-line bg-white shadow-sm print:border-0 print:shadow-none" data-testid="informe">
        <div class="border-b-2 border-accent bg-navy py-1 text-center text-xs font-extrabold tracking-widest text-white" data-testid="informe-leyenda">{{ disclaimer }}</div>
        <div class="p-4 md:p-6">
          <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
            <img src="gaslink-logo.png" alt="GasLink · Gestión comercial del gas" class="h-14 w-auto" width="168" height="56" />
            <div class="text-right text-sm">
              <h1 class="text-lg font-extrabold text-navy">Informe de la cuenta del vendedor</h1>
              <p>{{ empresaNombre() }}</p>
              <p class="text-muted">Generado {{ ahora() | fecha }}</p>
            </div>
          </div>
          <p class="mb-3 text-base"><strong>Vendedor: </strong><span data-testid="informe-vendedor">{{ c.vendedor.nombre }}</span> · {{ estadoVendedor[c.estado] }}</p>

          <h2 class="mt-4 mb-1 font-bold text-navy">Cargas incluidas ({{ cargasInforme().length }})</h2>
          <div class="overflow-x-auto">
            <table class="table" data-testid="informe-cargas">
              <thead><tr><th>Carga</th><th>Fecha</th><th>Camión</th><th class="num">Valor</th><th class="num">Abonado</th><th class="num">Saldo</th><th>Estado</th></tr></thead>
              <tbody>
                @for (x of cargasInforme(); track x.carga.id) {
                  <tr [attr.data-testid]="'informe-carga-' + x.carga.id">
                    <td class="font-mono">{{ x.carga.id }}</td>
                    <td>{{ x.carga.fechaHora | fecha }}</td>
                    <td class="font-mono">{{ x.placa }}</td>
                    <td class="num">{{ x.carga.valorConsolidado | cop }}</td>
                    <td class="num">{{ x.aplicado | cop }}</td>
                    <td class="num">{{ x.saldo | cop }}</td>
                    <td>{{ estadoPago[x.estadoPago] }}</td>
                  </tr>
                } @empty {
                  <tr><td colspan="7" class="text-muted">Sin cargas.</td></tr>
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
          </div>

          <h2 class="mt-4 mb-1 font-bold text-navy">Abonos y su aplicación</h2>
          <div class="overflow-x-auto">
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
          </div>

          <h2 class="mt-4 mb-1 font-bold text-navy">Dinero en poder del vendedor</h2>
          <p class="text-sm">Efectivo {{ c.enPoder.efectivo | cop }} · llave del vendedor {{ c.enPoder.llaveVendedor | cop }} · total <strong>{{ c.enPoder.total | cop }}</strong></p>
          <p class="text-sm">Pagado por el vendedor a la empresa: {{ c.pagosVendedor | cop }}</p>

          <h2 class="mt-4 mb-1 font-bold text-navy">Totales de la cuenta</h2>
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
      </article>
    }
  `,
})
export class InformeComponent {
  readonly store = inject(DemoStore);
  /** `:vendedorId` (empresa, V21). */
  readonly vendedorId = input<string>();
  /** `?cargas=CAR-A-002,CAR-A-003`: las ajenas se ignoran; sin parámetro, todas. */
  readonly cargas = input<string>();
  /** Dato de la ruta: `empresa` (V21) o `vendedor` (V29). */
  readonly modo = input<'empresa' | 'vendedor'>('vendedor');
  readonly disclaimer = DISCLAIMER;
  readonly estadoPago = ESTADO_PAGO_LABEL;
  readonly estadoVendedor = ESTADO_VENDEDOR_LABEL;
  readonly ahora = signal(new Date().toISOString());

  readonly esEmpresa = computed(() => this.modo() === 'empresa');
  readonly empresaNombre = computed(() => this.store.empresa()?.nombre ?? '');

  readonly ajeno = computed(() => {
    if (!this.esEmpresa()) return null;
    const v = vendedorById(this.store.state(), this.vendedorId());
    return v && v.empresaId === this.store.empresaId() ? null : `Ese vendedor no existe en ${this.empresaNombre()}`;
  });

  readonly idVendedor = computed(() => (this.esEmpresa() ? (this.ajeno() ? null : (this.vendedorId() ?? null)) : this.store.vendedorId()));
  readonly cuenta = computed(() => {
    const id = this.idVendedor();
    return id ? cuentaVendedor(this.store.state(), id) : null;
  });
  readonly volver = computed(() => (this.esEmpresa() ? `/empresa/cuentas/${this.vendedorId()}` : '/vendedor/cuenta'));

  /** Cargas pedidas que son de este vendedor; si no queda ninguna, todas. */
  readonly cargasInforme = computed(() => {
    const c = this.cuenta();
    if (!c) return [];
    const pedidas = (this.cargas() ?? '')
      .split(',')
      .map((x) => x.trim())
      .filter(Boolean);
    const propias = c.cargas.filter((x) => pedidas.includes(x.carga.id));
    return propias.length ? propias : c.cargas;
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

  imprimir(): void {
    this.ahora.set(new Date().toISOString());
    window.print();
  }
}
