import { Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { vendedorById, vendedoresDe } from '../../core/simulation/selectors';
import { DemoStore } from '../../core/state/demo.store';
import { Miga, MigasComponent } from '../../shared/migas.component';
import { ParamAjenoComponent } from '../../shared/param-ajeno.component';

/**
 * V13 · Nuevo camión (F04; RV-04, SUP-16). Con `?vendedor=` (desde el detalle del vendedor) el
 * dueño queda fijo y al guardar vuelve a ese detalle; desde «Camiones», el dueño se elige y
 * vuelve a la lista (SUP-28). Sin vendedores, dice qué falta (R-16).
 */
@Component({
  selector: 'app-nuevo-camion',
  imports: [FormsModule, RouterLink, MigasComponent, ParamAjenoComponent],
  template: `
    <app-migas [items]="migas()" />
    <h1 class="page-title mb-3">Nuevo camión</h1>
    @if (ajeno()) {
      <app-param-ajeno [texto]="'Ese vendedor no existe en ' + (store.empresa()?.nombre ?? '')" enlace="Camiones" link="/empresa/flota/camiones" />
    } @else if (!vendedores().length) {
      <div class="warning-text max-w-lg" data-testid="prerrequisito-vendedor">
        <p>Primero registra un vendedor</p>
        <a class="btn mt-2" routerLink="/empresa/flota/vendedores/nuevo">Nuevo vendedor</a>
      </div>
    } @else {
      <form class="card max-w-lg" (ngSubmit)="crearCamion()" data-testid="form-camion">
        <label class="label" for="cam-placa">Placa (AAA 999) *</label>
        <input id="cam-placa" class="input mb-2" name="placa" autocapitalize="characters" data-testid="camion-placa" [(ngModel)]="cPlaca" />
        @if (fijo(); as v) {
          <!-- Valor fijo (no es un control): la etiqueta es texto, no un <label for>. -->
          <p class="label">Dueño</p>
          <p class="input flex items-center bg-surface-alt font-semibold" data-testid="camion-dueno-fijo">{{ v.nombre }}</p>
        } @else {
          <label class="label" for="cam-dueno">Dueño *</label>
          <select id="cam-dueno" class="input" name="dueno" data-testid="camion-dueno" [(ngModel)]="cDueno">
            <option value="">Elige el vendedor…</option>
            @for (v of vendedores(); track v.id) {
              <option [value]="v.id">{{ v.nombre }}</option>
            }
          </select>
        }
        @if (errorCamion(); as e) {
          <p class="error-text" data-testid="error-camion" role="alert">{{ e }}</p>
        }
        <div class="mt-3 flex flex-wrap gap-2">
          <button type="submit" class="btn btn-primary flex-1" data-testid="crear-camion">Registrar camión</button>
          <a class="btn" [routerLink]="volver()" data-testid="cancelar">Cancelar</a>
        </div>
      </form>
    }
  `,
})
export class NuevoCamionComponent {
  readonly store = inject(DemoStore);
  private readonly router = inject(Router);
  /** `?vendedor=VEN-…`: dueño fijo (SUP-28). */
  readonly vendedor = input<string>();
  cPlaca = '';
  cDueno = '';
  readonly errorCamion = signal<string | null>(null);

  readonly vendedores = computed(() => vendedoresDe(this.store.state(), this.store.empresaId() ?? ''));
  readonly fijo = computed(() => {
    const v = vendedorById(this.store.state(), this.vendedor());
    return v && v.empresaId === this.store.empresaId() ? v : null;
  });
  readonly ajeno = computed(() => !!this.vendedor() && !this.fijo());
  readonly volver = computed(() => (this.fijo() ? `/empresa/flota/vendedores/${this.fijo()?.id}` : '/empresa/flota/camiones'));
  readonly migas = computed<Miga[]>(() => {
    const v = this.fijo();
    return v
      ? [{ label: 'Flota' }, { label: 'Vendedores', link: '/empresa/flota/vendedores' }, { label: v.nombre, link: this.volver() }, { label: 'Nuevo camión' }]
      : [{ label: 'Flota' }, { label: 'Camiones', link: '/empresa/flota/camiones' }, { label: 'Nuevo camión' }];
  });

  constructor() {
    effect(() => {
      const v = this.fijo();
      untracked(() => (this.cDueno = v?.id ?? ''));
    });
  }

  crearCamion(): void {
    const empresaId = this.store.empresaId() ?? '';
    const r = this.store.exec((sim) => sim.crearVehiculo(empresaId, { placa: this.cPlaca, vendedorId: this.fijo()?.id ?? this.cDueno }));
    this.errorCamion.set(r.ok ? null : r.error);
    if (r.ok) {
      this.router.navigateByUrl(this.volver(), this.store.conAviso());
    }
  }
}
