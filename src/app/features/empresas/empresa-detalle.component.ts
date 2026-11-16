import { Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { catalogo, configuracionCompleta, empresaById, usuarioById, usuariosDeEmpresa } from '../../core/simulation/selectors';
import { DemoStore } from '../../core/state/demo.store';
import { BadgeComponent } from '../../shared/badges.component';
import { MigasComponent } from '../../shared/migas.component';
import { ParamAjenoComponent } from '../../shared/param-ajeno.component';
import { FechaPipe } from '../../shared/pipes';

/**
 * V04 · Detalle de la empresa (F01, RN-01): datos de alta, usuario principal y estado de la
 * configuración, con lo que falta. Lo que falta lo configura la empresa; el administrador solo
 * lo ve. Desde aquí se abren sus usuarios (V05).
 */
@Component({
  selector: 'app-empresa-detalle',
  imports: [RouterLink, BadgeComponent, MigasComponent, ParamAjenoComponent, FechaPipe],
  template: `
    @if (datos(); as d) {
      <app-migas [items]="[{ label: 'Plataforma' }, { label: 'Empresas', link: '/admin/empresas' }, { label: d.empresa.nombre }]" />
      <div class="mb-3 flex flex-wrap items-center gap-2">
        <h1 class="page-title" data-testid="empresa-detalle-nombre">{{ d.empresa.nombre }}</h1>
        <app-badge [tone]="d.completa ? 'ok' : 'warn'" data-testid="empresa-detalle-config">{{
          d.completa ? 'Configuración completa' : 'Configuración pendiente'
        }}</app-badge>
      </div>
      <section class="card mb-3 max-w-2xl">
        <dl class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
          <dt class="text-muted">Id</dt>
          <dd class="font-mono">{{ d.empresa.id }}</dd>
          <dt class="text-muted">Ciudad</dt>
          <dd>{{ d.empresa.ciudad || '—' }}</dd>
          <dt class="text-muted">Alta</dt>
          <dd>{{ d.empresa.creadaEn | fecha }}</dd>
          <dt class="text-muted">Usuario principal</dt>
          <dd data-testid="empresa-detalle-usuario">{{ d.principal?.nombre ?? '—' }} <span class="font-mono text-xs text-muted">{{ d.principal?.usuario }}</span></dd>
        </dl>
        @if (d.faltas.length) {
          <div class="warning-text" data-testid="empresa-detalle-faltas">
            <p class="font-semibold">Falta para completar la configuración (la completa la empresa):</p>
            <ul class="ml-4 list-disc">
              @for (f of d.faltas; track f) {
                <li>{{ f }}</li>
              }
            </ul>
          </div>
        }
      </section>
      <div class="flex flex-wrap gap-2">
        <a class="btn btn-primary" [routerLink]="'/admin/empresas/' + d.empresa.id + '/usuarios'" data-testid="ver-usuarios">
          Usuarios ({{ d.activos }} activos de {{ d.total }})
        </a>
        <a class="btn" routerLink="/admin/empresas" data-testid="volver-empresas">Volver a empresas</a>
      </div>
    } @else {
      <app-migas [items]="[{ label: 'Plataforma' }, { label: 'Empresas', link: '/admin/empresas' }, { label: empresaId() ?? '' }]" />
      <app-param-ajeno texto="Esa empresa no existe" enlace="Empresas" link="/admin/empresas" />
    }
  `,
})
export class EmpresaDetalleComponent {
  readonly store = inject(DemoStore);
  /** `:empresaId` */
  readonly empresaId = input<string>();

  readonly datos = computed(() => {
    const s = this.store.state();
    const empresa = empresaById(s, this.empresaId());
    if (!empresa) return null;
    const usuarios = usuariosDeEmpresa(s, empresa.id);
    const cat = catalogo(s, empresa.id);
    const faltas = [
      ...(empresa.llave ? [] : ['Sin llave de cobro']),
      ...(cat.some((p) => p.valorUnitario <= 0) ? ['Presentaciones sin valor unitario'] : []),
    ];
    return {
      empresa,
      principal: usuarioById(s, empresa.usuarioId),
      completa: configuracionCompleta(s, empresa.id),
      faltas,
      activos: usuarios.filter((u) => u.activo).length,
      total: usuarios.length,
    };
  });
}
