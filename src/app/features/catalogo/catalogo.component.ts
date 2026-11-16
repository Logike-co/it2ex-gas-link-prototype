import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { kgInput } from '../../core/simulation/format';
import { PresentacionId, TipoLlave } from '../../core/simulation/model';
import { catalogo, configuracionCompleta } from '../../core/simulation/selectors';
import { DemoStore } from '../../core/state/demo.store';
import { BadgeComponent, IlustrativoComponent } from '../../shared/badges.component';
import { CopPipe } from '../../shared/pipes';
import { QrMuestraComponent } from '../../shared/qr-muestra.component';

interface FilaEditable {
  presentacionId: PresentacionId;
  etiqueta: string;
  peso: string;
  valor: string;
  activa: boolean;
  referencia: number;
}

/**
 * V03 · Catálogo y llave (F02, F03; RN-03, RN-04, RN-07). Los cambios solo afectan lo futuro
 * (SUP-15): la vista previa del cargue y los próximos QR; las cargas y cobros ya registrados
 * conservan sus valores.
 */
@Component({
  selector: 'app-catalogo',
  imports: [FormsModule, BadgeComponent, IlustrativoComponent, CopPipe, QrMuestraComponent],
  template: `
    <div class="mb-4 flex flex-wrap items-center gap-2">
      <h1 class="page-title">Catálogo y llave</h1>
      <app-badge [tone]="completa() ? 'ok' : 'warn'" data-testid="estado-configuracion">{{
        completa() ? 'Configuración completa' : 'Configuración pendiente'
      }}</app-badge>
    </div>
    @if (!completa()) {
      <p class="warning-text mb-3" data-testid="aviso-configuracion">
        Para cargar cilindros y mostrar el QR de la empresa, pon el valor unitario de las presentaciones y la llave de cobro.
      </p>
    }

    <div class="grid gap-4 xl:grid-cols-[1fr_22rem]">
      <form class="card overflow-x-auto" (ngSubmit)="guardarCatalogo()" data-testid="form-catalogo">
        <h2 class="card-title">Catálogo de cilindros</h2>
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
        <p class="mt-2 text-xs text-muted">
          Precio promedio al usuario: Superservicios, I trim. 2026 (solo referencia). Los cambios no modifican las cargas ya registradas.
        </p>
        @if (errorCatalogo(); as e) {
          <p class="error-text" data-testid="error-catalogo" role="alert">{{ e }}</p>
        }
        <button type="submit" class="btn btn-primary mt-3" data-testid="guardar-catalogo">Guardar catálogo</button>
      </form>

      <form class="card" (ngSubmit)="guardarLlave()" data-testid="form-llave">
        <h2 class="card-title">Llave de cobro de la empresa</h2>
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
    </div>
  `,
})
export class CatalogoComponent {
  readonly store = inject(DemoStore);
  readonly empresa = this.store.empresa;
  readonly completa = computed(() => configuracionCompleta(this.store.state(), this.store.empresaId() ?? ''));
  private readonly cat = computed(() => catalogo(this.store.state(), this.store.empresaId() ?? ''));

  readonly filas = signal<FilaEditable[]>([]);
  tipo: TipoLlave = 'alfanumerica';
  llave = '';
  readonly errorCatalogo = signal<string | null>(null);
  readonly errorLlave = signal<string | null>(null);

  constructor() {
    // Los campos se rellenan desde el estado (también tras «Reiniciar demo»).
    effect(() => {
      const cat = this.cat();
      const llave = this.empresa()?.llave;
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
        this.tipo = llave?.tipo ?? 'alfanumerica';
        this.llave = llave?.valor ?? '';
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

  guardarLlave(): void {
    const empresaId = this.store.empresaId();
    if (!empresaId) return;
    const r = this.store.exec((sim) => sim.guardarLlaveEmpresa(empresaId, this.tipo, this.llave));
    this.errorLlave.set(r.ok ? null : r.error);
  }
}
