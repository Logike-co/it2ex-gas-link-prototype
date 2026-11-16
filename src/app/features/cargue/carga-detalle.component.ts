import { Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { cargaById, cuentaVendedor, ESTADO_EXISTENCIAS_LABEL, ESTADO_PAGO_LABEL, quedanEnCarga, usuarioById, vendedorNombre } from '../../core/simulation/selectors';
import { DemoStore } from '../../core/state/demo.store';
import { BadgeComponent, IlustrativoComponent } from '../../shared/badges.component';
import { Miga, MigasComponent } from '../../shared/migas.component';
import { ParamAjenoComponent } from '../../shared/param-ajeno.component';
import { CopPipe, FechaPipe, KgPipe } from '../../shared/pipes';
import { TONO_PAGO } from '../cuenta/cuenta-shared';

/**
 * V18 · Detalle del cargue (empresa) y V27 · Detalle de mi carga (vendedor) (F05, F08; RN-03,
 * RN-13): líneas con el valor unitario copiado, peso y valor consolidado, estado de pago y de
 * existencias, y la aplicación de cada abono («origen» o «a la más antigua»). Solo lectura
 * (SUP-13). La carga se valida contra la sesión (§1.5): de la empresa en V18, del vendedor en V27.
 */
@Component({
  selector: 'app-carga-detalle',
  imports: [RouterLink, BadgeComponent, IlustrativoComponent, MigasComponent, ParamAjenoComponent, CopPipe, FechaPipe, KgPipe],
  template: `
    <app-migas [items]="migas()" />
    @if (datos(); as d) {
      <div class="mb-3 flex flex-wrap items-center gap-2">
        <h1 class="page-title font-mono" data-testid="carga-detalle-id">{{ d.cc.carga.id }}</h1>
        <app-badge [tone]="tonoPago[d.cc.estadoPago]" data-testid="carga-detalle-estado">{{ estadoPago[d.cc.estadoPago] }}</app-badge>
        <app-badge [tone]="d.cc.estadoExistencias === 'sobrevendida' ? 'warn' : 'neutral'" data-testid="carga-detalle-existencias">{{
          estadoExistencias[d.cc.estadoExistencias]
        }}</app-badge>
      </div>
      <section class="card mb-3">
        <dl class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm sm:grid-cols-[auto_1fr_auto_1fr]">
          <dt class="text-muted">Fecha</dt>
          <dd>{{ d.cc.carga.fechaHora | fecha }}</dd>
          <dt class="text-muted">Vendedor</dt>
          <dd>
            @if (esEmpresa()) {
              <a class="text-primary underline" [routerLink]="'/empresa/flota/vendedores/' + d.cc.carga.vendedorId">{{ d.vendedor }}</a>
            } @else {
              {{ d.vendedor }}
            }
          </dd>
          <dt class="text-muted">Camión</dt>
          <dd class="font-mono">{{ d.cc.placa }}</dd>
          <dt class="text-muted">Conductor</dt>
          <dd>{{ d.cc.conductor }}</dd>
          <dt class="text-muted">Registrada por</dt>
          <dd>{{ d.registradaPor }}</dd>
        </dl>
      </section>

      <section class="card mb-3 overflow-x-auto">
        <h2 class="card-title">Cilindros</h2>
        <table class="table" data-testid="carga-detalle-lineas">
          <thead>
            <tr><th>Presentación</th><th class="num">Unidades</th><th class="num">Peso</th><th class="num">Valor unitario</th><th class="num">Subtotal</th><th class="num">Quedan</th></tr>
          </thead>
          <tbody>
            @for (l of d.lineas; track l.presentacionId) {
              <tr>
                <td>{{ l.etiqueta }}</td>
                <td class="num">{{ l.unidades }}</td>
                <td class="num">{{ l.unidades * l.pesoDecimasKg | kg }}</td>
                <td class="num">{{ l.valorUnitario | cop }} <app-ilustrativo /></td>
                <td class="num">{{ l.unidades * l.valorUnitario | cop }}</td>
                <td class="num" [class.text-warning]="l.quedan < 0">{{ l.quedan }}</td>
              </tr>
            }
          </tbody>
          <tfoot>
            <tr class="font-bold">
              <td colspan="2">Total</td>
              <td class="num" data-testid="carga-detalle-peso">{{ d.cc.carga.pesoTotalDecimasKg | kg }}</td>
              <td></td>
              <td class="num" data-testid="carga-detalle-valor">{{ d.cc.carga.valorConsolidado | cop }}</td>
              <td></td>
            </tr>
          </tfoot>
        </table>
        <p class="mt-2 text-sm">
          Abonado <strong data-testid="carga-detalle-abonado">{{ d.cc.aplicado | cop }}</strong> · saldo
          <strong data-testid="carga-detalle-saldo">{{ d.cc.saldo | cop }}</strong>
        </p>
      </section>

      <section class="card mb-3 overflow-x-auto">
        <h2 class="card-title">Abonos aplicados</h2>
        <table class="table" data-testid="carga-detalle-aplicaciones">
          <thead>
            <tr><th>Abono</th><th>Fecha</th><th>Tipo</th><th>Regla</th><th class="num">Monto</th></tr>
          </thead>
          <tbody>
            @for (a of d.cc.aplicaciones; track a.abonoId + a.regla) {
              <tr [attr.data-testid]="'aplicacion-' + a.abonoId">
                <td class="font-mono whitespace-nowrap">{{ a.abonoId }}</td>
                <td class="whitespace-nowrap">{{ a.abono.fechaHora | fecha }}</td>
                <td>{{ a.abono.tipo === 'cobro_empresa' ? 'Cobro a la llave de la empresa' : 'Pago del vendedor' }}</td>
                <td class="font-semibold">
                  {{ a.regla === 'origen' ? 'origen' : 'a la más antigua' }}
                  @if (a.regla === 'origen') {
                    <app-ilustrativo detalle="Si la venta salió de varias cargas, el cobro se reparte en proporción al valor de los cilindros (SUP-05)." />
                  }
                </td>
                <td class="num">{{ a.monto | cop }}</td>
              </tr>
            } @empty {
              <tr><td colspan="5" class="text-muted">Sin abonos aplicados.</td></tr>
            }
          </tbody>
        </table>
      </section>

      <div class="flex flex-wrap gap-2">
        @if (esEmpresa()) {
          <a class="btn" [routerLink]="'/empresa/cuentas/' + d.cc.carga.vendedorId" data-testid="ver-cuenta">Ver cuenta del vendedor</a>
          <a class="btn" routerLink="/empresa/cargues" data-testid="volver">Volver a cargues</a>
        } @else {
          <a class="btn" routerLink="/vendedor/cuenta" data-testid="volver">Volver a mi cuenta</a>
        }
      </div>
    } @else {
      @if (esEmpresa()) {
        <app-param-ajeno [texto]="'Esa carga no existe en ' + (store.empresa()?.nombre ?? '')" enlace="Cargues" link="/empresa/cargues" />
      } @else {
        <app-param-ajeno texto="Esa carga no está en tu cuenta" enlace="Resumen" link="/vendedor/cuenta" />
      }
    }
  `,
})
export class CargaDetalleComponent {
  readonly store = inject(DemoStore);
  /** `:cargaId` */
  readonly cargaId = input<string>();
  /** Dato de la ruta: `empresa` (V18) o `vendedor` (V27). */
  readonly modo = input<'empresa' | 'vendedor'>('empresa');
  readonly estadoPago = ESTADO_PAGO_LABEL;
  readonly estadoExistencias = ESTADO_EXISTENCIAS_LABEL;
  readonly tonoPago = TONO_PAGO;

  readonly esEmpresa = computed(() => this.modo() === 'empresa');

  readonly datos = computed(() => {
    const s = this.store.state();
    const carga = cargaById(s, this.cargaId());
    if (!carga) return null;
    const propia = this.esEmpresa() ? carga.empresaId === this.store.empresaId() : carga.vendedorId === this.store.vendedorId();
    if (!propia) return null;
    const cc = cuentaVendedor(s, carga.vendedorId)?.cargas.find((x) => x.carga.id === carga.id);
    if (!cc) return null;
    return {
      cc,
      vendedor: vendedorNombre(s, carga.vendedorId),
      registradaPor: usuarioById(s, carga.registradaPor)?.nombre ?? carga.registradaPor,
      lineas: carga.lineas.map((l) => ({ ...l, quedan: quedanEnCarga(s, carga, l.presentacionId) })),
    };
  });

  readonly migas = computed<Miga[]>(() => {
    const id = this.cargaId() ?? '';
    return this.esEmpresa()
      ? [{ label: 'Operación' }, { label: 'Cargues', link: '/empresa/cargues' }, { label: id }]
      : [{ label: 'Mi cuenta' }, { label: 'Resumen', link: '/vendedor/cuenta' }, { label: id }];
  });
}
