import { Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { cobrosDeVenta, etiquetaCorta, existenciasCamion, MEDIO_LABEL, placaDe, resumenVenta, textoVenta, ventaById } from '../../core/simulation/selectors';
import { DemoStore } from '../../core/state/demo.store';
import { BadgeComponent } from '../../shared/badges.component';
import { MigasComponent } from '../../shared/migas.component';
import { ParamAjenoComponent } from '../../shared/param-ajeno.component';
import { CopPipe, FechaPipe } from '../../shared/pipes';

/**
 * V33 · Detalle de la venta (F06; RN-10, RN-12), pensada para el celular: valor, cobrado, por
 * cobrar y estado (R-12); líneas con su carga de origen (R-04) y la marca de existencias; lo que
 * queda en el camión y los cobros registrados. Mientras no esté «Cobrada» ofrece «Cobrar con QR»
 * (V34) y «Registrar montos» (V35). La venta se valida contra el conductor de la sesión (§1.5).
 */
@Component({
  selector: 'app-venta-detalle',
  imports: [RouterLink, BadgeComponent, MigasComponent, ParamAjenoComponent, CopPipe, FechaPipe],
  template: `
    <div class="mx-auto max-w-lg">
      <app-migas [items]="[{ label: 'Venta en calle' }, { label: 'Mis ventas', link: '/conductor/ventas' }, { label: ventaId() ?? '' }]" />
      @if (datos(); as d) {
        <section class="card mb-3" data-testid="venta-detalle">
          <div class="mb-2 flex flex-wrap items-center gap-2">
            <h1 class="page-title font-mono" data-testid="venta-detalle-id">{{ d.r.venta.id }}</h1>
            <app-badge [tone]="d.r.estado === 'cobrada' ? 'ok' : d.r.estado === 'parcial' ? 'warn' : 'info'" data-testid="estado-venta">{{ d.texto }}</app-badge>
          </div>
          <dl class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
            <dt class="text-muted">Fecha</dt>
            <dd>{{ d.r.venta.fechaHora | fecha }}</dd>
            <dt class="text-muted">Camión</dt>
            <dd class="font-mono" data-testid="venta-detalle-camion">{{ d.placa }}</dd>
            <dt class="text-muted">Conductor</dt>
            <dd data-testid="venta-detalle-conductor">{{ d.conductor }}</dd>
            <dt class="text-muted">Valor</dt>
            <dd class="font-bold" data-testid="venta-detalle-valor">{{ d.r.venta.valor | cop }}</dd>
            <dt class="text-muted">Cobrado</dt>
            <dd data-testid="venta-detalle-cobrado">{{ d.r.cobrado | cop }}</dd>
            @if (d.r.excede > 0) {
              <dt class="text-muted">Excede en</dt>
              <dd>{{ d.r.excede | cop }}</dd>
            } @else {
              <dt class="text-muted">Por cobrar</dt>
              <dd class="font-bold" data-testid="venta-detalle-por-cobrar">{{ d.r.porCobrar | cop }}</dd>
            }
          </dl>
          @if (d.r.venta.avisoExistencias) {
            <p class="warning-text" data-testid="venta-aviso-existencias">Registrada con aviso de existencias</p>
          }
        </section>

        <section class="card mb-3">
          <h2 class="card-title">Cilindros</h2>
          <ul class="list-none space-y-1 p-0 text-sm" data-testid="venta-lineas">
            @for (l of d.r.venta.lineas; track l.presentacionId) {
              @if (l.unidades > 0) {
                <li>
                  <strong>{{ l.unidades }} × {{ etiqueta(l.presentacionId) }}</strong>
                  <span class="text-xs text-muted">
                    · de
                    @for (o of l.origen; track o.cargaId; let last = $last) {
                      <span class="font-mono">{{ o.cargaId }}</span> ({{ o.unidades }}){{ last ? '' : ', ' }}
                    }
                  </span>
                </li>
              }
            }
          </ul>
          <p class="mt-2 text-xs text-muted" data-testid="venta-quedan">
            Quedan en el camión:
            @for (e of d.existencias; track e.presentacionId; let last = $last) {
              {{ e.etiqueta }} <strong [attr.data-testid]="'quedan-' + e.presentacionId">{{ e.quedan }}</strong>{{ last ? '' : ' · ' }}
            }
          </p>
        </section>

        <section class="card mb-3">
          <h2 class="card-title">Cobros registrados</h2>
          <ul class="list-none space-y-1 p-0 text-sm" data-testid="venta-cobros">
            @for (c of d.cobros; track c.id) {
              <li [attr.data-testid]="'cobro-' + c.id">
                <span class="font-mono">{{ c.id }}</span> · {{ medio[c.medio] }} · <strong>{{ c.monto | cop }}</strong>
                @if (c.medio !== 'efectivo') {
                  · @if (c.referencia) {
                    ref. <span class="font-mono">{{ c.referencia }}</span>
                  } @else {
                    <app-badge tone="error">Sin referencia</app-badge>
                  }
                }
                @if (c.medio === 'llave_empresa') {
                  · {{ c.conciliacion === 'confirmado' ? 'Confirmado' : 'Por confirmar' }}
                }
              </li>
            } @empty {
              <li class="text-muted">Todavía no hay cobros.</li>
            }
          </ul>
        </section>

        @if (d.r.estado !== 'cobrada') {
          <div class="sticky bottom-0 grid gap-2 bg-surface-alt pt-2 pb-3 sm:grid-cols-2">
            <a class="btn btn-primary btn-lg" [routerLink]="'/conductor/ventas/' + d.r.venta.id + '/cobro'" data-testid="cobrar-qr">Cobrar con QR</a>
            <a class="btn btn-lg" [routerLink]="'/conductor/ventas/' + d.r.venta.id + '/montos'" data-testid="registrar-montos">Registrar montos</a>
          </div>
        }
      } @else {
        <app-param-ajeno texto="Esa venta no está entre tus ventas" enlace="Mis ventas" link="/conductor/ventas" />
      }
    </div>
  `,
})
export class VentaDetalleComponent {
  readonly store = inject(DemoStore);
  /** `:ventaId` (validada contra el conductor de la sesión, §1.5). */
  readonly ventaId = input<string>();
  readonly medio = MEDIO_LABEL;

  readonly datos = computed(() => {
    const s = this.store.state();
    const v = ventaById(s, this.ventaId());
    if (!v || v.conductorId !== this.store.conductorId()) return null;
    const r = resumenVenta(s, v);
    return {
      r,
      texto: textoVenta(r),
      placa: placaDe(s, v.vehiculoId),
      conductor: s.conductores.find((c) => c.id === v.conductorId)?.nombre ?? v.conductorId,
      existencias: existenciasCamion(s, v.vehiculoId),
      cobros: cobrosDeVenta(s, v.id),
    };
  });

  etiqueta(p: Parameters<typeof etiquetaCorta>[0]): string {
    return etiquetaCorta(p);
  }
}
