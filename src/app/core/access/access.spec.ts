import { PERFILES } from '../simulation/model';
import { VIEWS } from '../../views';
import { ACTION_ACCESS, can, canView, HOME, homeFor, MENU, VIEW_ACCESS } from './access';

describe('Matriz de acceso vista × perfil (flow-map §1.2, ALC-01)', () => {
  it('cubre las 10 vistas; cada perfil ve al menos una y su inicio está en su menú', () => {
    expect(Object.keys(VIEW_ACCESS).sort()).toEqual(VIEWS.map((v) => v.id).sort());
    for (const p of PERFILES) {
      expect(MENU[p].length).toBeGreaterThan(0);
      expect(MENU[p].every((m) => canView(p, m.view))).toBe(true);
      expect(VIEWS.find((v) => '/' + v.path === HOME[p])).toBeDefined();
    }
  });

  it('E01: el menú de cada perfil, en orden', () => {
    expect(MENU.administrador.map((m) => m.label)).toEqual(['Empresas']);
    expect(MENU.empresa.map((m) => m.label)).toEqual(['Cargue', 'Cuentas', 'Conciliación', 'Flota', 'Catálogo y llave']);
    expect(MENU.vendedor.map((m) => m.label)).toEqual(['Mi cuenta']);
    expect(MENU.conductor.map((m) => m.label)).toEqual(['Nueva venta', 'Cobro con QR', 'Registro de montos']);
    expect(PERFILES.map(homeFor)).toEqual(['/admin/empresas', '/empresa/cargue', '/cuenta', '/conductor/venta']);
  });

  it('E04: un perfil no ve pantallas ajenas', () => {
    expect(canView('conductor', 'V10')).toBe(false);
    expect(canView('vendedor', 'V05')).toBe(false);
    expect(canView('administrador', 'V09')).toBe(false);
    expect(canView('empresa', 'V06')).toBe(false);
    expect(canView('empresa', 'V02')).toBe(false);
    expect(canView(null, 'V05')).toBe(false);
    expect(canView(null, 'V01')).toBe(true);
  });

  it('RN-14: solo la empresa registra pagos; solo el conductor registra ventas y cobros', () => {
    expect(ACTION_ACCESS['pago.registrar']).toEqual(['empresa']);
    expect(ACTION_ACCESS['venta.registrar']).toEqual(['conductor']);
    expect(ACTION_ACCESS['cobro.registrar']).toEqual(['conductor']);
    expect(can('vendedor', 'pago.registrar')).toBe(false);
    expect(can('administrador', 'empresa.crear')).toBe(true);
  });
});
