import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TipoLlave } from '../../core/simulation/model';
import { DemoStore } from '../../core/state/demo.store';
import { MigasComponent } from '../../shared/migas.component';
import { TIPOS_LLAVE } from './flota-shared';

/**
 * V10 · Nuevo vendedor (F04): crea el vendedor y su usuario activo (SUP-12) y abre su detalle
 * (V11), donde se le agregan camiones y conductores (SUP-28).
 */
@Component({
  selector: 'app-nuevo-vendedor',
  imports: [FormsModule, RouterLink, MigasComponent],
  template: `
    <app-migas [items]="[{ label: 'Flota' }, { label: 'Vendedores', link: '/empresa/flota/vendedores' }, { label: 'Nuevo vendedor' }]" />
    <h1 class="page-title mb-3">Nuevo vendedor</h1>
    <form class="card max-w-lg" (ngSubmit)="crearVendedor()" data-testid="form-vendedor">
      <label class="label" for="ven-nombre">Nombre (persona o negocio) *</label>
      <input id="ven-nombre" class="input mb-2" name="nombre" data-testid="vendedor-nombre" [(ngModel)]="vNombre" />
      <label class="label" for="ven-contacto">Contacto (quien usa el perfil)</label>
      <input id="ven-contacto" class="input mb-2" name="contacto" data-testid="vendedor-contacto" [(ngModel)]="vContacto" />
      <label class="label" for="ven-tipo">Tipo de llave</label>
      <select id="ven-tipo" class="input mb-2" name="tipo" [(ngModel)]="vTipo">
        @for (t of tipos; track t.id) {
          <option [value]="t.id">{{ t.label }}</option>
        }
      </select>
      <label class="label" for="ven-llave">Llave del vendedor</label>
      <input id="ven-llave" class="input" name="llave" autocapitalize="off" data-testid="vendedor-llave" [(ngModel)]="vLlave" />
      @if (errorVendedor(); as e) {
        <p class="error-text" data-testid="error-vendedor" role="alert">{{ e }}</p>
      }
      <div class="mt-3 flex flex-wrap gap-2">
        <button type="submit" class="btn btn-primary flex-1" data-testid="crear-vendedor">Registrar vendedor</button>
        <a class="btn" routerLink="/empresa/flota/vendedores" data-testid="cancelar">Cancelar</a>
      </div>
    </form>
  `,
})
export class NuevoVendedorComponent {
  readonly store = inject(DemoStore);
  private readonly router = inject(Router);
  readonly tipos = TIPOS_LLAVE;
  vNombre = '';
  vContacto = '';
  vTipo: TipoLlave = 'alfanumerica';
  vLlave = '';
  readonly errorVendedor = signal<string | null>(null);

  crearVendedor(): void {
    const empresaId = this.store.empresaId() ?? '';
    const r = this.store.exec((sim) =>
      sim.crearVendedor(empresaId, { nombre: this.vNombre, contacto: this.vContacto, llaveTipo: this.vTipo, llave: this.vLlave })
    );
    this.errorVendedor.set(r.ok ? null : r.error);
    if (r.ok) {
      this.router.navigateByUrl(`/empresa/flota/vendedores/${r.value.id}`, this.store.conAviso());
    }
  }
}
