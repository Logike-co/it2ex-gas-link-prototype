import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { configuracionCompleta, usuarioById } from '../../core/simulation/selectors';
import { DemoStore } from '../../core/state/demo.store';
import { BadgeComponent } from '../../shared/badges.component';
import { FechaPipe } from '../../shared/pipes';

/**
 * V02 · Empresas (F01, RN-01): el administrador de la plataforma ve la lista de empresas y da de
 * alta una con su usuario. No ve cifras, flota ni cuentas de ninguna empresa.
 */
@Component({
  selector: 'app-empresas',
  imports: [FormsModule, BadgeComponent, FechaPipe],
  template: `
    <h1 class="page-title mb-1">Empresas</h1>
    <p class="mb-4 text-sm text-muted">Empresas distribuidoras que usan GasLink. Cada una ve solo sus datos.</p>

    <div class="grid gap-4 lg:grid-cols-[1fr_22rem]">
      <section class="card overflow-x-auto">
        <table class="table" data-testid="tabla-empresas">
          <thead>
            <tr>
              <th>Id</th>
              <th>Empresa</th>
              <th>Ciudad</th>
              <th>Usuario empresa</th>
              <th>Alta</th>
              <th>Configuración</th>
            </tr>
          </thead>
          <tbody>
            @for (e of filas(); track e.id) {
              <tr [attr.data-testid]="'empresa-' + e.id">
                <td class="font-mono whitespace-nowrap">{{ e.id }}</td>
                <td class="font-semibold">{{ e.nombre }}</td>
                <td>{{ e.ciudad || '—' }}</td>
                <td>
                  {{ e.usuarioNombre }} <span class="font-mono text-xs text-muted">{{ e.usuario }}</span>
                </td>
                <td class="whitespace-nowrap">{{ e.creadaEn | fecha }}</td>
                <td>
                  <app-badge [tone]="e.completa ? 'ok' : 'warn'" [attr.data-testid]="'config-' + e.id">{{
                    e.completa ? 'Configuración completa' : 'Configuración pendiente'
                  }}</app-badge>
                </td>
              </tr>
            }
          </tbody>
        </table>
        <p class="mt-2 text-xs text-muted" data-testid="total-empresas">{{ filas().length }} empresas</p>
      </section>

      @if (store.can('empresa.crear')) {
        <form class="card" (ngSubmit)="crear()" data-testid="form-empresa">
          <h2 class="card-title">Nueva empresa</h2>
          <label class="label" for="emp-nombre">Nombre de la empresa *</label>
          <input id="emp-nombre" class="input mb-2" name="nombre" data-testid="empresa-nombre" [(ngModel)]="nombre" />
          <label class="label" for="emp-ciudad">Ciudad</label>
          <input id="emp-ciudad" class="input mb-2" name="ciudad" data-testid="empresa-ciudad" [(ngModel)]="ciudad" />
          <label class="label" for="emp-persona">Nombre de quien usará la empresa *</label>
          <input id="emp-persona" class="input mb-2" name="persona" data-testid="empresa-persona" [(ngModel)]="nombreUsuario" />
          <label class="label" for="emp-usuario">Usuario *</label>
          <input id="emp-usuario" class="input mb-2" name="usuario" data-testid="empresa-usuario" autocapitalize="off" [(ngModel)]="usuario" />
          <p class="text-xs text-muted">La empresa arranca sin precios en el catálogo y sin llave de cobro; los pone ella.</p>
          @if (error(); as e) {
            <p class="error-text" data-testid="error-empresa" role="alert">{{ e }}</p>
          }
          <button type="submit" class="btn btn-primary mt-3 w-full" data-testid="crear-empresa">Crear empresa</button>
        </form>
      }
    </div>
  `,
})
export class EmpresasComponent {
  readonly store = inject(DemoStore);
  nombre = '';
  ciudad = '';
  nombreUsuario = '';
  usuario = '';
  readonly error = signal<string | null>(null);

  readonly filas = computed(() => {
    const s = this.store.state();
    return s.empresas.map((e) => {
      const u = usuarioById(s, e.usuarioId);
      return { ...e, usuarioNombre: u?.nombre ?? '—', usuario: u?.usuario ?? '', completa: configuracionCompleta(s, e.id) };
    });
  });

  crear(): void {
    const r = this.store.exec((sim) =>
      sim.crearEmpresa({ nombre: this.nombre, ciudad: this.ciudad, nombreUsuario: this.nombreUsuario, usuario: this.usuario })
    );
    if (r.ok) {
      this.error.set(null);
      this.nombre = this.ciudad = this.nombreUsuario = this.usuario = '';
    } else {
      this.error.set(r.error);
    }
  }
}
