import { expect, Page, test } from '@playwright/test';
import { DISCLAIMER, entrarComo, limpio, menu } from './helpers';

/**
 * ALC-04 · Pantallas del conductor en el celular (E47, E48) y menú ☰ y guía en el celular (E67):
 * sin desplazamiento horizontal, botones y campos de al menos 44 px de alto, acción principal
 * visible o fija abajo, QR de al menos 240 × 240 px, ☰ como overlay y guía como hoja inferior.
 */

const sinScrollHorizontal = async (page: Page) => {
  const [scroll, ancho] = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
  expect(scroll).toBeLessThanOrEqual(ancho);
};

/** Botones y campos visibles dentro de `scope` (las casillas de verificación no cuentan). */
const controlesAltos = async (page: Page, scope = 'main, header') => {
  const bajos = await page.evaluate(
    (sel) =>
      sel
        .split(',')
        .flatMap((s) => [...document.querySelectorAll(`${s.trim()} button, ${s.trim()} input:not([type="checkbox"]), ${s.trim()} select, ${s.trim()} a.btn`)])
        .filter((el) => (el as HTMLElement).offsetParent !== null)
        .map((el) => ({ id: el.getAttribute('data-testid') ?? el.textContent?.trim(), h: el.getBoundingClientRect().height }))
        .filter((x) => x.h < 44),
    scope
  );
  expect(bajos).toEqual([]);
};

const accionVisible = async (page: Page, testId: string) => {
  const box = await page.getByTestId(testId).boundingBox();
  const vh = page.viewportSize()?.height ?? 0;
  expect(box).not.toBeNull();
  expect((box?.y ?? 0) + (box?.height ?? 0)).toBeLessThanOrEqual(vh);
};

const revisar = async (page: Page, accion?: string) => {
  await expect(page.getByTestId('leyenda-demo')).toHaveText(DISCLAIMER);
  await sinScrollHorizontal(page);
  await controlesAltos(page);
  if (accion) await accionVisible(page, accion);
};

for (const ancho of [375, 360]) {
  test(`E47 y E48: el conductor vende, cobra con QR y registra montos a ${ancho} px`, async ({ page }) => {
    await page.setViewportSize({ width: ancho, height: 640 });
    await limpio(page);
    await entrarComo(page, 'wilson.ortega');

    // V30 · Mi camión.
    await expect(page).toHaveURL(/\/conductor\/camion$/);
    await expect(page.getByTestId('menu')).toHaveCount(0);
    await revisar(page, 'ir-nueva-venta');
    await expect(page.getByTestId('quedan-P100')).toHaveText('1');

    // V31 · Nueva venta: vender de más avisa pero no bloquea (E19).
    await page.getByTestId('ir-nueva-venta').click();
    await expect(page).toHaveURL(/\/conductor\/ventas\/nueva$/);
    await revisar(page, 'registrar-venta');
    await page.getByTestId('mas-P100').click();
    await page.getByTestId('mas-P100').click();
    await expect(page.getByTestId('aviso-existencias')).toHaveText('Quedan 1 de 100 lb en tu camión; vas a registrar 2');
    await page.getByTestId('valor-venta').fill('400000');
    await expect(page.getByTestId('registrar-venta')).toHaveText('Registrar de todas formas');
    await page.getByTestId('registrar-venta').click();

    // V33 · Detalle de la venta.
    await expect(page).toHaveURL(/\/conductor\/ventas\/VTA-A-004$/);
    await revisar(page, 'cobrar-qr');
    await expect(page.getByTestId('venta-aviso-existencias')).toBeVisible();
    await page.getByTestId('cobrar-qr').click();

    // V34 · Cobro con QR: un solo QR grande.
    await expect(page).toHaveURL(/\/conductor\/ventas\/VTA-A-004\/cobro$/);
    await revisar(page, 'registrar-recibido');
    await page.getByTestId('opcion-qr-empresa').click();
    await expect(page.getByTestId('monto-qr-empresa')).toHaveValue('400000');
    const qr = await page.getByTestId('qr-empresa').getByTestId('qr-imagen').locator('svg').boundingBox();
    expect(qr?.width ?? 0).toBeGreaterThanOrEqual(240);
    expect(qr?.height ?? 0).toBeGreaterThanOrEqual(240);
    await expect(page.getByTestId('qr-marca')).toHaveText('MUESTRA · NO PAGAR');
    await sinScrollHorizontal(page);
    await page.getByTestId('registrar-recibido').click();

    // V35 · Registro de montos: monto en cero bloquea (E26); sin referencia pide confirmación (E27).
    await expect(page).toHaveURL(/\/conductor\/ventas\/VTA-A-004\/montos$/);
    await revisar(page, 'guardar-cobros');
    await page.getByTestId('monto-0').fill('0');
    await page.getByTestId('guardar-cobros').click();
    await expect(page.getByTestId('error-montos')).toHaveText('El monto debe ser mayor que cero');
    await page.getByTestId('monto-0').fill('400000');
    await page.getByTestId('guardar-cobros').click();
    await expect(page.getByTestId('confirmar-sin-referencia')).toContainText(
      'Sin referencia, la empresa no podrá cuadrar este pago. ¿Guardar de todas formas?'
    );
    await page.getByTestId('guardar-sin-referencia').click();
    await expect(page).toHaveURL(/\/conductor\/ventas\/VTA-A-004$/);
    await expect(page.getByTestId('estado-venta')).toHaveText('Cobrada');
    await expect(page.getByTestId('quedan-P100')).toHaveText('-1');
    await revisar(page);

    // V32 · Mis ventas.
    await menu(page, 'V32');
    await expect(page).toHaveURL(/\/conductor\/ventas$/);
    await expect(page.getByTestId('estado-venta-VTA-A-004')).toHaveText('Cobrada');
    await revisar(page);
  });
}

