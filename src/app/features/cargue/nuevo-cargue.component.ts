import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { PresentacionId } from '../../core/simulation/model';
import {
  catalogo,
  cuentaVendedor,
  faltaVendedor,
  prerrequisitosCargue,
  totalesCarga,
  vendedorNombre,
  vendedoresDe,
} from '../../core/simulation/selectors';
import { DemoStore } from '../../core/state/demo.store';
import { IlustrativoComponent } from '../../shared/badges.component';
import { MigasComponent } from '../../shared/migas.component';
import { CopPipe, KgPipe } from '../../shared/pipes';

/**
 * V17 · Nuevo cargue (F05; RN-02, RN-03, RN-12, R-16): vendedor → camión del vendedor →
 * conductor del vendedor → cantidades enteras. La vista previa calcula en vivo el peso y el
 * valor consolidado (R-01); al registrar, la carga suma a la deuda del vendedor y se abre su
 * detalle (V18). Si falta el catálogo con precios o un vendedor con camión y conductor, dice qué
 * falta y enlaza a donde se configura; la falta de llave solo avisa (SUP-26).
 */
@Component({
  selector: 'app-nuevo-cargue',
  imports: [RouterLink, IlustrativoComponent, MigasComponent, CopPipe, KgPipe],
  template: `
    <app-migas [items]="[{ label: 'Operación' }, { label: 'Cargues', link: '/empresa/cargues' }, { label: 'Nuevo cargue' }]" />
    <h1 class="page-title mb-3">Nuevo cargue</h1>
    @if (!pre().catalogo) {
      <div class="warning-text mb-2" data-testid="prerrequisito-catalogo">
        Falta el valor unitario de los cilindros en el catálogo ·
        <a class="font-semibold underline" routerLink="/empresa/configuracion/catalogo" data-testid="prerrequisito-catalogo-enlace">Catálogo de cilindros</a>
      </div>
    }
    @if (!pre().flota) {
      <div class="warning-text mb-2" data-testid="prerrequisito-flota">
        Falta un vendedor con camión y conductor ·
        <a class="font-semibold underline" routerLink="/empresa/flota/vendedores" data-testid="prerrequisito-flota-enlace">Vendedores</a>
      </div>
    }
    @if (!pre().llave) {
      <div class="warning-text mb-2" data-testid="prerrequisito-llave">
        Tu empresa no tiene llave de cobro: los conductores no podrán mostrar el QR de la empresa ·
        <a class="font-semibold underline" routerLink="/empresa/configuracion/llave" data-testid="prerrequisito-llave-enlace">Llave de cobro</a>
      </div>
    }
    <div class="grid gap-4 lg:grid-cols-[1fr_24rem]">
      <form class="card" (submit)="$event.preventDefault(); registrar()" data-testid="form-cargue">
        <div class="grid gap-3 sm:grid-cols-3">
          <div>
            <label class="label" for="car-vendedor">Vendedor *</label>
            <select id="car-vendedor" class="input" data-testid="cargue-vendedor" [value]="vendedorId()" (change)="elegirVendedor(val($event))">
              <option value="">Elige…</option>
              @for (v of vendedores(); track v.id) {
                <option [value]="v.id" [selected]="v.id === vendedorId()" [disabled]="!!v.falta" [attr.data-testid]="'opcion-vendedor-' + v.id">
                  {{ v.nombre }}{{ v.falta ? ' · ' + v.falta : '' }}
                </option>
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

        @if (noListos().length) {
          <ul class="mt-3 list-none space-y-1 p-0 text-xs text-muted" data-testid="vendedores-no-listos">
            @for (v of noListos(); track v.id) {
              <li [attr.data-testid]="'vendedor-no-listo-' + v.id">
                {{ v.nombre }}: {{ v.falta }} ·
                <a class="text-primary underline" [routerLink]="'/empresa/flota/vendedores/' + v.id">ver su detalle</a>
              </li>
            }
          </ul>
        }

        @if (error(); as e) {
          <p class="error-text" data-testid="error-cargue" role="alert">{{ e }}</p>
        }
        <div class="mt-3 flex flex-wrap gap-2">
          <button type="submit" class="btn btn-primary flex-1 sm:flex-none" data-testid="registrar-carga" [disabled]="!pre().puedeCargar">Registrar carga</button>
          <a class="btn" routerLink="/empresa/cargues" data-testid="cancelar">Cancelar</a>
        </div>
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

  `,
})
export class NuevoCargueComponent {
  readonly store = inject(DemoStore);
  private readonly router = inject(Router);
  private readonly empresaId = computed(() => this.store.empresaId() ?? '');

  readonly vendedorId = signal('');
  readonly vehiculoId = signal('');
  readonly conductorId = signal('');
  readonly cantidades = signal<Partial<Record<PresentacionId, string>>>({});
  readonly error = signal<string | null>(null);

  /** R-16: qué falta para cargar. */
  readonly pre = computed(() => prerrequisitosCargue(this.store.state(), this.empresaId()));
  readonly cat = computed(() => catalogo(this.store.state(), this.empresaId()));
  /** Vendedores con lo que les falta («Sin camión», «Sin conductor»); los que no están listos no se eligen (E60). */
  readonly vendedores = computed(() => {
    const s = this.store.state();
    return vendedoresDe(s, this.empresaId()).map((v) => {
      const f = faltaVendedor(s, v.id);
      return { ...v, falta: f.camion ? 'Sin camión' : f.conductor ? 'Sin conductor' : null };
    });
  });
  readonly noListos = computed(() => this.vendedores().filter((v) => !!v.falta));
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
      this.router.navigateByUrl(`/empresa/cargues/${r.value.id}`);
    }
  }
}
