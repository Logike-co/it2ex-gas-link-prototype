import { computed, inject, Injectable, InjectionToken, signal } from '@angular/core';
import { AccessAction, can, canView, ViewId } from '../access/access';
import { Clock, SystemClock } from '../simulation/clock';
import { Simulator } from '../simulation/engine';
import { DemoState, Empresa, Perfil, PerfilUsuario, Result, SCHEMA_VERSION, Usuario } from '../simulation/model';
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

  /** Perfil activo con su alcance de datos (empresa, vendedor, conductor). */
  readonly perfilActivo = computed<PerfilUsuario | null>(() => {
    const u = this.usuario();
    return u?.perfiles.find((p) => p.perfil === this.state().sesion.perfil) ?? null;
  });

  readonly perfil = computed<Perfil | null>(() => this.perfilActivo()?.perfil ?? null);

  /** La empresa activa sale de la sesión, nunca de la URL (§1.4, RN-01). */
  readonly empresaId = computed<string | null>(() => this.perfilActivo()?.empresaId ?? null);

  readonly empresa = computed<Empresa | null>(() => this.state().empresas.find((e) => e.id === this.empresaId()) ?? null);

  can(action: AccessAction): boolean {
    return can(this.perfil(), action);
  }

  canView(view: ViewId): boolean {
    return canView(this.perfil(), view);
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

  iniciarSesion(usuarioId: string, perfil?: Perfil): Result<{ usuario: Usuario; perfil: PerfilUsuario }> {
    return this.run((sim) => sim.iniciarSesion(usuarioId, perfil));
  }

  cerrarSesion(): void {
    this.run((sim) => sim.cerrarSesion());
  }

  /**
   * «Reiniciar demo» (§5.7, SUP-21): un clic, sin diálogo. Vuelve a la semilla; la sesión
   * sigue si su usuario y su perfil existen en la semilla. Devuelve si la sesión se conservó.
   */
  reset(): boolean {
    const seed = buildSeed(this.clock);
    const { usuarioId, perfil } = this.state().sesion;
    const user = seed.usuarios.find((u) => u.id === usuarioId);
    const kept = !!user && user.perfiles.some((p) => p.perfil === perfil);
    if (kept) {
      seed.sesion = { usuarioId, perfil };
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

  private loadOrSeed(): DemoState {
    try {
      const raw = localStorage.getItem(STATE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as DemoState;
        if (parsed.schemaVersion === SCHEMA_VERSION && Array.isArray(parsed.empresas)) {
          return parsed;
        }
      }
    } catch {
      // Estado corrupto o almacenamiento bloqueado: se usa la semilla.
    }
    return buildSeed(this.clock);
  }
}
