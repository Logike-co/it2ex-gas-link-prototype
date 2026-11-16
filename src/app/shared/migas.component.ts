import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

export interface Miga {
  label: string;
  /** Ruta de la miga; la última (la pantalla abierta) va sin enlace. */
  link?: string;
}

/** Migas de pan de las pantallas hijas (§1.6): «Sección › Opción › detalle». */
@Component({
  selector: 'app-migas',
  imports: [RouterLink],
  template: `<nav aria-label="Migas de pan" class="mb-2 text-xs text-muted" data-testid="migas">
    <ol class="flex flex-wrap items-center gap-x-1 p-0">
      @for (m of items(); track $index; let last = $last) {
        <li class="flex items-center gap-x-1">
          @if (m.link && !last) {
            <a class="text-primary underline" [routerLink]="m.link" data-testid="miga">{{ m.label }}</a>
          } @else {
            <span [attr.aria-current]="last ? 'page' : null" [class.font-semibold]="last" [class.text-ink]="last" data-testid="miga">{{ m.label }}</span>
          }
          @if (!last) {
            <span aria-hidden="true">›</span>
          }
        </li>
      }
    </ol>
  </nav>`,
})
export class MigasComponent {
  readonly items = input.required<Miga[]>();
}
