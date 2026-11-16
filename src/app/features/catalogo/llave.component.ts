import { Component, effect, inject, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TipoLlave } from '../../core/simulation/model';
import { DemoStore } from '../../core/state/demo.store';
import { QrMuestraComponent } from '../../shared/qr-muestra.component';

/**
 * V08 · Llave de cobro (F03, RN-07): la llave donde la empresa recibe los pagos, con la vista
 * previa del QR de muestra. Cambiarla solo afecta los QR futuros (SUP-15).
 */
@Component({
  selector: 'app-llave',
  imports: [FormsModule, QrMuestraComponent],
  template: `
    <h1 class="page-title mb-3">Llave de cobro</h1>
    <form class="card max-w-md" (ngSubmit)="guardarLlave()" data-testid="form-llave">
      <p class="mb-2 text-sm">
        Llave actual:
        <strong class="font-mono" data-testid="llave-actual">{{ empresa()?.llave?.valor ?? 'Sin llave' }}</strong>
      </p>
      <label class="label" for="llave-tipo">Tipo (informativo)</label>
      <select id="llave-tipo" class="input mb-2" name="tipo" [(ngModel)]="tipo">
        <option value="alfanumerica">Alfanumérica</option>
        <option value="celular">Celular</option>
        <option value="correo">Correo</option>
        <option value="documento">Documento</option>
      </select>
      <label class="label" for="llave-valor">Llave</label>
      <input id="llave-valor" class="input" name="llave" autocapitalize="off" data-testid="llave-valor" [(ngModel)]="llave" />
      @if (errorLlave(); as e) {
        <p class="error-text" data-testid="error-llave" role="alert">{{ e }}</p>
      }
      <button type="submit" class="btn btn-primary mt-3 w-full" data-testid="guardar-llave">Guardar llave</button>
      @if (empresa()?.llave; as l) {
        <p class="mt-4 mb-1 text-xs font-semibold text-muted">Vista previa del QR de muestra</p>
        <app-qr-muestra destino="empresa" [llave]="l.valor" [monto]="0" ventaId="VISTA-PREVIA" />
      }
    </form>
  `,
})
export class LlaveComponent {
  readonly store = inject(DemoStore);
  readonly empresa = this.store.empresa;
  tipo: TipoLlave = 'alfanumerica';
  llave = '';
  readonly errorLlave = signal<string | null>(null);

  constructor() {
    // El campo se rellena desde el estado (también tras «Reiniciar demo»).
    effect(() => {
      const l = this.empresa()?.llave;
      untracked(() => {
        this.tipo = l?.tipo ?? 'alfanumerica';
        this.llave = l?.valor ?? '';
      });
    });
  }

  guardarLlave(): void {
    const empresaId = this.store.empresaId();
    if (!empresaId) return;
    const r = this.store.exec((sim) => sim.guardarLlaveEmpresa(empresaId, this.tipo, this.llave));
    this.errorLlave.set(r.ok ? null : r.error);
  }
}
