import { Component, computed, input } from '@angular/core';

/** Códigos de la demo: CAR-A-004, VTA-A-004, COB-A-005, BRB-DEMO-1001, ESC-01… */
const CODE = /([A-Z]{1,5}(?:-[A-Z0-9]+)+)/;

/** Separa un texto en tramos, marcando cuáles son códigos. */
export function splitCodes(text: string): { text: string; code: boolean }[] {
  return text
    .split(CODE)
    .filter((part) => part !== '')
    .map((part) => ({ text: part, code: CODE.test(part) }));
}

/**
 * Muestra un texto sin partir sus códigos entre dos líneas (el navegador corta en el guion:
 * «CAJ-» / «S02»). El resto del texto se parte normalmente.
 */
@Component({
  selector: 'app-code-text',
  template: `@for (part of parts(); track $index) {<span [class.whitespace-nowrap]="part.code">{{ part.text }}</span>}`,
})
export class CodeTextComponent {
  readonly text = input<string | null | undefined>('');
  readonly parts = computed(() => splitCodes(String(this.text() ?? '')));
}
