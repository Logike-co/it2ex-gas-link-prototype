import { Component, computed, inject, signal } from '@angular/core';
import { PresentacionId } from '../../core/simulation/model';
import {
  byTime,
  catalogo,
  configuracionCompleta,
  conductorNombre,
  cuentaVendedor,
  ESTADO_EXISTENCIAS_LABEL,
  ESTADO_PAGO_LABEL,
  placaDe,
  totalesCarga,
  vendedorNombre,
  vendedoresDe,
} from '../../core/simulation/selectors';
import { DemoStore } from '../../core/state/demo.store';
import { BadgeComponent, IlustrativoComponent } from '../../shared/badges.component';
import { CodeTextComponent } from '../../shared/code-text.component';
import { CopPipe, FechaPipe, KgPipe } from '../../shared/pipes';

/**
 * V05 · Cargue (F05; RN-02, RN-03, RN-12): vendedor → camión del vendedor → conductor del
 * vendedor → cantidades enteras. La vista previa calcula en vivo el peso y el valor
 * consolidado (R-01); al registrar, la carga suma a la deuda del vendedor.
 */
@Component({
  selector: 'app-cargue',
  imports: [BadgeComponent, IlustrativoComponent, CodeTextComponent, CopPipe, FechaPipe, KgPipe],
  template: `
    <h1 class="page-title mb-3">Cargue</h1>
    @if (!completa()) {
      <p class="warning-text mb-3" data-testid="aviso-configuracion">
        Configuración pendiente: las presentaciones sin valor unitario no se pueden cargar. Complétalas en «Catálogo y llave».
      </p>
    }
    <div class="grid gap-4 lg:grid-cols-[1fr_24rem]">
      <form class="card" (submit)="$event.preventDefault(); registrar()" data-testid="form-cargue">
        <div class="grid gap-3 sm:grid-cols-3">
          <div>
            <label class="label" for="car-vendedor">Vendedor *</label>
            <select id="car-vendedor" class="input" data-testid="cargue-vendedor" [value]="vendedorId()" (change)="elegirVendedor(val($event))">
              <option value="">Elige…</option>
              @for (v of vendedores(); track v.id) {
                <option [value]="v.id" [selected]="v.id === vendedorId()">{{ v.nombre }}</option>
              }
            </select>
          </div>
          <div>
            <label class="label" for="car-camion">Camión *</label>
            <select id="car-camion" class="input" data-testid="cargue-camion" [value]="vehiculoId()" (change)="elegirCamion(val($event))">
              <option value="">Elige…</option>
              @for (c of camiones(); track c.id) {
                <option [value]="c.id" [selected]="c.id === vehiculoId()">{{ c.placa }}</option>
              }
            </select>
          </div>
          <div>
            <label class="label" for="car-conductor">Conductor *</label>
            <select id="car-conductor" class="input" data-testid="cargue-conductor" [value]="conductorId()" (change)="conductorId.set(val($event))">
              <option value="">Elige…</option>
              @for (c of conductores(); track c.id) {
                <option [value]="c.id" [selected]="c.id === conductorId()">{{ c.nombre }}</option>
              }
            </select>
          </div>
        </div>

        <h2 class="mt-4 mb-2 text-sm font-bold text-navy">Cilindros</h2>
        <div class="grid gap-2 sm:grid-cols-3">
          @for (p of cat(); track p.id) {
            <div>
              <label class="label" [for]="'car-' + p.id">
                {{ p.etiqueta }}
                @if (p.valorUnitario > 0) {
                  · {{ p.valorUnitario | cop }} <app-ilustrativo />
                }
              </label>
              @if (p.valorUnitario > 0 && p.activa) {
                <input
                  [id]="'car-' + p.id"
                  class="input"
                  inputmode="numeric"
                  placeholder="0"
                  [attr.data-testid]="'cargue-' + p.id"
                  [value]="cantidades()[p.id] ?? ''"
                  (input)="setCantidad(p.id, val($event))"
                />
              } @else {
                <input [id]="'car-' + p.id" class="input" disabled value="Sin valor unitario" [attr.data-testid]="'cargue-' + p.id" />
              }
            </div>
          }
        </div>

        <div class="mt-4 rounded-lg border border-primary/30 bg-primary-soft p-3" data-testid="vista-previa">
          <h2 class="mb-1 text-sm font-bold text-navy">Vista previa</h2>
          <table class="w-full text-sm">
            <tbody>
              @for (l of preview().lineas; track l.presentacionId) {
                <tr>
                  <td>{{ l.unidades }} × {{ l.etiqueta }}</td>
                  <td class="num">{{ l.unidades * l.pesoDecimasKg | kg }}</td>
                  <td class="num">{{ l.unidades * l.valorUnitario | cop }}</td>
                </tr>
              } @empty {
                <tr><td class="text-muted">Escribe las cantidades.</td></tr>
              }
            </tbody>
            <tfoot>
              <tr class="border-t border-primary/30 font-bold">
                <td>Total</td>
                <td class="num" data-testid="preview-peso">{{ preview().pesoTotalDecimasKg | kg }}</td>
                <td class="num text-lg text-navy" data-testid="preview-valor">{{ preview().valorConsolidado | cop }}</td>
              </tr>
            </tfoot>
          </table>
          @if (vendedorId()) {
            <p class="mt-1 text-xs">Este valor se suma a lo que {{ nombreVendedor() }} le debe a la empresa.</p>
          }
        </div>

        @if (error(); as e) {
          <p class="error-text" data-testid="error-cargue" role="alert">{{ e }}</p>
        }
        <button type="submit" class="btn btn-primary mt-3 w-full sm:w-auto" data-testid="registrar-carga">Registrar carga</button>
      </form>

      <section class="card">
        <h2 class="card-title">Cuenta de {{ vendedorId() ? nombreVendedor() : 'un vendedor' }}</h2>
        @if (cuenta(); as c) {
          <dl class="grid grid-cols-2 gap-1 text-sm" data-testid="cargue-cuenta">
            <dt class="text-muted">Total cargado</dt>
            <dd class="num">{{ c.totalCargado | cop }}</dd>
            <dt class="text-muted">Abonado</dt>
            <dd class="num">{{ c.totalAbonado | cop }}</dd>
            <dt class="font-bold">Saldo</dt>
            <dd class="num font-bold">{{ c.saldoGeneral | cop }}</dd>
          </dl>
        } @else {
          <p class="text-sm text-muted">Elige un vendedor para ver su saldo.</p>
        }
      </section>
    </div>

    <section class="card mt-4 overflow-x-auto">
      <h2 class="card-title">Últimas cargas</h2>
      <table class="table" data-testid="tabla-cargas">
        <thead>
          <tr>
            <th>Carga</th><th>Fecha</th><th>Vendedor</th><th>Camión</th><th>Conductor</th><th class="num">Peso</th><th class="num">Valor</th><th>Pago</th><th>Existencias</th>
          </tr>
        </thead>
        <tbody>
          @for (c of ultimas(); track c.id) {
            <tr [attr.data-testid]="'carga-' + c.id">
              <td class="font-mono whitespace-nowrap">{{ c.id }}</td>
              <td class="whitespace-nowrap">{{ c.fechaHora | fecha }}</td>
              <td>{{ c.vendedor }}</td>
              <td class="font-mono whitespace-nowrap">{{ c.placa }}</td>
              <td>{{ c.conductor }}</td>
              <td class="num">{{ c.pesoTotalDecimasKg | kg }}</td>
              <td class="num">{{ c.valorConsolidado | cop }}</td>
              <td><app-badge [tone]="c.pagoTone" [attr.data-testid]="'estado-' + c.id">{{ c.pago }}</app-badge></td>
              <td><app-badge [tone]="c.existencias === 'Sobrevendida' ? 'warn' : 'neutral'">{{ c.existencias }}</app-badge></td>
            </tr>
          } @empty {
            <tr><td colspan="9"><app-code-text text="Todavía no hay cargas en esta empresa." /></td></tr>
          }
        </tbody>
      </table>
    </section>
  `,
})
export class CargueComponent {
  readonly store = inject(DemoStore);
  private readonly empresaId = computed(() => this.store.empresaId() ?? '');