test('E67: menú ☰ como overlay y guía como hoja inferior en el celular', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 640 });
  await limpio(page);
  await entrarComo(page, 'ramiro.cardenas');
  await expect(page).toHaveURL(/\/vendedor\/cuenta$/);
  await revisar(page);

  // El ☰ abre el menú sobre el contenido, con las dos secciones de Ramiro.
  await expect(page.getByTestId('menu')).toHaveCount(0);
  await page.getByTestId('btn-menu').click();
  await expect(page.getByTestId('btn-menu')).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByTestId('menu-fondo')).toBeVisible();
  await expect(page.getByTestId('menu-seccion-titulo')).toHaveText(['Mi cuenta', 'Venta en calle']);
  await controlesAltos(page, '[data-testid="menu"]');
  const enlaces = await page.getByTestId('menu').locator('a').evaluateAll((as) => as.map((a) => a.getBoundingClientRect().height));
  expect(Math.min(...enlaces)).toBeGreaterThanOrEqual(44);
  await sinScrollHorizontal(page);

  // Elegir una opción cierra el menú y abre la pantalla.
  await page.getByTestId('nav-V30').click();
  await expect(page).toHaveURL(/\/conductor\/camion$/);
  await expect(page.getByTestId('menu')).toHaveCount(0);
  await expect(page.getByTestId('mi-camion-placa')).toHaveText('Mi camión: GLK 101');

  // Esc y tocar fuera también lo cierran.
  await page.getByTestId('btn-menu').click();
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('menu')).toHaveCount(0);
  await page.getByTestId('btn-menu').click();
  await page.getByTestId('menu-fondo').click({ position: { x: 340, y: 600 } });
  await expect(page.getByTestId('menu')).toHaveCount(0);

  // La guía es una hoja inferior, sin desplazamiento horizontal; Esc la cierra.
  await page.getByTestId('btn-guia').click();
  const guia = page.getByTestId('guia-demo');
  await expect(guia).toBeVisible();
  const box = await guia.boundingBox();
  expect((box?.y ?? 0) + (box?.height ?? 0)).toBeLessThanOrEqual(641);
  expect(box?.height ?? 0).toBeLessThanOrEqual(640 * 0.75 + 1);
  expect(box?.width ?? 0).toBeLessThanOrEqual(360);
  await sinScrollHorizontal(page);
  const [guiaScroll, guiaAncho] = await guia.evaluate((el) => [el.scrollWidth, el.clientWidth]);
  expect(guiaScroll).toBeLessThanOrEqual(guiaAncho);
  await controlesAltos(page, '[data-testid="guia-demo"]');
  await page.keyboard.press('Escape');
  await expect(guia).toHaveCount(0);
});

/** E03 y ALC-04: las 35 pantallas a 375 px, con la leyenda, sin desplazamiento horizontal y controles de 44 px. */
test('E03: las 35 pantallas en el celular llevan la leyenda, sin desplazamiento horizontal', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 700 });
  await limpio(page);
  const pantallas: [string, string[]][] = [
    ['andrea.admin', ['/admin/empresas', '/admin/empresas/nueva', '/admin/empresas/EMP-A', '/admin/empresas/EMP-A/usuarios', '/admin/empresas/EMP-A/usuarios/nuevo']],
    [
      'paula.condor',
      [
        '/empresa/configuracion/catalogo',
        '/empresa/configuracion/llave',
        '/empresa/flota/vendedores',
        '/empresa/flota/vendedores/nuevo',
        '/empresa/flota/vendedores/VEN-A2',
        '/empresa/flota/camiones',
        '/empresa/flota/camiones/nuevo',
        '/empresa/flota/conductores',
        '/empresa/flota/conductores/nuevo?vendedor=VEN-A2',
        '/empresa/cargues',
        '/empresa/cargues/nuevo',
        '/empresa/cargues/CAR-A-002',
        '/empresa/cuentas',
        '/empresa/cuentas/VEN-A2',
        '/empresa/cuentas/VEN-A2/informe',
        '/empresa/conciliacion',
        '/empresa/conciliacion/VEN-A2',
        '/empresa/pagos',
        '/empresa/pagos/nuevo',
      ],
    ],
    ['doris.lucero', ['/vendedor/cuenta', '/vendedor/cargas/CAR-A-002', '/vendedor/movimientos', '/vendedor/informe']],
    ['yesid.navarro', ['/conductor/camion', '/conductor/ventas/nueva', '/conductor/ventas', '/conductor/ventas/VTA-A-003', '/conductor/ventas/VTA-A-003/cobro', '/conductor/ventas/VTA-A-003/montos']],
  ];
  let vistas = 1;
  await expect(page.getByTestId('leyenda-demo')).toHaveText(DISCLAIMER);
  await sinScrollHorizontal(page);
  for (const [usuario, rutas] of pantallas) {
    await entrarComo(page, usuario);
    for (const ruta of rutas) {
      await page.goto(ruta);
      expect(page.url()).toContain(ruta);
      await expect(page.getByTestId('param-ajeno')).toHaveCount(0);
      await expect(page.locator('main h1').first()).toBeVisible();
      await revisar(page);
      vistas++;
    }
  }
  expect(vistas).toBe(35);
});
