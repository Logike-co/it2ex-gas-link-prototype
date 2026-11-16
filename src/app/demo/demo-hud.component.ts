import { Component, computed, HostListener, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DISCLAIMER } from '../brand';
import { pathOf } from '../views';
import { perfilesTexto } from '../core/simulation/selectors';
import { DemoStore } from '../core/state/demo.store';
import { CodeTextComponent } from '../shared/code-text.component';
import { DemoModeStore } from './demo-mode.store';
import { PresetId } from './demo-script';
import { ITEMS } from './traceability';

interface OpcionUsuario {
  id: string;
  label: string;
  activo: boolean;
}

/**
 * Guía del presentador = centro de control del demo (§8, D02). Es el único lugar de los
 * controles del demo, en cuatro secciones:
 * 1. Usuario activo, con «Cambiar de usuario» agrupado por «Plataforma» y por empresa (§8.1).
 * 2. «Qué puede hacer este usuario»: las opciones de su menú ☰, con enlace, descripción e ítems (§8.2).
 * 3. Escenarios ESC-01..03 con el paso actual, «Ingresar como…» o «Ir a la pantalla» (§8.3).
 * 4. Controles: «Reiniciar demo», trazabilidad y atajos (§8.4).
 * En escritorio es una columna a la derecha; en el celular, una hoja inferior que se cierra con
 * Esc o «Cerrar» (§8.5, E67).
 */