  readonly vendedorId = signal('');
  readonly vehiculoId = signal('');
  readonly conductorId = signal('');
  readonly cantidades = signal<Partial<Record<PresentacionId, string>>>({});
  readonly error = signal<string | null>(null);

  readonly completa = computed(() => configuracionCompleta(this.store.state(), this.empresaId()));
  readonly cat = computed(() => catalogo(this.store.state(), this.empresaId()));
  readonly vendedores = computed(() => vendedoresDe(this.store.state(), this.empresaId()));
  readonly camiones = computed(() => this.store.state().vehiculos.filter((v) => v.empresaId === this.empresaId() && v.vendedorId === this.vendedorId()));
  readonly conductores = computed(() => this.store.state().conductores.filter((c) => c.empresaId === this.empresaId() && c.vendedorId === this.vendedorId()));
  readonly nombreVendedor = computed(() => vendedorNombre(this.store.state(), this.vendedorId()));
  readonly cuenta = computed(() => (this.vendedorId() ? cuentaVendedor(this.store.state(), this.vendedorId()) : null));

  /** R-01 en vivo, con los valores actuales del catálogo. */
  readonly preview = computed(() => {
    const lineas = this.cat()
      .filter((p) => p.valorUnitario > 0 && p.activa)
      .map((p) => {
        const n = Number(String(this.cantidades()[p.id] ?? '').trim() || 0);
        return { presentacionId: p.id, etiqueta: p.etiqueta, unidades: Number.isInteger(n) && n > 0 ? n : 0, pesoDecimasKg: p.pesoDecimasKg, valorUnitario: p.valorUnitario };
      })
      .filter((l) => l.unidades > 0);
    return { lineas, ...totalesCarga(lineas) };
  });

