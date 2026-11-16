import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TipoLlave } from '../../core/simulation/model';
import { cuentaVendedor, ESTADO_VENDEDOR_LABEL, placaDe, vendedorNombre, vendedoresDe } from '../../core/simulation/selectors';
import { DemoStore } from '../../core/state/demo.store';
import { BadgeComponent } from '../../shared/badges.component';

type Pestana = 'vendedores' | 'camiones' | 'conductores';

/**
 * V04 · Flota (F04; RN-12, RV-04): vendedores con su llave, camiones con su dueño y conductores
 * con su camión. Crear un vendedor o un conductor crea su usuario de ingreso (SUP-12). No se
 * edita ni se borra nada (SUP-13).
 */
@Component({
  selector: 'app-flota',
  imports: [FormsModule, BadgeComponent],
  template: `
    <h1 class="page-title mb-3">Flota</h1>
    <div class="mb-3 flex flex-wrap gap-1" role="tablist">
      @for (t of pestanas; track t.id) {
        <button
          type="button"
          role="tab"
          class="btn"
          [class.btn-primary]="pestana() === t.id"
          [attr.aria-selected]="pestana() === t.id"
          [attr.data-testid]="'pestana-' + t.id"
          (click)="pestana.set(t.id)"
        >
          {{ t.label }} ({{ t.count() }})
        </button>
      }
    </div>

    @switch (pestana()) {
      @case ('vendedores') {
        <div class="grid gap-4 xl:grid-cols-[1fr_20rem]">
          <section class="card overflow-x-auto">
            <table class="table" data-testid="tabla-vendedores">
              <thead>
                <tr><th>Vendedor</th><th>Contacto</th><th>Llave</th><th>Camiones</th><th>Conductores</th><th>Cuenta</th></tr>
              </thead>
              <tbody>
                @for (v of vendedores(); track v.id) {
                  <tr [attr.data-testid]="'vendedor-' + v.id">
                    <td class="font-semibold">{{ v.nombre }}</td>
                    <td>{{ v.contacto || '—' }}</td>
                    <td class="font-mono text-xs">{{ v.llave || 'Sin llave' }}</td>
                    <td class="whitespace-nowrap">{{ v.placas.join(', ') || '—' }}</td>
                    <td>{{ v.conductores.join(', ') || '—' }}</td>
                    <td><app-badge [tone]="v.estado === 'con_saldo' ? 'warn' : v.estado === 'al_dia' ? 'ok' : 'neutral'">{{ v.estadoLabel }}</app-badge></td>
                  </tr>
                }
              </tbody>
            </table>
          </section>
          <form class="card" (ngSubmit)="crearVendedor()" data-testid="form-vendedor">
            <h2 class="card-title">Nuevo vendedor</h2>
            <label class="label" for="ven-nombre">Nombre (persona o negocio) *</label>
            <input id="ven-nombre" class="input mb-2" name="nombre" data-testid="vendedor-nombre" [(ngModel)]="vNombre" />
            <label class="label" for="ven-contacto">Contacto (quien usa el perfil)</label>
            <input id="ven-contacto" class="input mb-2" name="contacto" data-testid="vendedor-contacto" [(ngModel)]="vContacto" />
            <label class="label" for="ven-tipo">Tipo de llave</label>
            <select id="ven-tipo" class="input mb-2" name="tipo" [(ngModel)]="vTipo">
              <option value="alfanumerica">Alfanumérica</option>
              <option value="celular">Celular</option>
              <option value="correo">Correo</option>
              <option value="documento">Documento</option>
            </select>
            <label class="label" for="ven-llave">Llave del vendedor</label>
            <input id="ven-llave" class="input" name="llave" autocapitalize="off" data-testid="vendedor-llave" [(ngModel)]="vLlave" />
            @if (errorVendedor(); as e) {
              <p class="error-text" data-testid="error-vendedor" role="alert">{{ e }}</p>
            }
            <button type="submit" class="btn btn-primary mt-3 w-full" data-testid="crear-vendedor">Registrar vendedor</button>
          </form>
        </div>
      }
      @case ('camiones') {
        <div class="grid gap-4 xl:grid-cols-[1fr_20rem]">
          <section class="card overflow-x-auto">
            <table class="table" data-testid="tabla-camiones">
              <thead>
                <tr><th>Placa</th><th>Dueño</th><th>Conductores asignados</th></tr>
              </thead>
              <tbody>
                @for (c of camiones(); track c.id) {
                  <tr [attr.data-testid]="'camion-' + c.id">
                    <td class="font-mono font-semibold whitespace-nowrap">{{ c.placa }}</td>
                    <td>{{ c.dueno }}</td>
                    <td>{{ c.conductores.join(', ') || '—' }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </section>
          <form class="card" (ngSubmit)="crearCamion()" data-testid="form-camion">
            <h2 class="card-title">Nuevo camión</h2>
            <label class="label" for="cam-placa">Placa (AAA 999) *</label>
            <input id="cam-placa" class="input mb-2" name="placa" autocapitalize="characters" data-testid="camion-placa" [(ngModel)]="cPlaca" />
            <label class="label" for="cam-dueno">Dueño *</label>
            <select id="cam-dueno" class="input" name="dueno" data-testid="camion-dueno" [(ngModel)]="cDueno">
              <option value="">Elige el vendedor…</option>
              @for (v of vendedores(); track v.id) {
                <option [value]="v.id">{{ v.nombre }}</option>
              }
            </select>
            @if (errorCamion(); as e) {
              <p class="error-text" data-testid="error-camion" role="alert">{{ e }}</p>
            }
            <button type="submit" class="btn btn-primary mt-3 w-full" data-testid="crear-camion">Registrar camión</button>
          </form>
        </div>
      }
      @case ('conductores') {
        <div class="grid gap-4 xl:grid-cols-[1fr_20rem]">
          <section class="card overflow-x-auto">
            <table class="table" data-testid="tabla-conductores">
              <thead>
                <tr><th>Conductor</th><th>Vendedor</th><th>Camión</th><th>Es el vendedor</th></tr>
              </thead>
              <tbody>
                @for (c of conductores(); track c.id) {
                  <tr [attr.data-testid]="'conductor-' + c.id">
                    <td class="font-semibold">{{ c.nombre }}</td>
                    <td>{{ c.vendedor }}</td>
                    <td class="font-mono whitespace-nowrap">{{ c.placa }}</td>
                    <td>{{ c.esElVendedor ? 'Sí' : 'No' }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </section>
          <form class="card" (ngSubmit)="crearConductor()" data-testid="form-conductor">
            <h2 class="card-title">Nuevo conductor</h2>
            <label class="label" for="cdt-vendedor">Vendedor para el que trabaja *</label>
            <select id="cdt-vendedor" class="input mb-2" name="vendedor" data-testid="conductor-vendedor" [ngModel]="kVendedor()" (ngModelChange)="elegirVendedor($event)">
              <option value="">Elige el vendedor…</option>
              @for (v of vendedores(); track v.id) {
                <option [value]="v.id">{{ v.nombre }}</option>
              }
            </select>
            <label class="mb-2 flex items-center gap-2 text-sm">
              <input type="checkbox" class="h-5 w-5" name="esElVendedor" data-testid="conductor-es-vendedor" [(ngModel)]="kEsElVendedor" />
              Es el mismo vendedor
            </label>
            @if (!kEsElVendedor) {
              <label class="label" for="cdt-nombre">Nombre del conductor *</label>
              <input id="cdt-nombre" class="input mb-2" name="nombre" data-testid="conductor-nombre" [(ngModel)]="kNombre" />
            }
            <label class="label" for="cdt-camion">Camión (del vendedor) *</label>
            <select id="cdt-camion" class="input" name="camion" data-testid="conductor-camion" [(ngModel)]="kCamion">
              <option value="">Elige el camión…</option>
              @for (c of camionesDelVendedor(); track c.id) {
                <option [value]="c.id">{{ c.placa }}</option>
              }
            </select>
            @if (errorConductor(); as e) {
              <p class="error-text" data-testid="error-conductor" role="alert">{{ e }}</p>
            }
            <button type="submit" class="btn btn-primary mt-3 w-full" data-testid="crear-conductor">Registrar conductor</button>
          </form>
        </div>
      }
    }
  `,
})
export class FlotaComponent {
  readonly store = inject(DemoStore);
  readonly pestana = signal<Pestana>('vendedores');
  private readonly empresaId = computed(() => this.store.empresaId() ?? '');

