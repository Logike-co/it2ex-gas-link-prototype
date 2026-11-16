import { expect, test } from '@playwright/test';
import { entrarComo, limpio, menu, textoMenu } from './helpers';

/** ALC-01 y ALC-02: cada usuario ve solo su menú y ninguna empresa ve los datos de la otra. */
test('E08 y E09: cada empresa ve solo lo suyo, también si se manipula la URL', async ({ page }) => {
  await limpio(page);

  await entrarComo(page, 'paula.condor');
  await menu(page, 'V09');
  const vendedoresA = page.getByTestId('tabla-vendedores');
  await expect(vendedoresA.locator('tbody tr')).toHaveCount(3);
  for (const t of ['Ramiro Cárdenas', 'Transportes Lucero', 'Olga Pineda']) {
    await expect(vendedoresA).toContainText(t);
  }
  await menu(page, 'V12');
  const camionesA = page.getByTestId('tabla-camiones');
  for (const t of ['GLK 101', 'GLK 102', 'GLK 103', 'GLK 104']) {
    await expect(camionesA).toContainText(t);
  }
  for (const t of ['Hernán Rojas', 'Distribuciones El Trébol', 'CBA 201']) {
    await expect(page.locator('main')).not.toContainText(t);
  }
  await menu(page, 'V22');
  await expect(page.getByTestId('total-vendido')).toHaveText('$ 1.330.000');
  await expect(page.getByTestId('total-pagado')).toHaveText('$ 330.000');
  await expect(page.getByTestId('total-pendiente')).toHaveText('$ 1.000.000');

  await page.goto('/empresa/cuentas/VEN-B1');
  await expect(page.getByTestId('param-ajeno-texto')).toHaveText('Ese vendedor no existe en Gas Cóndor Demo');
  await expect(page.locator('main')).not.toContainText('Hernán');
  await expect(page.locator('main')).not.toContainText('Gas Ceiba');

  await entrarComo(page, 'jorge.ceiba');
  await expect(page.getByTestId('empresa-sesion')).toHaveText('Gas Ceiba Demo');
  await menu(page, 'V09');
  const vendedoresB = page.getByTestId('tabla-vendedores');
  await expect(vendedoresB.locator('tbody tr')).toHaveCount(2);
  for (const t of ['Hernán Rojas', 'Distribuciones El Trébol']) {
    await expect(vendedoresB).toContainText(t);
  }
  await menu(page, 'V12');
  await expect(page.getByTestId('tabla-camiones').locator('tbody tr')).toHaveCount(2);
  await expect(page.locator('main')).not.toContainText('GLK');
  await menu(page, 'V22');
  await expect(page.getByTestId('total-vendido')).toHaveText('$ 1.195.000');
  await expect(page.getByTestId('total-pagado')).toHaveText('$ 175.000');
  await expect(page.getByTestId('total-pendiente')).toHaveText('$ 1.020.000');
  await expect(page.locator('main')).not.toContainText('Transportes Lucero');
});

test('E64: un parámetro de ruta ajeno muestra el aviso y el enlace a su lista, sin datos', async ({ page }) => {
  await limpio(page);
  const casos: [string, string, string, string, string][] = [
    ['paula.condor', '/empresa/flota/vendedores/VEN-B1', 'Ese vendedor no existe en Gas Cóndor Demo', 'Vendedores', 'Hernán'],
    ['paula.condor', '/empresa/conciliacion/VEN-B2', 'Ese vendedor no existe en Gas Cóndor Demo', 'Conciliación', 'Trébol'],
    ['paula.condor', '/empresa/pagos/nuevo?vendedor=VEN-B1', 'Ese vendedor no existe en Gas Cóndor Demo', 'Pagos de vendedores', 'Hernán'],
    ['paula.condor', '/empresa/cargues/CAR-B-001', 'Esa carga no existe en Gas Cóndor Demo', 'Cargues', 'CBA 201'],
    ['doris.lucero', '/vendedor/cargas/CAR-A-001', 'Esa carga no está en tu cuenta', 'Resumen', 'GLK 104'],
    ['wilson.ortega', '/conductor/ventas/VTA-A-003', 'Esa venta no está entre tus ventas', 'Mis ventas', '180.000'],
    ['wilson.ortega', '/conductor/ventas/VTA-B-001/cobro', 'Esa venta no está entre tus ventas', 'Mis ventas', '420.000'],
    ['andrea.admin', '/admin/empresas/EMP-Z/usuarios', 'Esa empresa no existe', 'Empresas', 'Paula'],
  ];
  for (const [usuario, ruta, texto, enlace, dato] of casos) {
    await entrarComo(page, usuario);
    await page.goto(ruta);
    // SUP-29: no redirige; la pantalla se queda en la ruta pedida.
    expect(page.url()).toContain(ruta);
    await expect(page.getByTestId('param-ajeno-texto')).toHaveText(texto);
    await expect(page.getByTestId('param-ajeno-enlace')).toHaveText(enlace);
    await expect(page.locator('main')).not.toContainText(dato);
  }
});