  readonly ultimas = computed(() => {
    const s = this.store.state();
    const tono = { pendiente: 'neutral', abonada: 'warn', saldada: 'ok' } as const;
    return s.cargas
      .filter((c) => c.empresaId === this.empresaId())
      .sort(byTime)
      .reverse()
      .slice(0, 10)
      .map((c) => {
        const cc = cuentaVendedor(s, c.vendedorId)?.cargas.find((x) => x.carga.id === c.id);
        return {
          ...c,
          vendedor: vendedorNombre(s, c.vendedorId),
          placa: placaDe(s, c.vehiculoId),
          conductor: conductorNombre(s, c.conductorId),
          pago: cc ? ESTADO_PAGO_LABEL[cc.estadoPago] : '—',
          pagoTone: cc ? tono[cc.estadoPago] : ('neutral' as const),
          existencias: cc ? ESTADO_EXISTENCIAS_LABEL[cc.estadoExistencias] : '—',
        };
      });
  });

  val(event: Event): string {
    return (event.target as HTMLInputElement | HTMLSelectElement).value;
  }

  elegirVendedor(id: string): void {
    this.vendedorId.set(id);
    const camion = this.camiones()[0]?.id ?? '';
    this.elegirCamion(camion);
  }

  /** Por defecto, el conductor asignado al camión. */
  elegirCamion(id: string): void {
    this.vehiculoId.set(id);
    const asignado = this.conductores().find((c) => c.vehiculoId === id) ?? this.conductores()[0];
    this.conductorId.set(asignado?.id ?? '');
  }

  setCantidad(p: PresentacionId, v: string): void {
    this.cantidades.update((c) => ({ ...c, [p]: v }));
  }

  registrar(): void {
    const usuarioId = this.store.usuario()?.id ?? '';
    const r = this.store.exec((sim) =>
      sim.registrarCarga(this.empresaId(), usuarioId, {
        vendedorId: this.vendedorId(),
        vehiculoId: this.vehiculoId(),
        conductorId: this.conductorId(),
        cantidades: this.cantidades(),
      })
    );
    this.error.set(r.ok ? null : r.error);
    if (r.ok) {
      this.cantidades.set({});
    }
  }
}
