import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

/**
 * Aviso de un parámetro de ruta que no corresponde a la sesión (§1.5, SUP-29): la pantalla
 * muestra el aviso, ningún dato y un enlace a su lista; no redirige (E09, E64).
 */
@Component({
  selector: 'app-param-ajeno',
  imports: [RouterLink],
  template: `<div class="error-text" role="alert" data-testid="param-ajeno">
    <p data-testid="param-ajeno-texto">{{ texto() }}</p>
    <a class="btn mt-2" [routerLink]="link()" data-testid="param-ajeno-enlace">{{ enlace() }}</a>
  </div>`,
})
export class ParamAjenoComponent {
  readonly texto = input.required<string>();
  readonly enlace = input.required<string>();
  readonly link = input.required<string>();
}
