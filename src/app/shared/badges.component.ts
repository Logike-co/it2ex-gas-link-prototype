import { Component, computed, input } from '@angular/core';

export type BadgeTone = 'neutral' | 'info' | 'ok' | 'warn' | 'error';

const TONES: Record<BadgeTone, string> = {
  neutral: 'bg-surface-alt text-muted border-line',
  info: 'bg-primary-soft text-primary border-primary/30',
  ok: 'bg-success-soft text-success border-success/30',
  warn: 'bg-warning-soft text-warning border-warning/40',
  error: 'bg-error-soft text-error border-error/30',
};

/** Etiqueta de estado (Pendiente gris, Con saldo ámbar, Saldada verde…, flow-map §4.1). */
@Component({
  selector: 'app-badge',
  template: `<span
    [class]="'inline-block whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-bold ' + color()"
    data-testid="badge"
    ><ng-content
  /></span>`,
})
export class BadgeComponent {
  readonly tone = input<BadgeTone>('neutral');
  readonly color = computed(() => TONES[this.tone()]);
}

/**
 * Rótulo «Ilustrativo» (flow-map §0 y §11): valor o regla de ejemplo que se valida con el
 * prospecto. Se pone junto al dato.
 */
@Component({
  selector: 'app-ilustrativo',
  template: `<span
    class="ml-1 inline-block cursor-help rounded border border-dashed border-accent bg-accent-soft px-1 align-middle text-[10px] font-bold tracking-wide text-warning uppercase"
    data-testid="ilustrativo"
    tabindex="0"
    [attr.title]="ayuda()"
    [attr.aria-label]="'Ilustrativo: ' + ayuda()"
    >Ilustrativo</span
  >`,
})
export class IlustrativoComponent {
  readonly detalle = input<string>('');
  readonly ayuda = computed(() => `Valor o regla de ejemplo; se valida con el prospecto.${this.detalle() ? ' ' + this.detalle() : ''}`);
}