@Component({
  selector: 'app-demo-hud',
  imports: [RouterLink, CodeTextComponent],
  host: { class: 'contents' },
  template: `@if (demo.hudOpen()) {
    <aside
      class="no-print fixed inset-x-0 bottom-0 z-[60] flex max-h-[75vh] flex-col overflow-hidden border-t-4 border-accent bg-surface text-sm shadow-2xl md:sticky md:top-8 md:z-auto md:max-h-[calc(100vh-2.5rem)] md:w-[22rem] md:shrink-0 md:self-start md:border-t-0 md:border-l md:border-line md:shadow-none"
      data-testid="guia-demo"
      aria-label="Guía del presentador"
    >
      <header class="flex items-center gap-2 bg-navy px-3 py-1 text-white">
        <strong class="flex-1">Guía del presentador</strong>
        <span class="hidden text-xs opacity-80 md:inline">Ctrl+Shift+D</span>
        <button type="button" class="min-h-11 rounded px-3 font-semibold hover:bg-white/10" aria-label="Cerrar guía" data-testid="guia-cerrar" (click)="demo.toggleHud()">
          Cerrar
        </button>
      </header>
      <p class="bg-navy px-3 pb-1 text-[11px] font-bold tracking-widest text-white" data-testid="guia-leyenda">
        {{ disclaimer }}
      </p>

      <div class="flex-1 overflow-y-auto overflow-x-hidden">
        <!-- 1. Usuario activo -->
        <section class="border-b border-line px-3 py-2" data-testid="guia-seccion-usuario">
          <h2 class="mb-1 text-xs font-extrabold tracking-wide text-navy uppercase">Usuario activo</h2>
          <div class="mb-2 rounded-md border border-line bg-surface-alt px-2 py-1" data-testid="guia-usuario-activo">
            @if (store.usuario(); as u) {
              <p class="font-bold text-navy" data-testid="guia-usuario-nombre">{{ u.nombre }}</p>
              <p class="text-xs text-muted">
                <span class="font-mono">{{ u.usuario }}</span>
                @if (store.empresa(); as e) {
                  · {{ e.nombre }}
                }
                · <span data-testid="guia-usuario-perfiles">{{ perfiles() }}</span>
              </p>
            } @else {
              <p class="text-muted" data-testid="guia-usuario-nombre">Sin sesión</p>
            }
          </div>
          <label class="label" for="guia-cambiar-usuario">Cambiar de usuario</label>
          <select id="guia-cambiar-usuario" class="input" data-testid="guia-cambiar-usuario" (change)="cambiar($event)">
            <option value="" selected>Elige un usuario…</option>
            @for (g of opciones(); track g.grupo) {
              <optgroup [label]="g.grupo" [attr.data-testid]="'guia-grupo-' + g.grupo">
                @for (o of g.opciones; track o.id) {
                  <option [value]="o.id" [disabled]="!o.activo">{{ o.label }}</option>
                }
              </optgroup>
            }
          </select>
        </section>

        <!-- 2. Qué puede hacer este usuario -->
        <section class="border-b border-line px-3 py-2" data-testid="guia-que-puede">
          <h2 class="mb-1 text-xs font-extrabold tracking-wide text-navy uppercase">Qué puede hacer este usuario</h2>
          @for (sec of store.menu(); track sec.seccion) {
            <h3 class="mt-1 text-xs font-bold text-muted" data-testid="guia-que-puede-seccion">{{ sec.seccion }}</h3>
            <ul class="list-none p-0">
              @for (o of sec.opciones; track o.view) {
                <li class="mb-1" [attr.data-testid]="'guia-opcion-' + o.view">
                  <a class="inline-flex min-h-11 items-center font-semibold text-primary underline md:min-h-0" [routerLink]="'/' + path(o.view)" data-testid="guia-opcion-enlace">{{ o.label }}</a>
                  <p class="text-xs text-ink">{{ o.descripcion }}</p>
                  <p class="flex flex-wrap gap-1">
                    @for (i of o.items; track i) {
                      <span class="rounded border border-primary/30 bg-primary-soft px-1 font-mono text-[10px] text-primary" [title]="itemName(i)">{{ i }}</span>
                    }
                  </p>
                </li>
              }
            </ul>
          } @empty {
            <p class="text-xs text-muted" data-testid="guia-que-puede-vacio">Elige un usuario para ver lo que puede hacer</p>
          }
        </section>

        <!-- 3. Escenarios -->
        <section class="border-b border-line px-3 py-2" data-testid="guia-seccion-escenarios">
          <h2 class="mb-1 text-xs font-extrabold tracking-wide text-navy uppercase">Escenarios</h2>
          <div class="mb-2 flex flex-wrap gap-1" data-testid="guia-escenarios">
            @for (p of demo.presets; track p.id) {
              <button
                type="button"
                class="min-h-11 rounded-md border px-2 py-1 text-left text-xs md:min-h-0"
                [class]="p.id === demo.presetId() ? 'border-primary bg-primary text-white' : 'border-line bg-surface-alt text-ink'"
                [attr.data-testid]="'escenario-' + p.id"
                [title]="p.summary + ' Elegirlo reinicia la demo.'"
                (click)="apply(p.id)"
              >
                {{ p.id }} · {{ p.name }}
              </button>
            }
          </div>

          @if (demo.step(); as s) {
            <p class="text-xs text-muted" data-testid="guia-paso-num">
              {{ demo.preset().id }} · Paso {{ s.n }} · {{ demo.stepIndex() + 1 }} de {{ demo.preset().steps.length }} · {{ s.view }}
            </p>
            <h3 class="text-base font-bold text-navy" data-testid="guia-paso-titulo">{{ s.title }}</h3>
            <div class="mt-1 rounded-md border border-line bg-surface-alt px-2 py-1 text-xs" data-testid="guia-usuario-paso">
              @if (demo.stepUser(); as u) {
                @if (demo.needsSwitch()) {
                  <span data-testid="guia-marca-usuario">Otro usuario: {{ u.nombre }}</span>
                } @else {
                  <span data-testid="guia-marca-usuario">Usuario activo</span>
                }
                · <span class="font-mono break-all">/{{ s.route }}</span>
                @if (demo.needsSwitch()) {
                  <button type="button" class="btn btn-primary mt-1 w-full" data-testid="guia-ingresar-como" (click)="demo.signInAs()">
                    Ingresar como {{ u.nombre }}
                  </button>
                } @else {
                  <button type="button" class="btn mt-1 w-full" data-testid="guia-ir-pantalla" (click)="demo.goTo(demo.stepIndex())">Ir a la pantalla</button>
                }
              }
            </div>

            <h4 class="mt-2 text-xs font-semibold text-muted uppercase">Qué hacer</h4>
            <ol class="ml-4 list-decimal">
              @for (a of s.actions; track $index) {
                <li><app-code-text [text]="a" /></li>
              }
            </ol>
            <h4 class="mt-2 text-xs font-semibold text-muted uppercase">Qué contar</h4>
            <p class="italic" data-testid="guia-narrativa">«{{ s.say }}»</p>
            <h4 class="mt-2 text-xs font-semibold text-muted uppercase">Qué debe verse</h4>
            <ul class="ml-4 list-disc" data-testid="guia-esperado">
              @for (e of s.expect; track $index) {
                <li><app-code-text [text]="e" /></li>
              }
            </ul>
            @if (demo.showTrace()) {
              <p class="mt-2 font-mono text-[11px] text-muted" data-testid="guia-paso-trazabilidad">{{ s.items.join(' · ') }}</p>
            }
            <div class="mt-2 flex gap-2">
              <button type="button" class="btn flex-1" data-testid="guia-anterior" [disabled]="demo.stepIndex() === 0" (click)="demo.previous()">◀ Anterior</button>
              <button type="button" class="btn flex-1" data-testid="guia-siguiente" [disabled]="demo.stepIndex() >= demo.preset().steps.length - 1" (click)="demo.next()">
                Siguiente ▶
              </button>
            </div>
          }

          <details class="mt-2">
            <summary class="cursor-pointer py-2 text-xs font-semibold text-muted" data-testid="guia-todos-los-pasos">Todos los pasos</summary>
            <ol class="mt-1 list-none p-0">
              @for (st of demo.preset().steps; track st.n) {
                <li>
                  <button
                    type="button"
                    class="min-h-11 text-left hover:underline md:min-h-0"
                    [class.font-bold]="$index === demo.stepIndex()"
                    [attr.data-testid]="'guia-ir-paso-' + st.n"
                    (click)="demo.goTo($index)"
                  >
                    {{ st.n }}. {{ st.title }} <span class="text-muted">({{ st.view }})</span>
                  </button>
                </li>
              }
            </ol>
          </details>
        </section>

        <!-- 4. Controles -->
        <section class="bg-surface-alt px-3 py-2" data-testid="guia-controles">
          <h2 class="mb-1 text-xs font-extrabold tracking-wide text-navy uppercase">Controles</h2>
          <button type="button" class="btn btn-accent w-full" data-testid="guia-reiniciar" (click)="demo.quickReset()">Reiniciar demo</button>
          <label class="mt-2 flex min-h-11 items-center gap-2 text-xs md:min-h-0">
            <input type="checkbox" class="h-5 w-5" data-testid="btn-trazabilidad" [checked]="demo.showTrace()" (change)="demo.toggleTrace()" />
            Trazabilidad (ítems, reglas y escenarios de cada pantalla)
          </label>
          <p class="mt-1 text-[11px] text-muted" data-testid="guia-atajos">Atajos: Ctrl+Shift+D abre y cierra la guía · Ctrl+Shift+R reinicia, un clic, sin confirmación</p>
        </section>
      </div>
    </aside>
  }`,
})
export class DemoHudComponent {
  readonly demo = inject(DemoModeStore);
  readonly store = inject(DemoStore);
  readonly disclaimer = DISCLAIMER;

