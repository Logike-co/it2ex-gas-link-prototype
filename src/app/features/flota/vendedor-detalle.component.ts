import { Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { cuentaVendedor, ESTADO_VENDEDOR_LABEL, faltaVendedor, placaDe, usuarioById, vendedorById } from '../../core/simulation/selectors';
import { DemoStore } from '../../core/state/demo.store';
import { BadgeComponent } from '../../shared/badges.component';
import { MigasComponent } from '../../shared/migas.component';
import { ParamAjenoComponent } from '../../shared/param-ajeno.component';
import { TONO_VENDEDOR } from '../cuenta/cuenta-shared';

/**
 * V11 · Detalle del vendedor (F04; RN-12, RV-04): sus datos, su usuario de ingreso, sus
 * camiones y sus conductores. «Agregar camión» y «Agregar conductor» abren los formularios con
 * el vendedor fijo y vuelven aquí al guardar (SUP-28). No se edita ni se borra (SUP-13).
 */
@Component({
  selector: 'app-vendedor-detalle',
  imports: [RouterLink, BadgeComponent, MigasComponent, ParamAjenoComponent],
  template: `
    @if (datos(); as d) {
      <app-migas [items]="[{ label: 'Flota' }, { label: 'Vendedores', link: '/empresa/flota/vendedores' }, { label: d.vendedor.nombre }]" />
      <div class="mb-3 flex flex-wrap items-center gap-2">
        <h1 class="page-title" data-testid="vendedor-detalle-nombre">{{ d.vendedor.nombre }}</h1>
        <app-badge [tone]="tono[d.estado]" data-testid="vendedor-detalle-estado">{{ estadoLabel[d.estado] }}</app-badge>
      </div>
      @if (d.falta.camion || d.falta.conductor) {
        <p class="warning-text mb-3" data-testid="vendedor-falta">Agrega un camión y un conductor para poder cargarle cilindros.</p>
      }
      <section class="card mb-3 max-w-2xl">
        <dl class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
          <dt class="text-muted">Contacto</dt>
          <dd>{{ d.vendedor.contacto || '—' }}</dd>
          <dt class="text-muted">Llave</dt>
          <dd class="font-mono">{{ d.vendedor.llave?.valor ?? 'Sin llave' }}</dd>
          <dt class="text-muted">Usuario de ingreso</dt>
          <dd>
            <span class="font-mono">{{ d.usuario?.usuario ?? '—' }}</span>
            @if (d.usuario) {
              · {{ d.usuario.activo ? 'Activo' : 'Inactivo' }}
            }
          </dd>
        </dl>
        <div class="mt-3 flex flex-wrap gap-2">
          <a class="btn" [routerLink]="'/empresa/cuentas/' + d.vendedor.id" data-testid="ver-cuenta">Ver cuenta</a>
          <a class="btn" [routerLink]="'/empresa/conciliacion/' + d.vendedor.id" data-testid="ver-conciliacion">Conciliación</a>
        </div>
      </section>

      <div class="grid gap-4 xl:grid-cols-2">
        <section class="card overflow-x-auto">
          <div class="card-title">
            <span class="flex-1">Camiones</span>
            @if (store.can('flota.editar')) {
              <a class="btn btn-primary" routerLink="/empresa/flota/camiones/nuevo" [queryParams]="{ vendedor: d.vendedor.id }" data-testid="agregar-camion">Agregar camión</a>
            }
          </div>
          <table class="table" data-testid="vendedor-camiones">
            <thead><tr><th>Placa</th><th>Conductores asignados</th></tr></thead>
            <tbody>
              @for (c of d.camiones; track c.id) {
                <tr [attr.data-testid]="'camion-' + c.id">
                  <td class="font-mono font-semibold whitespace-nowrap">{{ c.placa }}</td>
                  <td>{{ c.conductores.join(', ') || '—' }}</td>
                </tr>
              } @empty {
                <tr><td colspan="2" class="text-muted">Sin camiones.</td></tr>
              }
            </tbody>
          </table>
        </section>
        <section class="card overflow-x-auto">
          <div class="card-title">
            <span class="flex-1">Conductores</span>
            @if (store.can('flota.editar')) {
              @if (d.camiones.length) {
                <a class="btn btn-primary" routerLink="/empresa/flota/conductores/nuevo" [queryParams]="{ vendedor: d.vendedor.id }" data-testid="agregar-conductor">Agregar conductor</a>
              } @else {
                <button type="button" class="btn" disabled data-testid="agregar-conductor" title="Primero agrega un camión">Agregar conductor</button>
                <span class="w-full text-xs font-normal text-muted" data-testid="agregar-conductor-ayuda">Primero agrega un camión</span>
              }
            }
          </div>
          <table class="table" data-testid="vendedor-conductores">
            <thead><tr><th>Conductor</th><th>Camión</th><th>Es el vendedor</th></tr></thead>
            <tbody>
              @for (c of d.conductores; track c.id) {
                <tr [attr.data-testid]="'conductor-' + c.id">
                  <td class="font-semibold">{{ c.nombre }}</td>
                  <td class="font-mono whitespace-nowrap">{{ c.placa }}</td>
                  <td>{{ c.esElVendedor ? 'Sí' : 'No' }}</td>
                </tr>
              } @empty {
                <tr><td colspan="3" class="text-muted">Sin conductores.</td></tr>
              }
            </tbody>
          </table>
        </section>
      </div>
    } @else {
      <app-migas [items]="[{ label: 'Flota' }, { label: 'Vendedores', link: '/empresa/flota/vendedores' }, { label: vendedorId() ?? '' }]" />
      <app-param-ajeno [texto]="'Ese vendedor no existe en ' + (store.empresa()?.nombre ?? '')" enlace="Vendedores" link="/empresa/flota/vendedores" />
    }
  `,
})
export class VendedorDetalleComponent {
  readonly store = inject(DemoStore);
  /** `:vendedorId` */
  readonly vendedorId = input<string>();
  readonly tono = TONO_VENDEDOR;
  readonly estadoLabel = ESTADO_VENDEDOR_LABEL;

  readonly datos = computed(() => {
    const s = this.store.state();
    const vendedor = vendedorById(s, this.vendedorId());
    if (!vendedor || vendedor.empresaId !== this.store.empresaId()) return null;
    return {
      vendedor,
      usuario: usuarioById(s, vendedor.usuarioId),
      estado: cuentaVendedor(s, vendedor.id)?.estado ?? 'sin_cargas',
      falta: faltaVendedor(s, vendedor.id),
      camiones: s.vehiculos
        .filter((v) => v.vendedorId === vendedor.id)
        .map((v) => ({ ...v, conductores: s.conductores.filter((c) => c.vehiculoId === v.id).map((c) => c.nombre) })),
      conductores: s.conductores.filter((c) => c.vendedorId === vendedor.id).map((c) => ({ ...c, placa: placaDe(s, c.vehiculoId) })),
    };
  });
}
