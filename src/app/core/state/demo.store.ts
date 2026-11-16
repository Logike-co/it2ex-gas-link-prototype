import { computed, inject, Injectable, InjectionToken, signal } from '@angular/core';
import { AccessAction, can, canView, inicioDe, menuDe, MenuSeccion, ViewId } from '../access/access';
import { Clock, SystemClock } from '../simulation/clock';
import { Simulator } from '../simulation/engine';
import { DemoState, Empresa, Perfil, Result, SCHEMA_VERSION, Usuario } from '../simulation/model';
import { empresaDeUsuario } from '../simulation/selectors';
import { buildSeed } from '../simulation/seed';

/** Reloj de la demo. Las pruebas lo sustituyen por un `FixedClock`. */
export const SIM_CLOCK = new InjectionToken<Clock>('SIM_CLOCK', {
  providedIn: 'root',
  factory: () => new SystemClock(),
});

/** Clave del estado en el navegador (flow-map §8). */
export const STATE_KEY = 'gaslink-demo:v1:estado';

export type Tone = 'ok' | 'warning' | 'error';

export interface Flash {
  kind: Tone;
  text: string;
}

export const RESET_MESSAGE = 'Demo reiniciada a los datos de ejemplo';

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

/**
 * Almacén único de la demo: estado en `signal()`, persistido en el navegador dentro de
 * `try/catch` (si el almacenamiento no está disponible, la demo arranca desde la semilla y
 * funciona igual). Todos los cambios pasan por el motor puro (`Simulator`).
 */
@Injectable({ providedIn: 'root' })
export class DemoStore {
  private readonly clock = inject(SIM_CLOCK);

  readonly state = signal<DemoState>(this.loadOrSeed());
  readonly flash = signal<Flash | null>(null);

  readonly usuario = computed<Usuario | null>(() => {
    const s = this.state();
    return s.usuarios.find((u) => u.id === s.sesion.usuarioId) ?? null;
  });

  /** R-15: la sesión tiene la unión de los perfiles del usuario. */
  readonly perfiles = computed<Perfil[]>(() => [...new Set((this.usuario()?.perfiles ?? []).map((p) => p.perfil))]);

  /** La empresa de la sesión sale de los perfiles del usuario, nunca de la URL (§1.8, RN-01, SUP-27). */
  readonly empresaId = computed<string | null>(() => empresaDeUsuario(this.usuario()));

  readonly empresa = computed<Empresa | null>(() => this.state().empresas.find((e) => e.id === this.empresaId()) ?? null);

  /** Vendedor del perfil vendedor del usuario, o null. */
  readonly vendedorId = computed<string | null>(() => this.usuario()?.perfiles.find((p) => p.perfil === 'vendedor')?.vendedorId ?? null);

  /** Conductor del perfil conductor del usuario, o null. */
  readonly conductorId = computed<string | null>(() => this.usuario()?.perfiles.find((p) => p.perfil === 'conductor')?.conductorId ?? null);

  /** Menú ☰ del usuario (R-15): secciones de sus perfiles, en orden. */
  readonly menu = computed<MenuSeccion[]>(() => menuDe(this.perfiles()));

  /** Pantalla de inicio del usuario: la primera opción del menú (SUP-24). */
  readonly inicio = computed<string>(() => inicioDe(this.perfiles()));

  can(action: AccessAction): boolean {
    return can(this.perfiles(), action);
  }

  canView(view: ViewId): boolean {
    return canView(this.perfiles(), view);
  }

  /** Ejecuta un comando del motor sobre una copia y guarda el resultado. */
  run<T>(command: (sim: Simulator) => T): T {
    const sim = new Simulator(clone(this.state()), this.clock);
    const result = command(sim);
    this.commit(sim.state);
    return result;
  }

  /**
   * Como `run`, y publica el mensaje de éxito en la barra de avisos. Un error no se publica
   * ahí: cada formulario lo muestra junto a sus campos.
   */
  exec<T>(command: (sim: Simulator) => Result<T>): Result<T> {
    const sim = new Simulator(clone(this.state()), this.clock);
    const result = command(sim);
    if (result.ok) {
      this.commit(sim.state);
    }
    this.flash.set(result.ok && result.message ? { kind: 'ok', text: result.message } : null);
    return result;
  }

  iniciarSesion(usuarioId: string): Result<Usuario> {
    return this.run((sim) => sim.iniciarSesion(usuarioId));
  }

  cerrarSesion(): void {
    this.run((sim) => sim.cerrarSesion());
  }

  /**
   * «Reiniciar demo» (§5.7, SUP-21): un clic, sin diálogo. Vuelve a la semilla; la sesión
   * sigue si su usuario existe en la semilla y está activo. Devuelve si la sesión se conservó.
   */
  reset(): boolean {
    const seed = buildSeed(this.clock);
    const { usuarioId } = this.state().sesion;
    const kept = seed.usuarios.some((u) => u.id === usuarioId && u.activo);
    if (kept) {
      seed.sesion = { usuarioId };
    }
    this.commit(seed);
    this.flash.set({ kind: 'ok', text: RESET_MESSAGE });
    return kept;
  }

  private commit(next: DemoState): void {
    this.state.set(next);
    try {
      localStorage.setItem(STATE_KEY, JSON.stringify(next));
    } catch {
      // Sin almacenamiento local: el estado vive solo en memoria.
    }
  }

  /**
   * Estado guardado o semilla. Un estado de otra versión del esquema se descarta (§8.6); si la
   * sesión guardada es de un usuario que ya no existe o está inactivo, se cierra (R-15).
   */
  private loadOrSeed(): DemoState {
    try {
      const raw = localStorage.getItem(STATE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as DemoState;
        if (parsed.schemaVersion === SCHEMA_VERSION && Array.isArray(parsed.empresas) && Array.isArray(parsed.usuarios)) {
          const id = parsed.sesion?.usuarioId ?? null;
          if (!parsed.usuarios.some((u) => u.id === id && u.activo)) {
            parsed.sesion = { usuarioId: null };
          }
          return parsed;
        }
      }
    } catch {
      // Estado corrupto o almacenamiento bloqueado: se usa la semilla.
    }
    return buildSeed(this.clock);
  }
}