  readonly vendedores = computed(() => {
    const s = this.store.state();
    return vendedoresDe(s, this.empresaId()).map((v) => {
      const estado = cuentaVendedor(s, v.id)?.estado ?? 'sin_cargas';
      return {
        ...v,
        llave: v.llave?.valor ?? '',
        placas: s.vehiculos.filter((x) => x.vendedorId === v.id).map((x) => x.placa),
        conductores: s.conductores.filter((x) => x.vendedorId === v.id).map((x) => x.nombre),
        estado,
        estadoLabel: ESTADO_VENDEDOR_LABEL[estado],
      };
    });
  });

  readonly camiones = computed(() => {
    const s = this.store.state();
    return s.vehiculos
      .filter((v) => v.empresaId === this.empresaId())
      .map((v) => ({
        ...v,
        dueno: vendedorNombre(s, v.vendedorId),
        conductores: s.conductores.filter((c) => c.vehiculoId === v.id).map((c) => c.nombre),
      }));
  });

  readonly conductores = computed(() => {
    const s = this.store.state();
    return s.conductores
      .filter((c) => c.empresaId === this.empresaId())
      .map((c) => ({ ...c, vendedor: vendedorNombre(s, c.vendedorId), placa: placaDe(s, c.vehiculoId) }));
  });

