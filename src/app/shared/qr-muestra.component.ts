import { Component, computed, input } from '@angular/core';
import qrcode from 'qrcode-generator';
import { formatMoney } from '../core/simulation/format';

/** Texto del QR de muestra (flow-map §7 V07): no es un código de cobro. */
export const textoQr = (llave: string, monto: number, ventaId: string): string =>
  `GASLINK-DEMO|llave=${llave}|monto=${monto}|venta=${ventaId}`;

/** Celdas oscuras del QR como un único `path` SVG (1 unidad = 1 módulo). */
export const qrPath = (texto: string): { size: number; d: string } => {
  const qr = qrcode(0, 'M');
  qr.addData(texto);
  qr.make();
  const n = qr.getModuleCount();
  let d = '';
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (qr.isDark(r, c)) {
        d += `M${c} ${r}h1v1h-1z`;
      }
    }
  }
  return { size: n, d };
};

/**
 * QR simulado (F06b, S-08, SUP-18): se genera en el navegador, sin red, con un texto de muestra
 * y la marca «MUESTRA · NO PAGAR». Debajo, la llave y el monto en letra grande. Mide al menos
 * 240 × 240 px (E48).
 */
@Component({
  selector: 'app-qr-muestra',
  template: `<figure class="mx-auto flex w-full max-w-[18rem] flex-col items-center" [attr.data-testid]="'qr-' + destino()">
    <figcaption class="mb-1 text-sm font-bold text-navy">{{ titulo() }}</figcaption>
    <div class="relative w-full min-w-60" data-testid="qr-imagen">
      <svg
        [attr.viewBox]="'-2 -2 ' + (qr().size + 4) + ' ' + (qr().size + 4)"
        class="block aspect-square w-full rounded-lg border-2 border-navy bg-white"
        shape-rendering="crispEdges"
        role="img"
        [attr.aria-label]="'QR de muestra para ' + llave() + ' por ' + monto$()"
      >
        <path [attr.d]="qr().d" fill="#0b2a50" />
      </svg>
      <span
        class="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-12 rounded border-2 border-accent bg-white/90 px-2 py-1 text-center text-sm font-black tracking-wider whitespace-nowrap text-navy"
        data-testid="qr-marca"
        >MUESTRA · NO PAGAR</span
      >
    </div>
    <p class="mt-2 text-center text-lg font-bold break-all text-navy" data-testid="qr-texto">{{ llave() }}@if (monto() > 0) { · {{ monto$() }}}</p>
  </figure>`,
})
export class QrMuestraComponent {
  readonly destino = input.required<'empresa' | 'vendedor'>();
  readonly titulo = input<string>('');
  readonly llave = input.required<string>();
  readonly monto = input.required<number>();
  readonly ventaId = input.required<string>();

  readonly monto$ = computed(() => formatMoney(this.monto()));
  readonly qr = computed(() => qrPath(textoQr(this.llave(), this.monto(), this.ventaId())));
}
