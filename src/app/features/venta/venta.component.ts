import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { localDate } from '../../core/simulation/clock';
import { PresentacionId } from '../../core/simulation/model';
import {
  byTime,
  cargasDeCamion,
  conductorById,
  etiquetaCorta,
  existenciasCamion,
  resumenVenta,
  textoVenta,
  vehiculoById,
  vendedorNombre,
} from '../../core/simulation/selectors';
import { DemoStore } from '../../core/state/demo.store';
import { BadgeComponent } from '../../shared/badges.component';
import { CopPipe, FechaPipe } from '../../shared/pipes';

/**
 * V06 · Mi camión y nueva venta (F06; RN-05, RN-06, RN-12, RV-01), pensada para el celular.
 * El valor de la venta es libre y no se piden datos del cliente. Vender más de lo que queda
 * avisa pero no bloquea (RN-10).
 */
@Component({
  selector: 'app-venta',
  imports: [RouterLink, BadgeComponent, CopPipe, FechaPipe],
  template: `
    <div class="mx-auto max-w-lg">
      @if (camion(); as cam) {
        <section class="card mb-3" data-testid="mi-camion">
          <h1 class="page-title" data-testid="mi-camion-placa">Mi camión: {{ cam.placa }}</h1>
          <p class="mb-2 text-sm text-muted">De {{ vendedor() }}</p>
          @if (existencias().length) {
            <table class="table" data-testid="existencias">
              <thead>
                <tr><th>Cilindro</th><th class="num">Cargadas</th><th class="num">Vendidas</th><th class="num">Quedan</th></tr>
              </thead>
              <tbody>
                @for (e of existencias(); track e.presentacionId) {
                  <tr>
                    <td>{{ e.etiqueta }}</td>
                    <td class="num">{{ e.cargadas }}</td>
                    <td class="num">{{ e.vendidas }}</td>
                    <td class="num font-bold" [class.text-warning]="e.quedan < 0" [attr.data-testid]="'quedan-' + e.presentacionId">{{ e.quedan }}</td>
                  </tr>
                }
              </tbody>
            </table>
          }
        </section>

        @if (sinCargas()) {
          <p class="warning-text mb-3" data-testid="sin-cargas">Tu camión no tiene cargas. Pídele a la empresa que registre el cargue</p>
        }

        <form class="card mb-3" (submit)="$event.preventDefault(); registrar()" data-testid="form-venta">
          <h2 class="card-title">Nueva venta</h2>
          @for (e of existencias(); track e.presentacionId) {
            <div class="mb-2 flex items-center gap-2">
              <span class="flex-1 font-semibold">{{ e.etiqueta }} <span class="text-xs font-normal text-muted">· quedan {{ e.quedan }}</span></span>
              <button type="button" class="btn btn-lg w-12" [attr.aria-label]="'Quitar un cilindro de ' + e.etiqueta" [attr.data-testid]="'menos-' + e.presentacionId" (click)="sumar(e.presentacionId, -1)">−</button>
              <input
                class="input input-lg w-16 text-center"
                inputmode="numeric"
                [attr.aria-label]="'Cilindros de ' + e.etiqueta"
                [attr.data-testid]="'cantidad-' + e.presentacionId"
                [value]="cantidad(e.presentacionId)"
                (input)="escribir(e.presentacionId, $event)"
              />
              <button type="button" class="btn btn-lg w-12" [attr.aria-label]="'Agregar un cilindro de ' + e.etiqueta" [attr.data-testid]="'mas-' + e.presentacionId" (click)="sumar(e.presentacionId, 1)">+</button>
            </div>
          }
          @for (a of avisos(); track a) {
            <p class="warning-text" data-testid="aviso-existencias">{{ a }}</p>
          }
          <label class="label mt-3" for="valor-venta">Valor de la venta (COP)</label>
          <input
            id="valor-venta"
            class="input input-lg"
            inputmode="numeric"
            placeholder="Precio libre"
            data-testid="valor-venta"
            [value]="valor()"
            (input)="valor.set(val($event))"
          />
          <p class="mt-1 text-xs text-muted">Precio libre. No se piden datos del cliente.</p>
          @if (error(); as e) {
            <p class="error-text" data-testid="error-venta" role="alert">{{ e }}</p>
          }
          <div class="sticky bottom-0 -mx-4 mt-3 bg-surface px-4 pt-2 pb-3">
            <button type="submit" class="btn btn-primary btn-lg w-full" data-testid="registrar-venta" [disabled]="sinCargas()">
              {{ avisos().length ? 'Registrar de todas formas' : 'Registrar venta' }}
            </button>
          </div>
        </form>

        <section class="card">
          <h2 class="card-title">Mis ventas de hoy y por cobrar</h2>
          <ul class="list-none space-y-2 p-0" data-testid="mis-ventas">
            @for (r of misVentas(); track r.venta.id) {
              <li class="flex flex-wrap items-center gap-2 border-b border-line pb-2" [attr.data-testid]="'venta-' + r.venta.id">
                <span class="font-mono text-sm">{{ r.venta.id }}</span>
                <span class="font-bold">{{ r.venta.valor | cop }}</span>
                <app-badge [tone]="r.estado === 'cobrada' ? 'ok' : r.estado === 'parcial' ? 'warn' : 'info'" [attr.data-testid]="'estado-venta-' + r.venta.id">{{ r.texto }}</app-badge>
                <span class="w-full text-xs text-muted">{{ r.venta.fechaHora | fecha }}</span>
                @if (r.estado !== 'cobrada') {
                  <a class="btn btn-lg flex-1" [routerLink]="'/conductor/cobro'" [queryParams]="{ venta: r.venta.id }" [attr.data-testid]="'cobrar-' + r.venta.id">Cobrar</a>
                  <a class="btn btn-lg flex-1" [routerLink]="'/conductor/montos'" [queryParams]="{ venta: r.venta.id }">Registrar montos</a>
                }
              </li>
            } @empty {
              <li class="text-sm text-muted">Todavía no tienes ventas hoy.</li>
            }
          </ul>
        </section>
      }
    </div>
  `,
})
export class VentaComponent {
  readonly store = inject(DemoStore);
  private readonly router = inject(Router);