  readonly pestanas = [
    { id: 'vendedores' as const, label: 'Vendedores', count: () => this.vendedores().length },
    { id: 'camiones' as const, label: 'Camiones', count: () => this.camiones().length },
    { id: 'conductores' as const, label: 'Conductores', count: () => this.conductores().length },
  ];

  vNombre = '';
  vContacto = '';
  vTipo: TipoLlave = 'alfanumerica';
  vLlave = '';
  cPlaca = '';
  cDueno = '';
  readonly kVendedor = signal('');
  kEsElVendedor = false;
  kNombre = '';
  kCamion = '';
  readonly errorVendedor = signal<string | null>(null);
  readonly errorCamion = signal<string | null>(null);
  readonly errorConductor = signal<string | null>(null);

  readonly camionesDelVendedor = computed(() => this.camiones().filter((c) => c.vendedorId === this.kVendedor()));

  elegirVendedor(id: string): void {
    this.kVendedor.set(id);
    this.kCamion = this.camionesDelVendedor()[0]?.id ?? '';
  }

  crearVendedor(): void {
    const r = this.store.exec((sim) =>
      sim.crearVendedor(this.empresaId(), { nombre: this.vNombre, contacto: this.vContacto, llaveTipo: this.vTipo, llave: this.vLlave })
    );
    this.errorVendedor.set(r.ok ? null : r.error);
    if (r.ok) {
      this.vNombre = this.vContacto = this.vLlave = '';
    }
  }

  crearCamion(): void {
    const r = this.store.exec((sim) => sim.crearVehiculo(this.empresaId(), { placa: this.cPlaca, vendedorId: this.cDueno }));
    this.errorCamion.set(r.ok ? null : r.error);
    if (r.ok) {
      this.cPlaca = '';
    }
  }

  crearConductor(): void {
    const r = this.store.exec((sim) =>
      sim.crearConductor(this.empresaId(), {
        vendedorId: this.kVendedor(),
        esElVendedor: this.kEsElVendedor,
        nombre: this.kNombre,
        vehiculoId: this.kCamion,
      })
    );
    this.errorConductor.set(r.ok ? null : r.error);
    if (r.ok) {
      this.kNombre = '';
      this.kEsElVendedor = false;
    }
  }
}
