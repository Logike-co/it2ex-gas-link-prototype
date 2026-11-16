import { Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { vendedorById, vendedoresDe } from '../../core/simulation/selectors';
import { DemoStore } from '../../core/state/demo.store';
import { Miga, MigasComponent } from '../../shared/migas.component';
import { ParamAjenoComponent } from '../../shared/param-ajeno.component';

/**
 * V15 · Nuevo conductor (F04, RN-12). Crea el conductor y su usuario activo, o suma el perfil
 * conductor al usuario del vendedor si es el mismo (SUP-12). Con `?vendedor=` el vendedor queda
 * fijo y al guardar vuelve a su detalle; desde «Conductores» se elige y vuelve a la lista
 * (SUP-28). Sin vendedores, o con un vendedor sin camiones, dice qué falta (R-16).
 */
@Component({
  selector: 'app-nuevo-conductor',
  imports: [FormsModule, RouterLink, MigasComponent, ParamAjenoComponent],
  template: `
    <app-migas [items]="migas()" />
    <h1 class="page-title mb-3">Nuevo conductor</h1>
    @if (ajeno()) {
      <app-param-ajeno [texto]="'Ese vendedor no existe en ' + (store.empresa()?.nombre ?? '')" enlace="Conductores" link="/empresa/flota/conductores" />
    } @else if (!vendedores().length) {
      <div class="warning-text max-w-lg" data-testid="prerrequisito-vendedor">
        <p>Primero registra un vendedor</p>
        <a class="btn mt-2" routerLink="/empresa/flota/vendedores/nuevo">Nuevo vendedor</a>
      </div>
    } @else {
      <form class="card max-w-lg" (ngSubmit)="crearConductor()" data-testid="form-conductor">
        <label class="label" for="cdt-vendedor">Vendedor para el que trabaja *</label>
        @if (fijo(); as v) {
          <p class="input flex items-center bg-surface-alt font-semibold" id="cdt-vendedor" data-testid="conductor-vendedor-fijo">{{ v.nombre }}</p>
        } @else {
          <select id="cdt-vendedor" class="input mb-2" name="vendedor" data-testid="conductor-vendedor" [ngModel]="kVendedor()" (ngModelChange)="elegirVendedor($event)">
            <option value="">Elige el vendedor…</option>
            @for (v of vendedores(); track v.id) {
              <option [value]="v.id">{{ v.nombre }}</option>
            }
          </select>
        }
        @if (kVendedor() && !camionesDelVendedor().length) {
          <div class="warning-text" data-testid="prerrequisito-camion">
            <p>{{ nombreVendedor() }} no tiene camiones</p>
            <a class="btn mt-2" routerLink="/empresa/flota/camiones/nuevo" [queryParams]="{ vendedor: kVendedor() }">Agregar camión</a>
          </div>
        } @else {
          <label class="my-2 flex min-h-11 items-center gap-2 text-sm">
            <input type="checkbox" class="h-5 w-5" name="esElVendedor" data-testid="conductor-es-vendedor" [(ngModel)]="kEsElVendedor" />
            Es el mismo vendedor
          </label>
          @if (!kEsElVendedor) {
            <label class="label" for="cdt-nombre">Nombre del conductor *</label>
            <input id="cdt-nombre" class="input mb-2" name="nombre" data-testid="conductor-nombre" [(ngModel)]="kNombre" />
          }
          <label class="label" for="cdt-camion">Camión (del vendedor) *</label>
          <select id="cdt-camion" class="input" name="camion" data-testid="conductor-camion" [(ngModel)]="kCamion">
            <option value="">Elige el camión…</option>
            @for (c of camionesDelVendedor(); track c.id) {
              <option [value]="c.id">{{ c.placa }}</option>
            }
          </select>
        }
        @if (errorConductor(); as e) {
          <p class="error-text" data-testid="error-conductor" role="alert">{{ e }}</p>
        }
        <div class="mt-3 flex flex-wrap gap-2">
          <button type="submit" class="btn btn-primary flex-1" data-testid="crear-conductor" [disabled]="!!kVendedor() && !camionesDelVendedor().length">
            Registrar conductor
          </button>
          <a class="btn" [routerLink]="volver()" data-testid="cancelar">Cancelar</a>
        </div>
      </form>
    }
  `,
})
export class NuevoConductorComponent {
  readonly store = inject(DemoStore);
  private readonly router = inject(Router);
  /** `?vendedor=VEN-…`: vendedor fijo (SUP-28). */
  readonly vendedor = input<string>();
  readonly kVendedor = signal('');
  kEsElVendedor = false;
  kNombre = '';
  kCamion = '';
  readonly errorConductor = signal<string | null>(null);

  readonly vendedores = computed(() => vendedoresDe(this.store.state(), this.store.empresaId() ?? ''));
  readonly fijo = computed(() => {
    const v = vendedorById(this.store.state(), this.vendedor());
    return v && v.empresaId === this.store.empresaId() ? v : null;
  });
  readonly ajeno = computed(() => !!this.vendedor() && !this.fijo());
  readonly camionesDelVendedor = computed(() => this.store.state().vehiculos.filter((v) => v.vendedorId === this.kVendedor()));
  readonly nombreVendedor = computed(() => vendedorById(this.store.state(), this.kVendedor())?.nombre ?? '');
  readonly volver = computed(() => (this.fijo() ? `/empresa/flota/vendedores/${this.fijo()?.id}` : '/empresa/flota/conductores'));
  readonly migas = computed<Miga[]>(() => {
    const v = this.fijo();
    return v
      ? [{ label: 'Flota' }, { label: 'Vendedores', link: '/empresa/flota/vendedores' }, { label: v.nombre, link: this.volver() }, { label: 'Nuevo conductor' }]
      : [{ label: 'Flota' }, { label: 'Conductores', link: '/empresa/flota/conductores' }, { label: 'Nuevo conductor' }];
  });

  constructor() {
    effect(() => {
      const v = this.fijo();
      untracked(() => this.elegirVendedor(v?.id ?? ''));
    });
  }

  elegirVendedor(id: string): void {
    this.kVendedor.set(id);
    this.kCamion = this.camionesDelVendedor()[0]?.id ?? '';
  }

  crearConductor(): void {
    const empresaId = this.store.empresaId() ?? '';
    const r = this.store.exec((sim) =>
      sim.crearConductor(empresaId, { vendedorId: this.kVendedor(), esElVendedor: this.kEsElVendedor, nombre: this.kNombre, vehiculoId: this.kCamion })
    );
    this.errorConductor.set(r.ok ? null : r.error);
    if (r.ok) {
      this.router.navigateByUrl(this.volver());
    }
  }
}