  private readonly conductor = computed(() => conductorById(this.store.state(), this.store.perfilActivo()?.conductorId));
  readonly camion = computed(() => vehiculoById(this.store.state(), this.conductor()?.vehiculoId));
  readonly vendedor = computed(() => vendedorNombre(this.store.state(), this.camion()?.vendedorId ?? ''));
  readonly existencias = computed(() => (this.camion() ? existenciasCamion(this.store.state(), (this.camion() as { id: string }).id) : []));
  readonly sinCargas = computed(() => !this.camion() || cargasDeCamion(this.store.state(), (this.camion() as { id: string }).id).length === 0);

  readonly cantidades = signal<Partial<Record<PresentacionId, string>>>({});
  readonly valor = signal('');
  readonly error = signal<string | null>(null);

  /** RV-01: aviso por cada presentación que supera lo que queda. */
  readonly avisos = computed(() =>
    this.existencias()
      .map((e) => ({ e, n: Number(this.cantidades()[e.presentacionId] || 0) }))
      .filter(({ e, n }) => Number.isFinite(n) && n > Math.max(0, e.quedan))
      .map(({ e, n }) => `Quedan ${Math.max(0, e.quedan)} de ${etiquetaCorta(e.presentacionId)} en tu camión; vas a registrar ${n}`)
  );

  readonly misVentas = computed(() => {
    const s = this.store.state();
    const id = this.conductor()?.id;
    const hoy = localDate(new Date());
    return s.ventas
      .filter((v) => v.conductorId === id)
      .map((v) => resumenVenta(s, v))
      .filter((r) => localDate(new Date(r.venta.fechaHora)) === hoy || r.estado !== 'cobrada')
      .sort((a, b) => byTime(b.venta, a.venta))
      .map((r) => ({ ...r, texto: textoVenta(r) }));
  });

  val(event: Event): string {
    return (event.target as HTMLInputElement).value;
  }

  cantidad(p: PresentacionId): string {
    return this.cantidades()[p] ?? '0';
  }

  escribir(p: PresentacionId, event: Event): void {
    this.cantidades.update((c) => ({ ...c, [p]: this.val(event) }));
  }

  sumar(p: PresentacionId, delta: number): void {
    const actual = Number(this.cantidades()[p] || 0);
    const n = Math.max(0, (Number.isFinite(actual) ? Math.trunc(actual) : 0) + delta);
    this.cantidades.update((c) => ({ ...c, [p]: String(n) }));
  }

  registrar(): void {
    const conductorId = this.conductor()?.id ?? '';
    const r = this.store.exec((sim) => sim.registrarVenta(conductorId, { cantidades: this.cantidades(), valor: this.valor() }));
    this.error.set(r.ok ? null : r.error);
    if (r.ok) {
      this.cantidades.set({});
      this.valor.set('');
      this.router.navigate(['/conductor/cobro'], { queryParams: { venta: r.value.id } });
    }
  }
}
