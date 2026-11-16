import { afterNextRender, Component, computed, DestroyRef, effect, ElementRef, HostListener, inject, Injector, signal, viewChild } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { DISCLAIMER } from './brand';
import { ViewId } from './core/access/access';
import { perfilesTexto } from './core/simulation/selectors';
import { DemoStore } from './core/state/demo.store';
import { DemoHudComponent } from './demo/demo-hud.component';
import { DemoModeStore } from './demo/demo-mode.store';
import { ViewTraceComponent } from './demo/view-trace.component';
import { CodeTextComponent } from './shared/code-text.component';
import { menuViewOf, pathOf } from './views';

/** Pantalla angosta (celular): el menú ☰ es un overlay que se cierra al navegar. */
const PANTALLA_ANGOSTA = '(max-width: 767px)';
const consultaAngosta = (): MediaQueryList | null => (typeof window !== 'undefined' && window.matchMedia?.(PANTALLA_ANGOSTA)) || null;

/**
 * Shell de la demo (flow-map §1.2 y §1.6): banda fija con la leyenda obligatoria; barra
 * superior del producto (☰ · logo · empresa y usuario · «Guía» · «Salir»), sin controles del
 * demo (E66: esos viven en la guía); menú ☰ con las secciones del usuario (R-15). En escritorio
 * el menú es una columna plegable, abierta por defecto; en el celular es un overlay que se
 * cierra al elegir una opción, al navegar (también con el botón Atrás), con Esc o al tocar
 * fuera (E67). Como overlay es un diálogo modal: recibe el foco al abrirse, lo retiene mientras
 * está abierto y, con Esc, lo devuelve al ☰. El patrón del ☰ viene del simulador IT2Pay
 * (`btn-menu`, `menuOpen`, cierre en pantallas angostas).
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

  /** Pantalla angosta (celular): el menú ☰ es un overlay modal. Sigue los cambios de tamaño. */
  readonly angosta = signal(consultaAngosta()?.matches ?? false);

  /** Menú ☰: abierto por defecto en escritorio, cerrado en el celular; vuelve a ese estado tras cada ingreso. */
  readonly menuOpen = signal(!this.angosta());

  private readonly injector = inject(Injector);
  private readonly btnMenu = viewChild<ElementRef<HTMLButtonElement>>('btnMenu');
  private readonly menuNav = viewChild<ElementRef<HTMLElement>>('menuNav');

  constructor() {
    // Tras cada ingreso (también al cambiar de usuario desde la guía) el menú vuelve a su estado por defecto.
    let ultimo: string | null | undefined;
    effect(() => {
      const id = this.store.usuario()?.id ?? null;
      if (id !== ultimo) {
        if (id) {
          this.menuOpen.set(!this.angosta());
        }
        ultimo = id;
      }
    });
    // Al pasar a una pantalla angosta el menú se cierra para no tapar la pantalla; al volver al
    // escritorio queda abierto, que es su estado por defecto ahí.
    const consulta = consultaAngosta();
    if (consulta) {
      const alCambiar = (e: MediaQueryListEvent) => {
        this.angosta.set(e.matches);
        this.menuOpen.set(!e.matches);
      };
      consulta.addEventListener('change', alCambiar);
      inject(DestroyRef).onDestroy(() => consulta.removeEventListener('change', alCambiar));
    }
    this.router.events.subscribe((e) => {
      if (e instanceof NavigationEnd) {
        // Un aviso solo sobrevive a la navegación que lo trae (SUP-28: el aviso de un formulario
        // hijo se ve en su padre); cualquier otra navegación lo descarta.
        this.store.descartarAvisoAjeno(this.router.currentNavigation()?.extras.info);
        // En el celular el menú se cierra con cada navegación, también con el botón Atrás.
        this.cerrarMenuEnCelular();
      }
    });
  }

  path(view: ViewId): string {
    return '/' + pathOf(view);
  }

  toggleMenu(): void {
    this.menuOpen.update((v) => !v);
    if (this.menuOpen() && this.angosta()) {
      // Como overlay, el foco pasa al primer enlace del menú.
      afterNextRender(() => this.enlacesMenu()[0]?.focus(), { injector: this.injector });
    }
  }

  /** En pantallas angostas el menú se cierra al elegir una opción; en escritorio se queda abierto. */
  cerrarMenuEnCelular(): void {
    if (this.angosta()) {
      this.menuOpen.set(false);
    }
  }

  /** Cierra el overlay (Esc o tocar fuera) y devuelve el foco al ☰. */
  cerrarOverlay(): void {
    if (this.angosta() && this.menuOpen()) {
      this.menuOpen.set(false);
      this.btnMenu()?.nativeElement.focus();
    }
  }

  /** Mientras el overlay está abierto, Tab y Mayús+Tab recorren solo los enlaces del menú. */
  @HostListener('document:keydown.tab', ['$event'])
  @HostListener('document:keydown.shift.tab', ['$event'])
  atraparFoco(event: Event): void {
    if (!(event instanceof KeyboardEvent) || !this.angosta() || !this.menuOpen()) {
      return;
    }
    const enlaces = this.enlacesMenu();
    if (enlaces.length === 0) {
      return;
    }
    const primero = enlaces[0];
    const ultimo = enlaces[enlaces.length - 1];
    const activo = document.activeElement;
    if (event.shiftKey && (activo === primero || !enlaces.includes(activo as HTMLElement))) {
      event.preventDefault();
      ultimo.focus();
    } else if (!event.shiftKey && (activo === ultimo || !enlaces.includes(activo as HTMLElement))) {
      event.preventDefault();
      primero.focus();
    }
  }

  private enlacesMenu(): HTMLElement[] {
    return [...(this.menuNav()?.nativeElement.querySelectorAll<HTMLElement>('a[href]') ?? [])];
  }

  salir(): void {
    this.store.cerrarSesion();
    this.router.navigateByUrl('/ingreso');
  }

  /** Esc cierra el menú cuando es un overlay (celular) y devuelve el foco al ☰. */
  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.cerrarOverlay();
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
