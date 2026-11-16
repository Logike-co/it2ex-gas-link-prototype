import { Component, inject } from '@angular/core';
import { DemoStore } from '../core/state/demo.store';
import { CodeTextComponent } from '../shared/code-text.component';
import { DemoModeStore } from './demo-mode.store';
import { PresetId } from './demo-script';
import { DISCLAIMER } from '../brand';

/**
 * Guía del presentador (§8, workflow T §1.4): escenario activo, paso actual con usuario, ruta,
 * acción, narrativa y resultado esperado; «Ingresar como…», saltos entre pasos, interruptor de
 * trazabilidad y reinicio en un clic. Se abre con «Guía» o `Ctrl+Shift+D`; en escritorio se
 * acopla a la derecha sin tapar la vista y en el celular sube como hoja inferior.
 */
@Component({
  selector: 'app-demo-hud',
  imports: [CodeTextComponent],
  host: { class: 'contents' },
  template: `@if (demo.hudOpen()) {
    <aside
      class="no-print fixed inset-x-0 bottom-0 z-40 flex max-h-[70vh] flex-col overflow-hidden border-t-4 border-accent bg-surface text-sm shadow-2xl md:sticky md:top-24 md:z-auto md:max-h-[calc(100vh-7rem)] md:w-[22rem] md:shrink-0 md:self-start md:border-t-0 md:border-l md:border-line md:shadow-none"
      data-testid="guia-demo"
      aria-label="Guía del presentador"
    >
      <header class="flex items-center gap-2 bg-navy px-3 py-2 text-white">
        <strong class="flex-1">Guía del presentador</strong>
        <span class="hidden text-xs opacity-80 md:inline">Ctrl+Shift+D</span>
        <button type="button" class="min-h-9 px-2" aria-label="Cerrar guía" data-testid="guia-cerrar" (click)="demo.toggleHud()">✕</button>
      </header>
      <p class="bg-navy px-3 pb-1 text-[11px] font-bold tracking-widest text-white" data-testid="guia-leyenda">
        {{ disclaimer }}
      </p>

      <div class="flex flex-wrap gap-1 border-b border-line px-3 py-2" data-testid="guia-escenarios">
        @for (p of demo.presets; track p.id) {
          <button
            type="button"
            class="rounded-md border px-2 py-1 text-xs"
            [class]="p.id === demo.presetId() ? 'border-primary bg-primary text-white' : 'border-line bg-surface-alt text-ink'"
            [attr.data-testid]="'escenario-' + p.id"
            [title]="p.summary + ' Elegirlo reinicia la demo.'"
            (click)="apply(p.id)"
          >
            {{ p.id }} · {{ p.name }}
          </button>
        }
      </div>

      <div class="flex-1 overflow-y-auto px-3 py-2">
        @if (demo.step(); as s) {
          <p class="text-xs text-muted" data-testid="guia-paso-num">
            {{ demo.preset().id }} · Paso {{ s.n }} · {{ demo.stepIndex() + 1 }} de {{ demo.preset().steps.length }} · {{ s.view }}
          </p>
          <h2 class="text-base font-bold text-navy" data-testid="guia-paso-titulo">{{ s.title }}</h2>
          <div class="mt-1 rounded-md border border-line bg-surface-alt px-2 py-1 text-xs" data-testid="guia-usuario-paso">
            @if (demo.stepUser(); as u) {
              Como <strong>{{ u.nombre }}</strong> ({{ s.perfil }}) · <span class="font-mono">/{{ s.route }}</span>
              @if (demo.needsSwitch()) {
                <button type="button" class="btn btn-primary mt-1 w-full" data-testid="guia-ingresar-como" (click)="demo.signInAs()">
                  Ingresar como {{ u.nombre }}
                </button>
              } @else {
                <button type="button" class="btn mt-1 w-full" data-testid="guia-ir-pantalla" (click)="demo.goTo(demo.stepIndex())">
                  Ir a la pantalla
                </button>
              }
            }
          </div>

          <h3 class="mt-2 text-xs font-semibold text-muted uppercase">Qué hacer</h3>
          <ol class="ml-4 list-decimal">
            @for (a of s.actions; track $index) {
              <li><app-code-text [text]="a" /></li>
            }
          </ol>
          <h3 class="mt-2 text-xs font-semibold text-muted uppercase">Qué contar</h3>
          <p class="italic" data-testid="guia-narrativa">«{{ s.say }}»</p>
          <h3 class="mt-2 text-xs font-semibold text-muted uppercase">Qué debe verse</h3>
          <ul class="ml-4 list-disc" data-testid="guia-esperado">
            @for (e of s.expect; track $index) {
              <li><app-code-text [text]="e" /></li>
            }
          </ul>
          @if (demo.showTrace()) {
            <p class="mt-2 font-mono text-[11px] text-muted" data-testid="guia-paso-trazabilidad">{{ s.items.join(' · ') }}</p>
          }
        }

        <details class="mt-3">
          <summary class="cursor-pointer text-xs font-semibold text-muted" data-testid="guia-todos-los-pasos">Todos los pasos</summary>
          <ol class="mt-1 list-none p-0">
            @for (st of demo.preset().steps; track st.n) {
              <li>
                <button
                  type="button"
                  class="text-left hover:underline"
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
      </div>

      <footer class="flex flex-wrap items-center gap-2 border-t border-line px-3 py-2">
        <button type="button" class="btn" data-testid="guia-anterior" [disabled]="demo.stepIndex() === 0" (click)="demo.previous()">◀ Anterior</button>
        <button
          type="button"
          class="btn"
          data-testid="guia-siguiente"
          [disabled]="demo.stepIndex() >= demo.preset().steps.length - 1"
          (click)="demo.next()"
        >
          Siguiente ▶
        </button>
        <span class="flex-1"></span>
        <label class="flex items-center gap-1 text-xs">
          <input type="checkbox" data-testid="btn-trazabilidad" [checked]="demo.showTrace()" (change)="demo.toggleTrace()" />
          Trazabilidad
        </label>
      </footer>
      <div class="flex items-center gap-2 border-t border-line bg-surface-alt px-3 py-2">
        <button type="button" class="btn btn-accent" data-testid="guia-reiniciar" (click)="demo.quickReset()">Reiniciar demo</button>
        <span class="text-[11px] text-muted">Ctrl+Shift+R · un clic, sin confirmación</span>
      </div>
    </aside>
  }`,
})
export class DemoHudComponent {
  readonly demo = inject(DemoModeStore);
  readonly store = inject(DemoStore);
  readonly disclaimer = DISCLAIMER;

  apply(id: PresetId): void {
    this.demo.applyPreset(id);
  }
}
