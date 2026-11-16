import { Component, computed, effect, HostListener, inject } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { HOME, MENU } from './core/access/access';
import { Perfil } from './core/simulation/model';
import { DemoStore } from './core/state/demo.store';
import { DemoHudComponent } from './demo/demo-hud.component';
import { DemoModeStore } from './demo/demo-mode.store';
import { ViewTraceComponent } from './demo/view-trace.component';
import { CodeTextComponent } from './shared/code-text.component';
import { pathOf } from './views';
import { DISCLAIMER } from './brand';


interface OpcionPerfil {
  value: string;
  label: string;
}

/**
 * Shell de la demo (flow-map §1.1): banda fija con la leyenda obligatoria, barra superior con
 * el logo, la empresa y el perfil activo, cambio rápido de perfil, «Guía», «Reiniciar demo» y
 * el menú del perfil activo (solo sus vistas, ALC-01).
 */
@Component({
  selector: 'app-root',
  imports: [CodeTextComponent, RouterOutlet, RouterLink, RouterLinkActive, DemoHudComponent, ViewTraceComponent],
  templateUrl: './app.component.html',
})
export class AppComponent {
  readonly store = inject(DemoStore);
  readonly demo = inject(DemoModeStore);
  private readonly router = inject(Router);
  readonly disclaimer = DISCLAIMER;

  readonly usuario = this.store.usuario;
  readonly perfil = this.store.perfil;
  readonly empresa = this.store.empresa;

  readonly menu = computed(() => {
    const p = this.perfil();
    return p ? MENU[p].map((m) => ({ ...m, path: pathOf(m.view) })) : [];
  });

  readonly home = computed(() => (this.perfil() ? HOME[this.perfil() as Perfil] : '/ingreso'));

  /** Todos los usuarios de la demo con cada uno de sus perfiles, agrupados por empresa (§8). */
  readonly opciones = computed(() => {
    const s = this.store.state();
    const grupos: { grupo: string; opciones: OpcionPerfil[] }[] = [
      { grupo: 'Plataforma', opciones: [] },
      ...s.empresas.map((e) => ({ grupo: e.nombre, opciones: [] as OpcionPerfil[] })),
    ];
    for (const u of s.usuarios) {
      for (const p of u.perfiles) {
        const grupo = p.empresaId ? (s.empresas.find((e) => e.id === p.empresaId)?.nombre ?? p.empresaId) : 'Plataforma';
        grupos.find((g) => g.grupo === grupo)?.opciones.push({ value: `${u.id}|${p.perfil}`, label: `${u.nombre} · ${p.perfil}` });
      }
    }
    return grupos.filter((g) => g.opciones.length > 0);
  });

  readonly seleccion = computed(() => {
    const s = this.store.state().sesion;
    return s.usuarioId ? `${s.usuarioId}|${s.perfil}` : '';
  });

  private flashAt = 0;

  constructor() {
    // Un aviso se descarta al cambiar de vista, salvo que lo haya producido la acción que navegó.
    effect(() => {
      this.store.flash();
      this.flashAt = Date.now();
    });
    this.router.events.subscribe((e) => {
      if (e instanceof NavigationEnd && Date.now() - this.flashAt > 1500) {
        this.store.flash.set(null);
      }
    });
  }

  /** Cambio rápido de perfil (E46): cambia la sesión sin pasar por el ingreso. */
  cambiarPerfil(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    if (!value) return;
    const [usuarioId, perfil] = value.split('|') as [string, Perfil];
    const r = this.store.iniciarSesion(usuarioId, perfil);
    if (r.ok) {
      this.store.flash.set(null);
      this.router.navigateByUrl(HOME[perfil]);
    }
  }

  reiniciar(): void {
    this.demo.quickReset();
  }

  salir(): void {
    this.store.cerrarSesion();
    this.router.navigateByUrl('/ingreso');
  }

  /** Atajos del presentador: `Ctrl+Shift+D` abre o cierra la guía; `Ctrl+Shift+R` reinicia. */
  @HostListener('document:keydown', ['$event'])
  onShortcut(event: KeyboardEvent): void {
    if (!event.ctrlKey || !event.shiftKey || event.altKey || event.metaKey) {
      return;
    }
    if (event.code === 'KeyD') {
      event.preventDefault();
      this.demo.toggleHud();
    } else if (event.code === 'KeyR') {
      event.preventDefault();
      this.demo.quickReset();
    }
  }
}
