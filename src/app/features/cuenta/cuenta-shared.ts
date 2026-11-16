import { Component, input } from '@angular/core';
import { EstadoPago, EstadoVendedor, Movimiento } from '../../core/simulation/selectors';
import { BadgeTone } from '../../shared/badges.component';
import { CodeTextComponent } from '../../shared/code-text.component';
import { CopPipe, FechaPipe } from '../../shared/pipes';

export const TONO_PAGO: Record<EstadoPago, BadgeTone> = { pendiente: 'neutral', abonada: 'warn', saldada: 'ok' };
export const TONO_VENDEDOR: Record<EstadoVendedor, BadgeTone> = { sin_cargas: 'neutral', con_saldo: 'warn', al_dia: 'ok', a_favor: 'info' };

/** Cuenta corriente con saldo corrido (R-09): la usan la cuenta del vendedor (V20) y «Mis movimientos» (V28). */
@Component({
  selector: 'app-movimientos-tabla',
  imports: [CodeTextComponent, CopPipe, FechaPipe],
  template: `<table class="table" data-testid="tabla-movimientos">
    <thead>
      <tr><th>Fecha</th><th>Movimiento</th><th class="num">Cargo</th><th class="num">Abono</th><th class="num">Saldo</th></tr>
    </thead>
    <tbody>
      @for (m of movimientos(); track m.id) {
        <tr [attr.data-testid]="'mov-' + m.id">
          <td class="whitespace-nowrap">{{ m.fechaHora | fecha }}</td>
          <td><app-code-text [text]="m.descripcion" /></td>
          <td class="num">{{ m.cargo ? (m.cargo | cop) : '' }}</td>
          <td class="num">{{ m.abono ? (m.abono | cop) : '' }}</td>
          <td class="num font-semibold">{{ m.saldo < 0 ? (-m.saldo | cop) + ' a favor' : (m.saldo | cop) }}</td>
        </tr>
      } @empty {
        <tr><td colspan="5" class="text-muted">Sin movimientos.</td></tr>
      }
    </tbody>
  </table>`,
})
export class MovimientosTablaComponent {
  readonly movimientos = input.required<Movimiento[]>();
}
