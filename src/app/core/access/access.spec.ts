import { buildSeed } from '../simulation/seed';
import { FixedClock } from '../simulation/clock';
import { Perfil, PERFILES } from '../simulation/model';
import { VIEWS, viewOfUrl } from '../../views';
import { ACTION_ACCESS, can, canView, inicioDe, MENU, menuDe, VIEW_ACCESS, VIEW_IDS } from './access';

const etiquetas = (perfiles: Perfil[]): string =>
  menuDe(perfiles)
    .map((s) => `${s.seccion} › ${s.opciones.map((o) => o.label).join(', ')}`)
    .join('; ');

describe('Matriz de acceso pantalla × perfil (flow-map §1.4, ALC-01)', () => {
  it('cubre las 35 pantallas del manifiesto; cada perfil ve su menú y su inicio está en el menú', () => {
    expect(VIEW_IDS).toHaveLength(35);
    expect(Object.keys(VIEW_ACCESS).sort()).toEqual(VIEWS.map((v) => v.id).sort());
    for (const p of PERFILES) {
      const opciones = MENU[p].flatMap((s) => s.opciones);
      expect(opciones.length).toBeGreaterThan(0);
      expect(opciones.every((o) => canView([p], o.view))).toBe(true);
      expect(viewOfUrl(inicioDe([p]))).toBe(opciones[0].view);
    }
  });

  it('las pantallas hijas no están en ningún menú (§1.3, E52)', () => {
    const enMenu = new Set(PERFILES.flatMap((p) => MENU[p].flatMap((s) => s.opciones.map((o) => o.view))));
    for (const v of VIEWS) {
      expect(enMenu.has(v.id)).toBe(!v.parent && v.id !== 'V01');
    }
    expect(enMenu.size).toBe(16);
  });

  it('E50: menú por secciones con etiquetas exactas y orden administrador, empresa, vendedor, conductor (SUP-27)', () => {
    expect(etiquetas(['administrador'])).toBe('Plataforma › Empresas');
    expect(etiquetas(['empresa'])).toBe(
      'Operación › Cargues; Cartera › Cuentas de vendedores, Conciliación, Pagos de vendedores; Flota › Vendedores, Camiones, Conductores; Configuración › Catálogo de cilindros, Llave de cobro'
    );
    expect(etiquetas(['vendedor'])).toBe('Mi cuenta › Resumen, Movimientos, Informe');
    expect(etiquetas(['conductor'])).toBe('Venta en calle › Mi camión, Nueva venta, Mis ventas');
    // Ramiro y Hernán: una sola sesión con ambas secciones, en el orden de SUP-27 aunque los perfiles vengan al revés.
    expect(etiquetas(['conductor', 'vendedor'])).toBe('Mi cuenta › Resumen, Movimientos, Informe; Venta en calle › Mi camión, Nueva venta, Mis ventas');
  });

  it('SUP-24: la pantalla de inicio es la primera opción del menú, para cada usuario de la semilla', () => {
    const s = buildSeed(new FixedClock(new Date(2026, 10, 18, 9, 0)));
    const inicio = Object.fromEntries(s.usuarios.map((u) => [u.usuario, inicioDe(u.perfiles.map((p) => p.perfil))]));
    expect(inicio).toEqual({
      'andrea.admin': '/admin/empresas',
      'paula.condor': '/empresa/cargues',
      'ramiro.cardenas': '/vendedor/cuenta',
      'doris.lucero': '/vendedor/cuenta',
      'olga.pineda': '/vendedor/cuenta',
      'wilson.ortega': '/conductor/camion',
      'yesid.navarro': '/conductor/camion',
      'edna.quiroga': '/conductor/camion',
      'jorge.ceiba': '/empresa/cargues',
      'hernan.rojas': '/vendedor/cuenta',
      'marta.gil': '/vendedor/cuenta',
      'nelson.pardo': '/conductor/camion',
    });
    expect(inicioDe([])).toBe('/ingreso');
  });

  it('E04 y R-15: un usuario ve una pantalla si alguno de sus perfiles puede (unión de perfiles)', () => {
    expect(canView(['conductor'], 'V22')).toBe(false);
    expect(canView(['vendedor'], 'V16')).toBe(false);
    expect(canView(['vendedor'], 'V30')).toBe(false);
    expect(canView(['administrador'], 'V26')).toBe(false);
    expect(canView(['empresa'], 'V30')).toBe(false);
    expect(canView(['empresa'], 'V02')).toBe(false);
    expect(canView([], 'V16')).toBe(false);
    expect(canView([], 'V01')).toBe(true);
    const ramiro: Perfil[] = ['vendedor', 'conductor'];
    expect(['V26', 'V27', 'V28', 'V29', 'V30', 'V31', 'V32', 'V33', 'V34', 'V35'].every((v) => canView(ramiro, v as never))).toBe(true);
    expect(canView(ramiro, 'V16')).toBe(false);
    expect(canView(ramiro, 'V20')).toBe(false);
  });

  it('RN-14 y F01 ampliado: acciones por perfil', () => {
    expect(ACTION_ACCESS['pago.registrar']).toEqual(['empresa']);
    expect(ACTION_ACCESS['venta.registrar']).toEqual(['conductor']);
    expect(ACTION_ACCESS['cobro.registrar']).toEqual(['conductor']);
    expect(ACTION_ACCESS['usuario.crear']).toEqual(['administrador']);
    expect(ACTION_ACCESS['usuario.cambiarEstado']).toEqual(['administrador']);
    expect(can(['vendedor'], 'pago.registrar')).toBe(false);
    expect(can(['vendedor', 'conductor'], 'venta.registrar')).toBe(true);
    expect(can(['administrador'], 'empresa.crear')).toBe(true);
    expect(can(['empresa'], 'usuario.crear')).toBe(false);
  });

  it('las rutas literales ganan a las de parámetro y cada parámetro cae en su pantalla (§1.4)', () => {
    expect(viewOfUrl('/empresa/cargues/nuevo')).toBe('V17');
    expect(viewOfUrl('/empresa/cargues/CAR-A-004')).toBe('V18');
    expect(viewOfUrl('/admin/empresas/nueva')).toBe('V03');
    expect(viewOfUrl('/admin/empresas/EMP-A')).toBe('V04');
    expect(viewOfUrl('/admin/empresas/EMP-A/usuarios/nuevo')).toBe('V06');
    expect(viewOfUrl('/empresa/pagos/nuevo?vendedor=VEN-A1')).toBe('V25');
    expect(viewOfUrl('/conductor/ventas/nueva')).toBe('V31');
    expect(viewOfUrl('/conductor/ventas/VTA-A-004')).toBe('V33');
    expect(viewOfUrl('/conductor/ventas/VTA-A-004/cobro')).toBe('V34');
    expect(viewOfUrl('/empresa/cuentas/VEN-A2/informe?cargas=CAR-A-002')).toBe('V21');
    expect(viewOfUrl('/nada')).toBeNull();
  });
});
