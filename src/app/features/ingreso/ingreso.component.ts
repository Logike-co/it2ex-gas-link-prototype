import { Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { HOME } from '../../core/access/access';
import { Perfil, Usuario } from '../../core/simulation/model';
import { vendedorById } from '../../core/simulation/selectors';
import { DemoStore } from '../../core/state/demo.store';
import { DemoModeStore } from '../../demo/demo-mode.store';

interface Tarjeta {
  usuario: Usuario;
  /** Negocio del vendedor si es distinto del nombre de la persona («Transportes Lucero»). */
  negocio: string | null;
  perfiles: Perfil[];
}

/**
 * V01 · Ingreso por perfil (D01, D02, D03): tarjetas de usuario agrupadas por «Plataforma» y
 * por empresa (también las creadas en vivo). Se entra con un clic, sin contraseña; un usuario
 * con dos perfiles elige con cuál entra (SUP-11).
 */
@Component({
  selector: 'app-ingreso',
  template: `
    <section class="mx-auto max-w-5xl">
      <div class="mb-5 flex flex-col items-center gap-2 text-center">
        <img src="gaslink-logo.png" alt="GasLink · Gestión comercial del gas" class="h-auto w-full max-w-md" width="448" height="149" />
        <h1 class="page-title">Ingreso por perfil</h1>
        <p class="max-w-xl text-sm text-muted">
          Elige un usuario de ejemplo para entrar con un clic. Cada perfil ve solo su menú. Todos los nombres, llaves, placas y montos son
          ficticios.
        </p>
        <div class="mt-1 flex flex-wrap justify-center gap-2">
          <button type="button" class="btn" data-testid="ingreso-guia" (click)="demo.hudOpen() || demo.toggleHud()">Abrir la guía del presentador</button>
          <button type="button" class="btn btn-accent" data-testid="ingreso-reiniciar" (click)="demo.quickReset()">Reiniciar demo</button>
        </div>
      </div>

      @for (g of grupos(); track g.nombre) {
        <h2 class="mt-5 mb-2 text-sm font-extrabold tracking-wide text-navy uppercase" [attr.data-testid]="'grupo-' + g.nombre">{{ g.nombre }}</h2>
        <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          @for (t of g.tarjetas; track t.usuario.id) {
            <article class="card flex flex-col gap-2" [attr.data-testid]="'tarjeta-' + t.usuario.usuario">
              <div>
                <p class="font-bold text-navy" data-testid="tarjeta-nombre">{{ t.usuario.nombre }}</p>
                <p class="text-xs text-muted">
                  {{ t.perfiles.join(' + ') }}
                  @if (t.negocio) {
                    · {{ t.negocio }}
                  }
                  · <span class="font-mono">{{ t.usuario.usuario }}</span>
                </p>
                <p class="text-xs text-muted">{{ g.nombre }}</p>
              </div>
              @if (t.perfiles.length === 1) {
                <button
                  type="button"
                  class="btn btn-primary mt-auto"
                  [attr.data-testid]="'entrar-' + t.usuario.usuario"
                  (click)="entrar(t.usuario.id, t.perfiles[0])"
                >
                  Entrar
                </button>
              } @else {
                <div class="mt-auto flex flex-wrap gap-2">
                  @for (p of t.perfiles; track p) {
                    <button
                      type="button"
                      class="btn btn-primary flex-1"
                      [attr.data-testid]="'entrar-' + t.usuario.usuario + '-' + p"
                      (click)="entrar(t.usuario.id, p)"
                    >
                      Entrar como {{ p }}
                    </button>
                  }
                </div>
              }
            </article>
          }
        </div>
      }
    </section>
  `,
})
export class IngresoComponent {
  readonly store = inject(DemoStore);
  readonly demo = inject(DemoModeStore);
  private readonly router = inject(Router);

  readonly grupos = computed(() => {
    const s = this.store.state();
    const tarjeta = (u: Usuario): Tarjeta => {
      const vendedorId = u.perfiles.find((p) => p.perfil === 'vendedor')?.vendedorId;
      const negocio = vendedorById(s, vendedorId)?.nombre ?? null;
      return { usuario: u, negocio: negocio && negocio !== u.nombre ? negocio : null, perfiles: u.perfiles.map((p) => p.perfil) };
    };
    return [
      { nombre: 'Plataforma', tarjetas: s.usuarios.filter((u) => u.perfiles.some((p) => p.perfil === 'administrador')).map(tarjeta) },
      ...s.empresas.map((e) => ({
        nombre: e.nombre,
        tarjetas: s.usuarios.filter((u) => u.perfiles.some((p) => p.empresaId === e.id)).map(tarjeta),
      })),
    ].filter((g) => g.tarjetas.length > 0);
  });

  entrar(usuarioId: string, perfil: Perfil): void {
    const r = this.store.iniciarSesion(usuarioId, perfil);
    if (r.ok) {
      this.store.flash.set(null);
      this.router.navigateByUrl(HOME[perfil]);
    }
  }
}
