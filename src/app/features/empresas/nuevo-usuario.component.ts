import { Component, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { empresaById } from '../../core/simulation/selectors';
import { DemoStore } from '../../core/state/demo.store';
import { MigasComponent } from '../../shared/migas.component';
import { ParamAjenoComponent } from '../../shared/param-ajeno.component';

/**
 * V06 · Nuevo usuario de la empresa (F01 ampliado, R-14): el administrador crea un usuario con
 * perfil empresa, activo, para la empresa de la ruta. Al guardar vuelve a los usuarios (V05).
 */
@Component({
  selector: 'app-nuevo-usuario',
  imports: [FormsModule, RouterLink, MigasComponent, ParamAjenoComponent],
  template: `
    @if (empresa(); as e) {
      <app-migas
        [items]="[
          { label: 'Plataforma' },
          { label: 'Empresas', link: '/admin/empresas' },
          { label: e.nombre, link: '/admin/empresas/' + e.id },
          { label: 'Usuarios', link: volver() },
          { label: 'Nuevo usuario' },
        ]"
      />
      <h1 class="page-title mb-3">Nuevo usuario de {{ e.nombre }}</h1>
      <form class="card max-w-lg" (ngSubmit)="crear()" data-testid="form-usuario">
        <label class="label" for="usr-nombre">Nombre de la persona *</label>
        <input id="usr-nombre" class="input mb-2" name="nombre" data-testid="usuario-nombre-input" [(ngModel)]="nombre" />
        <label class="label" for="usr-usuario">Usuario *</label>
        <input id="usr-usuario" class="input mb-2" name="usuario" autocapitalize="off" data-testid="usuario-usuario-input" [(ngModel)]="usuario" />
        <p class="text-sm">Perfil: <strong data-testid="usuario-perfil">empresa</strong></p>
        <p class="text-xs text-muted">Los vendedores y conductores se crean desde la Flota de la empresa.</p>
        @if (error(); as msg) {
          <p class="error-text" data-testid="error-usuario" role="alert">{{ msg }}</p>
        }
        <div class="mt-3 flex flex-wrap gap-2">
          <button type="submit" class="btn btn-primary flex-1" data-testid="crear-usuario">Crear usuario</button>
          <a class="btn" [routerLink]="volver()" data-testid="cancelar">Cancelar</a>
        </div>
      </form>
    } @else {
      <app-param-ajeno texto="Esa empresa no existe" enlace="Empresas" link="/admin/empresas" />
    }
  `,
})
export class NuevoUsuarioComponent {
  readonly store = inject(DemoStore);
  private readonly router = inject(Router);
  /** `:empresaId` */
  readonly empresaId = input<string>();
  nombre = '';
  usuario = '';
  readonly error = signal<string | null>(null);

  readonly empresa = computed(() => empresaById(this.store.state(), this.empresaId()) ?? null);
  readonly volver = computed(() => `/admin/empresas/${this.empresa()?.id}/usuarios`);

  crear(): void {
    const e = this.empresa();
    if (!e) return;
    const r = this.store.exec((sim) => sim.crearUsuarioEmpresa(e.id, { nombre: this.nombre, usuario: this.usuario }));
    if (r.ok) {
      this.error.set(null);
      this.router.navigateByUrl(this.volver());
    } else {
      this.error.set(r.error);
    }
  }
}
