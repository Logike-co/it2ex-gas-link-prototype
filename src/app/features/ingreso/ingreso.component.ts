import { Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Usuario } from '../../core/simulation/model';
import { perfilesTexto, vendedorById } from '../../core/simulation/selectors';
import { DemoStore } from '../../core/state/demo.store';

interface Tarjeta {
  usuario: Usuario;
  /** Negocio del vendedor si es distinto del nombre de la persona («Transportes Lucero»). */
  negocio: string | null;
  perfiles: string;
}

/**
 * V01 · Ingreso (D01, D02, D03): una tarjeta por usuario, agrupadas por «Plataforma» y por
 * empresa (también las creadas en vivo). Se entra con un clic, sin contraseña ni elección de
 * perfil: la sesión es del usuario, con la unión de sus perfiles (R-15). Un usuario inactivo se
 * ve atenuado con «Inactivo» y no entra (SUP-23).
 */
@Component({
  selector: 'app-ingreso',
  template: `
    <section class="mx-auto max-w-5xl">
      <div class="mb-5 flex flex-col items-center gap-2 text-center">
        <img src="gaslink-logo.png" alt="GasLink · Gestión comercial del gas" class="h-auto w-full max-w-md" width="448" height="149" />
        <p class="text-sm font-semibold text-muted">Gestión comercial del gas</p>
        <h1 class="page-title">Elige con qué usuario entrar</h1>
        <p class="max-w-xl text-sm text-muted">
          Se entra con un clic, sin contraseña. Cada usuario ve solo las opciones de sus perfiles. Todos los nombres, llaves, placas y montos son
          ficticios. Los escenarios y el reinicio de la demo están en la «Guía».
        </p>
      </div>

      @for (g of grupos(); track g.nombre) {
        <h2 class="mt-5 mb-2 text-sm font-extrabold tracking-wide text-navy uppercase" [attr.data-testid]="'grupo-' + g.nombre">{{ g.nombre }}</h2>
        <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          @for (t of g.tarjetas; track t.usuario.id) {
            <button
              type="button"
              class="card flex min-h-11 flex-col gap-1 text-left transition"
              [class]="t.usuario.activo ? 'cursor-pointer hover:border-primary hover:shadow-md' : 'cursor-not-allowed opacity-60'"
              [attr.aria-disabled]="!t.usuario.activo"
              [attr.data-testid]="'tarjeta-' + t.usuario.usuario"
              (click)="entrar(t.usuario.id)"
            >
              <span class="flex items-center gap-2">
                <span class="flex-1 font-bold text-navy" data-testid="tarjeta-nombre">{{ t.usuario.nombre }}</span>
                @if (!t.usuario.activo) {
                  <span class="rounded-full border border-line bg-surface-alt px-2 py-0.5 text-xs font-bold text-muted" data-testid="tarjeta-inactivo">Inactivo</span>
                }
              </span>
              <span class="text-xs text-muted" data-testid="tarjeta-perfiles">
                {{ t.perfiles }}
                @if (t.negocio) {
                  · {{ t.negocio }}
                }
              </span>
              <span class="text-xs text-muted">{{ g.nombre }} · <span class="font-mono">{{ t.usuario.usuario }}</span></span>
            </button>
          }
        </div>
      }
    </section>
  `,
})
export class IngresoComponent {
  readonly store = inject(DemoStore);
  private readonly router = inject(Router);

  readonly grupos = computed(() => {
    const s = this.store.state();
    const tarjeta = (u: Usuario): Tarjeta => {
      const vendedorId = u.perfiles.find((p) => p.perfil === 'vendedor')?.vendedorId;
      const negocio = vendedorById(s, vendedorId)?.nombre ?? null;
      return { usuario: u, negocio: negocio && negocio !== u.nombre ? negocio : null, perfiles: perfilesTexto(u) };
    };
    return [
      { nombre: 'Plataforma', tarjetas: s.usuarios.filter((u) => u.perfiles.some((p) => p.perfil === 'administrador')).map(tarjeta) },
      ...s.empresas.map((e) => ({
        nombre: e.nombre,
        tarjetas: s.usuarios.filter((u) => u.perfiles.some((p) => p.empresaId === e.id)).map(tarjeta),
      })),
    ].filter((g) => g.tarjetas.length > 0);
  });

  /** R-15: un clic abre la sesión del usuario y su pantalla de inicio; un inactivo ve el aviso (E58). */
  entrar(usuarioId: string): void {
    const r = this.store.iniciarSesion(usuarioId);
    if (r.ok) {
      this.store.flash.set(null);
      this.router.navigateByUrl(this.store.inicio());
    } else {
      this.store.flash.set({ kind: 'error', text: r.error });
    }
  }
}
