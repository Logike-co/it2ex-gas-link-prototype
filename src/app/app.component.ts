import { Component, computed, effect, HostListener, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { DISCLAIMER } from './brand';
import { ViewId } from './core/access/access';
import { perfilesTexto } from './core/simulation/selectors';
import { DemoStore, Flash } from './core/state/demo.store';
import { DemoHudComponent } from './demo/demo-hud.component';
import { DemoModeStore } from './demo/demo-mode.store';
import { ViewTraceComponent } from './demo/view-trace.component';
import { CodeTextComponent } from './shared/code-text.component';
import { menuViewOf, pathOf } from './views';

/** Pantalla angosta (celular): el menú ☰ es un overlay que se cierra al navegar. */
const PANTALLA_ANGOSTA = '(max-width: 767px)';
const esAngosta = (): boolean => typeof window !== 'undefined' && !!window.matchMedia?.(PANTALLA_ANGOSTA).matches;

/**
 * Shell de la demo (flow-map §1.2 y §1.6): banda fija con la leyenda obligatoria; barra
 * superior del producto (☰ · logo · empresa y usuario · «Guía» · «Salir»), sin controles del
 * demo (E66: esos viven en la guía); menú ☰ con las secciones del usuario (R-15). En escritorio
 * el menú es una columna plegable, abierta por defecto; en el celular es un overlay que se
 * cierra al elegir una opción, con Esc o al tocar fuera (E67). El patrón del ☰ viene del
 * simulador IT2Pay (`btn-menu`, `menuOpen`, cierre en pantallas angostas).
 */
@Component({
  selector: 'app-root',
  imports: [CodeTextComponent, RouterOutlet, RouterLink, DemoHudComponent, ViewTraceComponent],
  templateUrl: './app.component.html',
})
export class AppComponent {
  readonly store = inject(DemoStore);
  readonly demo = inject(DemoModeStore);
  private readonly router = inject(Router);
  readonly disclaimer = DISCLAIMER;

  readonly usuario = this.store.usuario;
  readonly empresa = this.store.empresa;
  readonly menu = this.store.menu;
  readonly perfiles = computed(() => {
    const u = this.usuario();
    return u ? perfilesTexto(u) : '';
  });

  /** Opción del menú que se marca: la de la pantalla abierta o la de su padre (§1.2, E51). */
  readonly opcionActiva = computed(() => menuViewOf(this.demo.currentView()));

  /** Menú ☰: abierto por defecto en escritorio, cerrado en el celular; vuelve a ese estado tras cada ingreso. */
  readonly menuOpen = signal(!esAngosta());

  private flashAt = 0;
  /** Aviso que el efecto ya registró; si el actual es otro, lo acaba de publicar la acción que navegó. */
  private flashVisto: Flash | null = null;

  constructor() {
    // Tras cada ingreso (también al cambiar de usuario desde la guía) el menú vuelve a su estado por defecto.
    let ultimo: string | null | undefined;
    effect(() => {
      const id = this.store.usuario()?.id ?? null;
      if (id !== ultimo) {
        if (id) {
          this.menuOpen.set(!esAngosta());
        }
        ultimo = id;
      }
    });
    // Un aviso se descarta al cambiar de pantalla, salvo que lo haya producido la acción que navegó.
    // Si la pantalla de destino ya estaba cargada, la navegación termina antes de que corra el
    // efecto: un aviso que el efecto aún no registró es nuevo y se conserva (SUP-28: el aviso
    // de un formulario hijo se ve en su padre).
    effect(() => {
      this.flashVisto = this.store.flash();
      this.flashAt = Date.now();
    });
    this.router.events.subscribe((e) => {
      if (e instanceof NavigationEnd) {
        const actual = this.store.flash();
        if (actual !== null && actual === this.flashVisto && Date.now() - this.flashAt > 1500) {
          this.store.flash.set(null);
        }
      }
    });
  }

  path(view: ViewId): string {
    return '/' + pathOf(view);
  }

  toggleMenu(): void {
    this.menuOpen.update((v) => !v);
  }

  /** En pantallas angostas el menú se cierra al elegir una opción; en escritorio se queda abierto. */
  cerrarMenuEnCelular(): void {
    if (esAngosta()) {
      this.menuOpen.set(false);
    }
  }

  salir(): void {
    this.store.cerrarSesion();
    this.router.navigateByUrl('/ingreso');
  }

  /** Esc cierra el menú cuando es un overlay (celular). */
  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.cerrarMenuEnCelular();
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
