import { Component, computed, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { empresaById, perfilesDetalle, usuariosDeEmpresa } from '../../core/simulation/selectors';
import { DemoStore } from '../../core/state/demo.store';
import { BadgeComponent } from '../../shared/badges.component';
import { MigasComponent } from '../../shared/migas.component';
import { ParamAjenoComponent } from '../../shared/param-ajeno.component';

/**
 * V05 · Usuarios de la empresa (F01 ampliado por D-T2, R-14): todos los usuarios con algún
 * perfil de la empresa, en el orden empresa, vendedor, conductor. El administrador los activa y
 * desactiva en el acto (SUP-22: no el último usuario empresa activo) y crea usuarios empresa
 * (V06). Vendedores y conductores se crean desde la Flota de la empresa (SUP-12).
 */
@Component({
  selector: 'app-usuarios-empresa',
  imports: [RouterLink, BadgeComponent, MigasComponent, ParamAjenoComponent],
  template: `
    @if (empresa(); as e) {
      <app-migas
        [items]="[{ label: 'Plataforma' }, { label: 'Empresas', link: '/admin/empresas' }, { label: e.nombre, link: '/admin/empresas/' + e.id }, { label: 'Usuarios' }]"
      />
      <div class="mb-3 flex flex-wrap items-center gap-2">
        <h1 class="page-title flex-1">Usuarios de {{ e.nombre }}</h1>
        @if (store.can('usuario.crear')) {
          <a class="btn btn-primary" [routerLink]="'/admin/empresas/' + e.id + '/usuarios/nuevo'" data-testid="nuevo-usuario">Nuevo usuario</a>
        }
      </div>
      <p class="mb-3 text-sm text-muted" data-testid="nota-flota">Los vendedores y conductores se crean desde la Flota de la empresa</p>
      @if (error(); as msg) {
        <p class="error-text mb-3" data-testid="error-usuarios" role="alert">{{ msg }}</p>
      }
      <section class="card overflow-x-auto">
        <table class="table" data-testid="tabla-usuarios">
          <thead>
            <tr><th>Nombre</th><th>Usuario</th><th>Perfiles</th><th>Estado</th><th>Acción</th></tr>
          </thead>
          <tbody>
            @for (u of filas(); track u.id) {
              <tr [attr.data-testid]="'usuario-' + u.usuario">
                <td class="font-semibold" data-testid="usuario-nombre">{{ u.nombre }}</td>
                <td class="font-mono text-xs">{{ u.usuario }}</td>
                <td>{{ u.perfiles.join(' · ') }}</td>
                <td>
                  <app-badge [tone]="u.activo ? 'ok' : 'neutral'" [attr.data-testid]="'estado-usuario-' + u.usuario">{{ u.activo ? 'Activo' : 'Inactivo' }}</app-badge>
                </td>
                <td>
                  @if (store.can('usuario.cambiarEstado')) {
                    <button type="button" class="btn" [attr.data-testid]="'cambiar-estado-' + u.usuario" (click)="cambiar(u.id, !u.activo)">
                      {{ u.activo ? 'Desactivar' : 'Activar' }}
                    </button>
                  }
                </td>
              </tr>
            }
          </tbody>
        </table>
        <p class="mt-2 text-xs text-muted" data-testid="total-usuarios">{{ filas().length }} usuarios · {{ activos() }} activos</p>
      </section>
    } @else {
      <app-migas [items]="[{ label: 'Plataforma' }, { label: 'Empresas', link: '/admin/empresas' }, { label: empresaId() ?? '' }, { label: 'Usuarios' }]" />
      <app-param-ajeno texto="Esa empresa no existe" enlace="Empresas" link="/admin/empresas" />
    }
  `,
})
export class UsuariosEmpresaComponent {
  readonly store = inject(DemoStore);
  /** `:empresaId` */
  readonly empresaId = input<string>();
  readonly error = signal<string | null>(null);

  readonly empresa = computed(() => empresaById(this.store.state(), this.empresaId()) ?? null);

  readonly filas = computed(() => {
    const s = this.store.state();
    const e = this.empresa();
    return e ? usuariosDeEmpresa(s, e.id).map((u) => ({ ...u, perfiles: perfilesDetalle(s, u) })) : [];
  });
  readonly activos = computed(() => this.filas().filter((u) => u.activo).length);

  cambiar(usuarioId: string, activo: boolean): void {
    const r = this.store.exec((sim) => sim.cambiarEstadoUsuario(usuarioId, activo));
    this.error.set(r.ok ? null : r.error);
  }
}
