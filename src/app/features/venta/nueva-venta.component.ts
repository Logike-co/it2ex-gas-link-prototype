import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { PresentacionId } from '../../core/simulation/model';
import { conductorById, etiquetaCorta, existenciasCamion, puedeVender, vehiculoById } from '../../core/simulation/selectors';
import { DemoStore } from '../../core/state/demo.store';

/**
 * V31 · Nueva venta (F06; RN-05, RN-06, RN-12, RV-01), pensada para el celular. El valor de la
 * venta es libre y no se piden datos del cliente. Vender más de lo que queda avisa pero no
 * bloquea (RN-10). Un camión sin cargas no vende (R-16, E21). Al registrar se abre el detalle de
 * la venta (V33), desde donde se cobra.
 */
@Component({
  selector: 'app-nueva-venta',
  imports: [RouterLink],
  template: `
    <div class="mx-auto max-w-lg">
      @if (camion(); as cam) {
        <h1 class="page-title mb-1">Nueva venta</h1>
        <p class="mb-3 text-sm text-muted" data-testid="nueva-venta-camion">Desde {{ cam.placa }}</p>
        @if (sinCargas()) {
          <p class="warning-text mb-3" data-testid="sin-cargas">Tu camión no tiene cargas. Pídele a la empresa que registre el cargue</p>
        }

        <form class="card mb-3" (submit)="$event.preventDefault(); registrar()" data-testid="form-venta">
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
          <div class="sticky bottom-0 -mx-4 mt-3 flex gap-2 bg-surface px-4 pt-2 pb-3">
            <button type="submit" class="btn btn-primary btn-lg flex-1" data-testid="registrar-venta" [disabled]="sinCargas()">
              {{ avisos().length ? 'Registrar de todas formas' : 'Registrar venta' }}
            </button>
            <a class="btn btn-lg" routerLink="/conductor/camion" data-testid="cancelar">Cancelar</a>
          </div>
        </form>

      }
    </div>
  `,
})
export class NuevaVentaComponent {
  readonly store = inject(DemoStore);
  private readonly router = inject(Router);

  private readonly conductor = computed(() => conductorById(this.store.state(), this.store.conductorId()));
  readonly camion = computed(() => vehiculoById(this.store.state(), this.conductor()?.vehiculoId));
  readonly existencias = computed(() => (this.camion() ? existenciasCamion(this.store.state(), (this.camion() as { id: string }).id) : []));
  /** R-16: un camión sin cargas no vende (E21). */
  readonly sinCargas = computed(() => !puedeVender(this.store.state(), this.conductor()?.id));

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
      this.router.navigateByUrl(`/conductor/ventas/${r.value.id}`);
    }
  }
}
