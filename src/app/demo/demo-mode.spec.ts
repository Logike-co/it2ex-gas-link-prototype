import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { routes } from '../app.routes';
import { FixedClock } from '../core/simulation/clock';
import { DemoStore, SIM_CLOCK } from '../core/state/demo.store';
import { VIEW_ACCESS } from '../core/access/access';
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

describe('Modo presentador (§8, D02)', () => {
  it('los guiones usan usuarios de la semilla con un perfil que tiene la vista del paso', () => {
    const { store } = setup();
    for (const p of PRESETS) {
      for (const s of p.steps) {
        const u = store.state().usuarios.find((x) => x.id === s.user);
        expect(u?.perfiles.some((x) => x.perfil === s.perfil)).toBe(true);
        expect(VIEW_ACCESS[s.view]).toContain(s.perfil);
        for (const i of s.items) expect(ITEMS[i]).toBeDefined();
      }
    }
    expect(PRESETS.map((p) => p.id)).toEqual(['ESC-01', 'ESC-02', 'ESC-03']);
  });

  it('E45: elegir un escenario reinicia la demo y deja la guía en su paso 1 con «Ingresar como…»', async () => {
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

  it('«Ingresar como…» entra con el usuario y el perfil del paso', async () => {
    const { demo, store, router } = setup();
    demo.applyPreset('ESC-01');
    demo.goTo(3);
    demo.signInAs();
    await new Promise((r) => setTimeout(r, 0));
    expect(store.state().sesion).toEqual({ usuarioId: 'usr-ramiro', perfil: 'conductor' });
    expect(demo.needsSwitch()).toBe(false);
    expect(router.url).toBe('/conductor/venta');
  });

  it('la guía sigue a la pantalla y la trazabilidad cubre las 10 vistas', () => {
    const steps = PRESETS[0].steps;
    expect(stepForView(steps, 0, 'V05')).toBe(2);
    expect(stepForView(steps, 8, 'V10')).toBe(8);
    expect(stepForView(steps, 0, 'V04')).toBe(-1);
    expect(Object.keys(VIEW_TRACE)).toHaveLength(10);
    expect(VIEW_TRACE.V07.items).toEqual(['F06', 'F06b']);
  });
});
