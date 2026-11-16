import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { kgInput } from '../../core/simulation/format';
import { PresentacionId } from '../../core/simulation/model';
import { catalogo, configuracionCompleta } from '../../core/simulation/selectors';
import { DemoStore } from '../../core/state/demo.store';
import { BadgeComponent, IlustrativoComponent } from '../../shared/badges.component';
import { CopPipe } from '../../shared/pipes';

interface FilaEditable {
  presentacionId: PresentacionId;
  etiqueta: string;
  peso: string;
  valor: string;
  activa: boolean;
  referencia: number;
}

/**
 * V07 · Catálogo de cilindros (F02; RN-03, RN-04). Los cambios solo afectan lo futuro (SUP-15):
 * la vista previa del nuevo cargue y su prerrequisito de catálogo (R-16); las cargas ya
 * registradas conservan sus valores.
 */
@Component({
  selector: 'app-catalogo',
  imports: [FormsModule, RouterLink, BadgeComponent, IlustrativoComponent, CopPipe],
  template: `
    <div class="mb-4 flex flex-wrap items-center gap-2">
      <h1 class="page-title">Catálogo de cilindros</h1>
      <app-badge [tone]="completa() ? 'ok' : 'warn'" data-testid="estado-configuracion">{{
        completa() ? 'Configuración completa' : 'Configuración pendiente'
      }}</app-badge>
    </div>
    @if (!completa()) {
      <p class="warning-text mb-3" data-testid="aviso-configuracion">
        Para cargar cilindros, pon el valor unitario de las presentaciones; para mostrar el QR de la empresa, configura la
        <a class="underline" routerLink="/empresa/configuracion/llave">llave de cobro</a>.
      </p>
    }

    <div class="max-w-4xl">
      <form class="card overflow-x-auto" (ngSubmit)="guardarCatalogo()" data-testid="form-catalogo">
        <table class="table">
          <thead>
            <tr>
              <th>Presentación</th>
              <th>Peso (kg) <app-ilustrativo detalle="Peso del gas: libras × 0,4536 (SUP-03)." /></th>
              <th>Valor al vendedor (COP) <app-ilustrativo detalle="Precios de ejemplo (SUP-02)." /></th>
              <th class="num">Precio promedio al usuario</th>
              <th>Activa</th>
            </tr>
          </thead>
          <tbody>
            @for (f of filas(); track f.presentacionId) {
              <tr [attr.data-testid]="'fila-' + f.presentacionId">
                <td class="font-semibold whitespace-nowrap">{{ f.etiqueta }}</td>
                <td>
                  <input class="input w-24" [name]="'peso-' + f.presentacionId" [attr.data-testid]="'peso-' + f.presentacionId" [attr.aria-label]="'Peso de ' + f.etiqueta" [(ngModel)]="f.peso" />
                </td>
                <td>
                  <input
                    class="input w-32"
                    inputmode="numeric"
                    placeholder="Sin valor"
                    [name]="'valor-' + f.presentacionId"
                    [attr.data-testid]="'valor-' + f.presentacionId"
                    [attr.aria-label]="'Valor al vendedor de ' + f.etiqueta"
                    [(ngModel)]="f.valor"
                  />
                </td>
                <td class="num">{{ f.referencia | cop }}</td>
                <td>
                  <input type="checkbox" class="h-5 w-5" [name]="'activa-' + f.presentacionId" [attr.aria-label]="'Activa ' + f.etiqueta" [(ngModel)]="f.activa" />
                </td>
              </tr>
            }
          </tbody>
        </table>
        <p class="mt-2 text-xs text-muted">Precio promedio al usuario: Superservicios, I trim. 2026 (solo referencia).</p>
        <p class="mt-1 text-sm font-semibold text-navy" data-testid="aviso-fijo-catalogo">Los cambios no modifican las cargas ya registradas</p>
        @if (errorCatalogo(); as e) {
          <p class="error-text" data-testid="error-catalogo" role="alert">{{ e }}</p>
        }
        <button type="submit" class="btn btn-primary mt-3" data-testid="guardar-catalogo">Guardar catálogo</button>
      </form>

    </div>
  `,
})
export class CatalogoComponent {
  readonly store = inject(DemoStore);
  readonly completa = computed(() => configuracionCompleta(this.store.state(), this.store.empresaId() ?? ''));
  private readonly cat = computed(() => catalogo(this.store.state(), this.store.empresaId() ?? ''));

  readonly filas = signal<FilaEditable[]>([]);
  readonly errorCatalogo = signal<string | null>(null);

  constructor() {
    // Los campos se rellenan desde el estado (también tras «Reiniciar demo»).
    effect(() => {
      const cat = this.cat();
      untracked(() => {
        this.filas.set(
          cat.map((p) => ({
            presentacionId: p.id,
            etiqueta: p.etiqueta,
            peso: kgInput(p.pesoDecimasKg),
            valor: p.valorUnitario > 0 ? String(p.valorUnitario) : '',
            activa: p.activa,
            referencia: p.precioReferenciaUsuario,
          }))
        );
      });
    });
  }

  guardarCatalogo(): void {
    const empresaId = this.store.empresaId();
    if (!empresaId) return;
    const r = this.store.exec((sim) =>
      sim.guardarCatalogo(
        empresaId,
        this.filas().map((f) => ({ presentacionId: f.presentacionId, peso: f.peso, valor: f.valor, activa: f.activa }))
      )
    );
    this.errorCatalogo.set(r.ok ? null : r.error);
  }
}
