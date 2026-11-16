import { Component, computed, inject, signal } from '@angular/core';
import { DemoModeStore } from './demo-mode.store';
import { ITEMS, VIEW_TRACE } from './traceability';

/**
 * Insignias de trazabilidad de la vista activa (§8): ítems (F/D), reglas (RN/RV) y escenarios
 * (Exx). Solo se ven con el interruptor «Trazabilidad» de la guía y nunca se imprimen.
 */
@Component({
  selector: 'app-view-trace',
  template: `@if (demo.showTrace() && trace(); as t) {
    <section
      class="no-print mb-3 rounded-lg border border-line bg-surface px-3 py-2 text-xs"
      data-testid="trazabilidad-vista"
      [attr.data-view]="t.view"
      aria-label="Trazabilidad de la vista"
    >
      <div class="flex flex-wrap items-center gap-1.5">
        <span class="font-semibold text-muted">{{ t.view }}</span>
        @for (i of t.items; track i) {
          <span class="rounded border border-primary/30 bg-primary-soft px-1.5 font-mono text-primary" data-testid="badge-item" [title]="itemName(i)">{{ i }}</span>
        }
        @for (r of t.rules; track r) {
          <span class="rounded border border-line bg-surface-alt px-1.5 font-mono text-ink" data-testid="badge-regla">{{ r }}</span>
        }
        <button type="button" class="ml-auto underline" data-testid="trazabilidad-detalle" (click)="open.set(!open())">
          {{ open() ? 'Ocultar escenarios' : t.scenarios.length + ' escenarios' }}
        </button>
      </div>
      @if (open()) {
        <ul class="mt-2 list-none space-y-0.5 p-0">
          @for (i of t.items; track i) {
            <li><span class="font-mono">{{ i }}</span> · {{ itemName(i) }} ({{ itemLevel(i) }})</li>
          }
          <li class="font-mono text-muted">{{ t.scenarios.join(' · ') }}</li>
        </ul>
      }
    </section>
  }`,
})
export class ViewTraceComponent {
  readonly demo = inject(DemoModeStore);
  readonly open = signal(false);
  readonly trace = computed(() => {
    const v = this.demo.currentView();
    return v ? VIEW_TRACE[v] : null;
  });
  itemName(id: string): string {
    return ITEMS[id]?.name ?? id;
  }
  itemLevel(id: string): string {
    return ITEMS[id]?.level ?? '';
  }
}
