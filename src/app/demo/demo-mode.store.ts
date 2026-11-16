import { computed, inject, Injectable, signal } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { ViewId } from '../core/access/access';
import { DemoStore } from '../core/state/demo.store';
import { viewOfUrl } from '../views';
import { DemoPreset, presetById, PresetId, PRESETS, stepForView } from './demo-script';

/** Preferencias del presentador (flow-map §8): no se borran al reiniciar la demo. */
export const PREFS_KEY = 'gaslink-demo:v1:guia';

interface DemoPrefs {
  hudOpen: boolean;
  showTrace: boolean;
  preset: PresetId;
  step: number;
}

const DEFAULT_PREFS: DemoPrefs = { hudOpen: false, showTrace: false, preset: 'ESC-01', step: 0 };

/**
 * Modo presentador (§8, workflow T §1.4): la guía es el único lugar de los controles del demo
 * (cambio de usuario, escenarios precargados, reinicio en un clic y trazabilidad). Los datos de
 * la demo siguen en `DemoStore`; aquí solo viven las preferencias de quien presenta.
 */
@Injectable({ providedIn: 'root' })
export class DemoModeStore {
  private readonly store = inject(DemoStore);
  private readonly router = inject(Router);

  private readonly initial = this.load();
  readonly hudOpen = signal(this.initial.hudOpen);
  readonly showTrace = signal(this.initial.showTrace);
  readonly presetId = signal<PresetId>(this.initial.preset);
  readonly stepIndex = signal(this.initial.step);

  /** Pantalla activa según la ruta; null fuera de las 35. */
  readonly currentView = signal<ViewId | null>(null);

  readonly presets = PRESETS;
  readonly preset = computed<DemoPreset>(() => presetById(this.presetId()));
  readonly step = computed(() => {
    const steps = this.preset().steps;
    return steps[Math.min(this.stepIndex(), steps.length - 1)];
  });
  readonly stepUser = computed(() => this.store.state().usuarios.find((u) => u.id === this.step().user) ?? null);
  /** El paso es de otro usuario: la guía ofrece «Ingresar como…» (solo compara el usuario, E68). */
  readonly needsSwitch = computed(() => this.store.state().sesion.usuarioId !== this.step().user);

  constructor() {
    this.router.events.subscribe((e) => {
      if (e instanceof NavigationEnd) {
        const view = viewOfUrl(e.urlAfterRedirects);
        this.currentView.set(view);
        this.followView(view);
      }
    });
  }

  /** La guía sigue a la pantalla: al navegar, pasa al paso del guion que usa esa pantalla. */
  private followView(view: ViewId | null): void {
    if (view === null) return;
    const steps = this.preset().steps;
    const current = Math.min(this.stepIndex(), steps.length - 1);
    const target = stepForView(steps, current, view);
    if (target >= 0 && target !== current) {
      this.stepIndex.set(target);
      this.save();
    }
  }

  toggleHud(): void {
    this.hudOpen.update((v) => !v);
    this.save();
  }

  toggleTrace(): void {
    this.showTrace.update((v) => !v);
    this.save();
  }

  /** E45: elegir un escenario reinicia la demo a la semilla y deja la guía en su paso 1. */
  applyPreset(id: PresetId): void {
    this.presetId.set(id);
    this.stepIndex.set(0);
    this.hudOpen.set(true);
    this.save();
    this.resetData();
  }

  /** «Reiniciar demo» (§8): un clic, sin diálogo; la guía vuelve al paso 1 del escenario activo. */
  quickReset(): void {
    this.stepIndex.set(0);
    this.save();
    this.resetData();
  }

  private resetData(): void {
    const kept = this.store.reset();
    if (!kept) {
      this.router.navigateByUrl('/ingreso');
    }
  }

  /**
   * «Cambiar de usuario» (§8.1, E46): cambia la sesión sin pasar por el ingreso y abre la
   * pantalla de inicio del usuario. Un usuario inactivo no entra (SUP-23, E58).
   */
  cambiarUsuario(usuarioId: string): boolean {
    const r = this.store.iniciarSesion(usuarioId);
    if (!r.ok) {
      this.store.flash.set({ kind: 'error', text: r.error });
      return false;
    }
    this.store.flash.set(null);
    this.router.navigateByUrl(this.store.inicio());
    return true;
  }

  /** «Ingresar como…»: entra con el usuario del paso y abre la pantalla del paso (si la puede ver). */
  signInAs(userId = this.step().user, route = this.step().route): void {
    const r = this.store.iniciarSesion(userId);
    if (!r.ok) {
      this.store.flash.set({ kind: 'error', text: r.error });
      return;
    }
    this.store.flash.set(null);
    const view = viewOfUrl('/' + route);
    this.router.navigateByUrl(view && this.store.canView(view) ? '/' + route : this.store.inicio());
  }

  goTo(index: number): void {
    const steps = this.preset().steps;
    const i = Math.max(0, Math.min(index, steps.length - 1));
    this.stepIndex.set(i);
    this.save();
    // Solo navega si el paso es del usuario activo; si no, la guía ofrece «Ingresar como…».
    if (!this.needsSwitch() && this.store.canView(steps[i].view)) {
      this.router.navigateByUrl('/' + steps[i].route);
    }
  }

  next(): void {
    this.goTo(this.stepIndex() + 1);
  }

  previous(): void {
    this.goTo(this.stepIndex() - 1);
  }

  private save(): void {
    const prefs: DemoPrefs = { hudOpen: this.hudOpen(), showTrace: this.showTrace(), preset: this.presetId(), step: this.stepIndex() };
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
    } catch {
      // Sin almacenamiento local: las preferencias viven solo en memoria.
    }
  }

  private load(): DemoPrefs {
    try {
      const raw = localStorage.getItem(PREFS_KEY);
      if (raw) {
        const p = JSON.parse(raw) as Partial<DemoPrefs>;
        return {
          hudOpen: p.hudOpen === true,
          showTrace: p.showTrace === true,
          preset: PRESETS.some((x) => x.id === p.preset) ? (p.preset as PresetId) : DEFAULT_PREFS.preset,
          step: Number.isInteger(p.step) && (p.step as number) >= 0 ? (p.step as number) : 0,
        };
      }
    } catch {
      // Preferencias corruptas o almacenamiento bloqueado: valores por defecto.
    }
    return { ...DEFAULT_PREFS };
  }
}
