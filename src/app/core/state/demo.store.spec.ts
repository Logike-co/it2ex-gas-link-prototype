import { TestBed } from '@angular/core/testing';
import { FixedClock } from '../simulation/clock';
import { conciliacion, cuentaVendedor } from '../simulation/selectors';
import { DemoStore, RESET_MESSAGE, SIM_CLOCK, STATE_KEY } from './demo.store';

const DEMO_DAY = new Date(2026, 10, 18, 9, 0, 0);

const createStore = (): DemoStore => {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({ providers: [{ provide: SIM_CLOCK, useValue: new FixedClock(DEMO_DAY) }] });
  return TestBed.inject(DemoStore);
};

const cargaRamiro = (store: DemoStore) =>
  store.exec((sim) =>
    sim.registrarCarga('EMP-A', 'usr-paula', { vendedorId: 'VEN-A1', vehiculoId: 'VEH-A1', conductorId: 'CDT-A1', cantidades: { P100: 2, P40: 8 } })
  );

describe('DemoStore (persistencia y reinicio, §8 y ALC-05)', () => {
  beforeEach(() => localStorage.clear());

  it('arranca con la semilla y sin sesión', () => {
    const store = createStore();
    expect(store.state().empresas.map((e) => e.id)).toEqual(['EMP-A', 'EMP-B']);
    expect(store.usuario()).toBeNull();
    expect(conciliacion(store.state(), 'EMP-A').totales.pendiente).toBe(1_000_000);
  });

  it('persiste el estado en el navegador y lo recupera al recargar', () => {
    const store = createStore();
    const r = cargaRamiro(store);
    expect(r.ok && r.value.id).toBe('CAR-A-004');
    expect(store.flash()?.text).toBe('Carga CAR-A-004 registrada: $ 1.000.000 · 235,6 kg');
    expect(JSON.parse(localStorage.getItem(STATE_KEY) ?? '{}').cargas).toHaveLength(6);
    const again = createStore();
    expect(cuentaVendedor(again.state(), 'VEN-A1')?.saldoGeneral).toBe(1_000_000);
  });

  it('un error no cambia el estado ni se publica en la barra de avisos', () => {
    const store = createStore();
    const before = store.state();
    const r = store.exec((sim) => sim.crearEmpresa({ nombre: '', ciudad: '', nombreUsuario: '', usuario: '' }));
    expect(r.ok).toBe(false);
    expect(store.state()).toBe(before);
    expect(store.flash()).toBeNull();
  });

  it('E44: reiniciar restaura la semilla en un clic y conserva la sesión si el usuario existe', () => {
    const store = createStore();
    store.iniciarSesion('usr-paula');
    cargaRamiro(store);
    store.exec((sim) => sim.crearEmpresa({ nombre: 'Gas Páramo Demo', ciudad: 'Sogamoso', nombreUsuario: 'Lina Torres', usuario: 'lina.paramo' }));
    const t0 = performance.now();
    expect(store.reset()).toBe(true);
    expect(performance.now() - t0).toBeLessThan(1000);
    const s = store.state();
    expect(s.empresas).toHaveLength(2);
    expect(s.cargas.some((c) => c.id === 'CAR-A-004')).toBe(false);
    expect(cuentaVendedor(s, 'VEN-A1')?.estado).toBe('sin_cargas');
    expect(store.flash()).toEqual({ kind: 'ok', text: RESET_MESSAGE });
    expect(store.usuario()?.id).toBe('usr-paula');
    expect(cargaRamiro(store).ok && store.state().cargas.at(-1)?.id).toBe('CAR-A-004');
  });

  it('al reiniciar, si el usuario de la sesión ya no existe, se cierra la sesión', () => {
    const store = createStore();
    store.exec((sim) => sim.crearEmpresa({ nombre: 'Gas Páramo Demo', ciudad: '', nombreUsuario: 'Lina Torres', usuario: 'lina.paramo' }));
    const lina = store.state().usuarios.find((u) => u.usuario === 'lina.paramo');
    store.iniciarSesion(lina?.id ?? '');
    expect(store.empresaId()).toBe('EMP-C');
    expect(store.reset()).toBe(false);
    expect(store.usuario()).toBeNull();
  });

  it('R-15: la sesión es del usuario con la unión de sus perfiles; empresa, vendedor y conductor salen de ellos', () => {
    const store = createStore();
    store.iniciarSesion('usr-ramiro');
    expect([store.perfiles(), store.empresaId(), store.vendedorId(), store.conductorId()]).toEqual([['vendedor', 'conductor'], 'EMP-A', 'VEN-A1', 'CDT-A1']);
    expect([store.canView('V26'), store.canView('V30'), store.canView('V16')]).toEqual([true, true, false]);
    expect([store.can('venta.registrar'), store.can('pago.registrar')]).toEqual([true, false]);
    expect(store.inicio()).toBe('/vendedor/cuenta');
    store.iniciarSesion('usr-andrea');
    expect([store.empresaId(), store.vendedorId(), store.inicio()]).toEqual([null, null, '/admin/empresas']);
  });

  it('SUP-23: un usuario inactivo no entra; al cargar, una sesión guardada de un inactivo se cierra', () => {
    const store = createStore();
    store.iniciarSesion('usr-wilson');
    store.exec((sim) => sim.cambiarEstadoUsuario('usr-wilson', false));
    const r = store.iniciarSesion('usr-wilson');
    expect(r.ok).toBe(false);
    expect(createStore().usuario()).toBeNull();
  });

  it('§8.6: un estado guardado con el esquema de la v1 (sesión con perfil) se descarta', () => {
    localStorage.setItem(STATE_KEY, JSON.stringify({ ...createStore().state(), schemaVersion: 1, sesion: { usuarioId: 'usr-ramiro', perfil: 'conductor' } }));
    const store = createStore();
    expect(store.state().schemaVersion).toBe(2);
    expect(store.usuario()).toBeNull();
    expect(store.state().usuarios.every((u) => u.activo)).toBe(true);
  });

  it('ignora un estado guardado corrupto o de otra versión y vuelve a la semilla', () => {
    localStorage.setItem(STATE_KEY, '{no es json');
    expect(createStore().state().cargas).toHaveLength(5);
    localStorage.setItem(STATE_KEY, JSON.stringify({ schemaVersion: 0, empresas: [] }));
    expect(createStore().state().empresas).toHaveLength(2);
  });

  it('funciona sin almacenamiento del navegador', () => {
    const spy = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('bloqueado');
    });
    const store = createStore();
    expect(cargaRamiro(store).ok).toBe(true);
    expect(store.state().cargas).toHaveLength(6);
    spy.mockRestore();
  });
});
