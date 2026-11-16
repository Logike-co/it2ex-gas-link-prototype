import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { DemoStore } from '../../core/state/demo.store';
import { MigasComponent } from '../../shared/migas.component';

/**
 * V03 · Nueva empresa (F01): alta de una empresa con su usuario empresa activo. La empresa nace
 * sin precios en el catálogo y sin llave (SUP-19). Al crearla se abre su detalle (V04).
 */
@Component({
  selector: 'app-nueva-empresa',
  imports: [FormsModule, RouterLink, MigasComponent],
  template: `
    <app-migas [items]="[{ label: 'Plataforma' }, { label: 'Empresas', link: '/admin/empresas' }, { label: 'Nueva empresa' }]" />
    <h1 class="page-title mb-3">Nueva empresa</h1>
    <form class="card max-w-lg" (ngSubmit)="crear()" data-testid="form-empresa">
      <label class="label" for="emp-nombre">Nombre de la empresa *</label>
      <input id="emp-nombre" class="input mb-2" name="nombre" data-testid="empresa-nombre" [(ngModel)]="nombre" />
      <label class="label" for="emp-ciudad">Ciudad</label>
      <input id="emp-ciudad" class="input mb-2" name="ciudad" data-testid="empresa-ciudad" [(ngModel)]="ciudad" />
      <label class="label" for="emp-persona">Nombre de la persona *</label>
      <input id="emp-persona" class="input mb-2" name="persona" data-testid="empresa-persona" [(ngModel)]="nombreUsuario" />
      <label class="label" for="emp-usuario">Usuario *</label>
      <input id="emp-usuario" class="input mb-2" name="usuario" data-testid="empresa-usuario" autocapitalize="off" [(ngModel)]="usuario" />
      <p class="text-xs text-muted">La empresa arranca sin precios en el catálogo y sin llave de cobro; los pone ella.</p>
      @if (error(); as e) {
        <p class="error-text" data-testid="error-empresa" role="alert">{{ e }}</p>
      }
      <div class="mt-3 flex flex-wrap gap-2">
        <button type="submit" class="btn btn-primary flex-1" data-testid="crear-empresa">Crear empresa</button>
        <a class="btn" routerLink="/admin/empresas" data-testid="cancelar">Cancelar</a>
      </div>
    </form>
  `,
})
export class NuevaEmpresaComponent {
  readonly store = inject(DemoStore);
  private readonly router = inject(Router);
  nombre = '';
  ciudad = '';
  nombreUsuario = '';
  usuario = '';
  readonly error = signal<string | null>(null);

  crear(): void {
    const r = this.store.exec((sim) =>
      sim.crearEmpresa({ nombre: this.nombre, ciudad: this.ciudad, nombreUsuario: this.nombreUsuario, usuario: this.usuario })
    );
    if (r.ok) {
      this.error.set(null);
      this.router.navigateByUrl(`/admin/empresas/${r.value.id}`, this.store.conAviso());
    } else {
      this.error.set(r.error);
    }
  }
}
