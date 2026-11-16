import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { routes } from '../app.routes';
import { canView, VIEW_IDS } from '../core/access/access';
import { FixedClock } from '../core/simulation/clock';
import { USUARIO_INACTIVO } from '../core/simulation/engine';
import { DemoStore, SIM_CLOCK } from '../core/state/demo.store';
import { viewOfUrl } from '../views';
import { DemoModeStore, PREFS_KEY } from './demo-mode.store';
import { PRESETS, stepForView } from './demo-script';
import { ITEMS, VIEW_TRACE } from './traceability';

const setup = () => {
  localStorage.clear();
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [provideRouter(routes), { provide: SIM_CLOCK, useValue: new FixedClock(new Date(2026, 10, 18, 9, 0)) }],
  });
  return { demo: TestBed.inject(DemoModeStore), store: TestBed.inject(DemoStore), router: TestBed.inject(Router) };
};

const tick = () => new Promise((r) => setTimeout(r, 0));

describe('Guía del presentador (§8, D02)', () => {
  it('los guiones usan usuarios de la semilla que pueden ver las pantallas del paso, con rutas v2', () => {
    const { store } = setup();
    for (const p of PRESETS) {
      for (const s of p.steps) {
        const u = store.state().usuarios.find((x) => x.id === s.user);
        expect(u).toBeDefined();
        const perfiles = u?.perfiles.map((x) => x.perfil) ?? [];
        for (const v of [s.view, ...(s.also ?? [])]) {
          expect(canView(perfiles, v)).toBe(true);
        }
        expect(viewOfUrl('/' + s.route)).toBe(s.view);
        for (const i of s.items) expect(ITEMS[i]).toBeDefined();
        expect(Object.keys(s)).not.toContain('perfil');
      }
    }
    expect(PRESETS.map((p) => p.id)).toEqual(['ESC-01', 'ESC-02', 'ESC-03']);
  });

  it('E45: elegir un escenario reinicia la demo y deja la guía en su paso 1 con «Ingresar como…»', () => {
    const { demo, store } = setup();
    store.iniciarSesion('usr-paula');
    store.exec((sim) => sim.registrarPago('EMP-A', 'usr-paula', { vendedorId: 'VEN-A2', forma: 'transferencia', monto: 1000, referencia: 'R', detalle: '' }));
    demo.applyPreset('ESC-02');
    expect(store.state().pagos).toHaveLength(1);
    expect(demo.stepIndex()).toBe(0);
    expect(demo.hudOpen()).toBe(true);
    expect(demo.step().user).toBe('usr-doris');
    expect(demo.needsSwitch()).toBe(true);
    expect(JSON.parse(localStorage.getItem(PREFS_KEY) ?? '{}').preset).toBe('ESC-02');
  });

  it('E68: «Ingresar como…» entra con el usuario del paso; el paso siguiente del mismo usuario ofrece «Ir a la pantalla»', async () => {
    const { demo, store, router } = setup();
    demo.applyPreset('ESC-01');
    store.iniciarSesion('usr-paula');
    demo.goTo(3);
    expect(demo.needsSwitch()).toBe(true);
    demo.signInAs();
    await tick();
    expect(store.state().sesion).toEqual({ usuarioId: 'usr-ramiro' });
    expect(router.url).toBe('/conductor/ventas/nueva');
    expect(demo.stepIndex()).toBe(3);
    demo.goTo(4);
    expect(demo.needsSwitch()).toBe(false);
  });

  it('E46 y E58: «Cambiar de usuario» abre el inicio del usuario; un inactivo no cambia la sesión', async () => {
    const { demo, store, router } = setup();
    store.iniciarSesion('usr-paula');
    expect(demo.cambiarUsuario('usr-ramiro')).toBe(true);
    await tick();
    expect(router.url).toBe('/vendedor/cuenta');
    expect(store.menu().map((s) => s.seccion)).toEqual(['Mi cuenta', 'Venta en calle']);

    store.exec((sim) => sim.cambiarEstadoUsuario('usr-wilson', false));
    expect(demo.cambiarUsuario('usr-wilson')).toBe(false);
    expect(store.flash()).toEqual({ kind: 'error', text: USUARIO_INACTIVO });
    expect(store.usuario()?.id).toBe('usr-ramiro');

    demo.applyPreset('ESC-03');
    store.exec((sim) => sim.cambiarEstadoUsuario('usr-wilson', false));
    demo.signInAs();
    expect(store.flash()?.text).toBe(USUARIO_INACTIVO);
    expect(store.usuario()?.id).toBe('usr-ramiro');
  });

  it('la guía sigue a la pantalla (también en las que recorre el paso) y la trazabilidad cubre las 35', () => {
    const steps = PRESETS[0].steps;
    expect(stepForView(steps, 0, 'V16')).toBe(2);
    expect(stepForView(steps, 0, 'V17')).toBe(2);
    expect(stepForView(steps, 3, 'V33')).toBe(3);
    expect(stepForView(steps, 4, 'V35')).toBe(5);
    expect(stepForView(steps, 8, 'V25')).toBe(8);
    expect(stepForView(steps, 0, 'V12')).toBe(-1);
    expect(Object.keys(VIEW_TRACE).sort()).toEqual([...VIEW_IDS].sort());
    expect(VIEW_TRACE.V34.items).toEqual(['F06', 'F06b']);
    expect(VIEW_TRACE.V05.rules).toEqual(['R-14']);
  });
});