  readonly perfiles = computed(() => {
    const u = this.store.usuario();
    return u ? perfilesTexto(u) : '';
  });

  /** «Cambiar de usuario» (§8.1): agrupado por «Plataforma» y por empresa; los inactivos no se eligen (SUP-23). */
  readonly opciones = computed(() => {
    const s = this.store.state();
    const opcion = (u: (typeof s.usuarios)[number]): OpcionUsuario => ({
      id: u.id,
      label: `${u.nombre} · ${perfilesTexto(u)}${u.activo ? '' : ' · Inactivo'}`,
      activo: u.activo,
    });
    return [
      { grupo: 'Plataforma', opciones: s.usuarios.filter((u) => u.perfiles.some((p) => p.perfil === 'administrador')).map(opcion) },
      ...s.empresas.map((e) => ({ grupo: e.nombre, opciones: s.usuarios.filter((u) => u.perfiles.some((p) => p.empresaId === e.id)).map(opcion) })),
    ].filter((g) => g.opciones.length > 0);
  });

  path(view: Parameters<typeof pathOf>[0]): string {
    return pathOf(view);
  }

  itemName(id: string): string {
    return ITEMS[id]?.name ?? id;
  }

  apply(id: PresetId): void {
    this.demo.applyPreset(id);
  }

  cambiar(event: Event): void {
    const select = event.target as HTMLSelectElement;
    const id = select.value;
    select.value = '';
    if (id) {
      this.demo.cambiarUsuario(id);
    }
  }

  /** Esc cierra la guía en el celular (§8.5, E67); en escritorio queda abierta. */
  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.demo.hudOpen() && typeof window !== 'undefined' && window.matchMedia?.('(max-width: 767px)').matches) {
      this.demo.toggleHud();
    }
  }
}