test('E01, E04, E05 y E50: sin sesión, inicio y menú por usuario, rutas ajenas', async ({ page }) => {
  await limpio(page);
  await page.goto('/empresa/conciliacion');
  await expect(page).toHaveURL(/\/ingreso$/);

  const menus: [string, RegExp, string][] = [
    ['andrea.admin', /\/admin\/empresas$/, 'Plataforma › Empresas'],
    [
      'paula.condor',
      /\/empresa\/cargues$/,
      'Operación › Cargues; Cartera › Cuentas de vendedores, Conciliación, Pagos de vendedores; Flota › Vendedores, Camiones, Conductores; Configuración › Catálogo de cilindros, Llave de cobro',
    ],
    ['doris.lucero', /\/vendedor\/cuenta$/, 'Mi cuenta › Resumen, Movimientos, Informe'],
    ['yesid.navarro', /\/conductor\/camion$/, 'Venta en calle › Mi camión, Nueva venta, Mis ventas'],
    ['wilson.ortega', /\/conductor\/camion$/, 'Venta en calle › Mi camión, Nueva venta, Mis ventas'],
    ['ramiro.cardenas', /\/vendedor\/cuenta$/, 'Mi cuenta › Resumen, Movimientos, Informe; Venta en calle › Mi camión, Nueva venta, Mis ventas'],
    ['hernan.rojas', /\/vendedor\/cuenta$/, 'Mi cuenta › Resumen, Movimientos, Informe; Venta en calle › Mi camión, Nueva venta, Mis ventas'],
  ];
  for (const [usuario, inicio, texto] of menus) {
    await entrarComo(page, usuario);
    await expect(page).toHaveURL(inicio);
    expect(await textoMenu(page)).toBe(texto);
    // La primera opción es la pantalla abierta.
    await expect(page.getByTestId('menu').locator('a').first()).toHaveAttribute('aria-current', 'page');
  }

  const ajenas: [string, string, RegExp][] = [
    ['wilson.ortega', '/empresa/conciliacion', /\/conductor\/camion$/],
    ['doris.lucero', '/empresa/cargues', /\/vendedor\/cuenta$/],
    ['doris.lucero', '/conductor/camion', /\/vendedor\/cuenta$/],
    ['andrea.admin', '/vendedor/cuenta', /\/admin\/empresas$/],
    ['paula.condor', '/conductor/camion', /\/empresa\/cargues$/],
    ['paula.condor', '/admin/empresas', /\/empresa\/cargues$/],
    ['ramiro.cardenas', '/empresa/cargues', /\/vendedor\/cuenta$/],
  ];
  for (const [usuario, ruta, inicio] of ajenas) {
    await entrarComo(page, usuario);
    await page.goto(ruta);
    await expect(page).toHaveURL(inicio);
    await expect(page.getByTestId('aviso')).toContainText('Tu perfil no tiene acceso a esa pantalla');
  }

  // E36: el vendedor solo consulta su propia cuenta.
  await entrarComo(page, 'doris.lucero');
  await page.goto('/empresa/cuentas/VEN-A1');
  await expect(page).toHaveURL(/\/vendedor\/cuenta$/);
  await expect(page.getByTestId('cuenta-vendedor')).toHaveText('Transportes Lucero');
  await expect(page.getByTestId('ir-registrar-pago')).toHaveCount(0);
});

test('E51: en una pantalla hija se marca la opción del padre y se ven las migas de pan', async ({ page }) => {
  await limpio(page);
  const casos: [string, string, string, string][] = [
    ['andrea.admin', '/admin/empresas/EMP-A/usuarios', 'V02', 'Plataforma › Empresas › Gas Cóndor Demo › Usuarios'],
    ['paula.condor', '/empresa/cuentas/VEN-A2', 'V19', 'Cartera › Cuentas de vendedores › Transportes Lucero'],
    ['paula.condor', '/empresa/flota/vendedores/VEN-A1', 'V09', 'Flota › Vendedores › Ramiro Cárdenas'],
    ['doris.lucero', '/vendedor/cargas/CAR-A-003', 'V26', 'Mi cuenta › Resumen › CAR-A-003'],
  ];
  for (const [usuario, ruta, opcion, migas] of casos) {
    await entrarComo(page, usuario);
    await page.goto(ruta);
    await expect(page.getByTestId(`nav-${opcion}`)).toHaveAttribute('aria-current', 'page');
    await expect(page.getByTestId('menu').locator('[aria-current="page"]')).toHaveCount(1);
    expect((await page.getByTestId('miga').allTextContents()).map((t) => t.trim()).join(' › ')).toBe(migas);
  }
});
