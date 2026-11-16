import { expect, Page, test } from '@playwright/test';
import { DISCLAIMER, entrarComo, limpio } from './helpers';

/**
 * ALC-04 · Pantallas del conductor en el celular (E47, E48): sin desplazamiento horizontal,
 * botones y campos de al menos 44 px de alto, acción principal visible o fija abajo y QR de al
 * menos 240 × 240 px.
 */

const sinScrollHorizontal = async (page: Page) => {
  const [scroll, ancho] = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
  expect(scroll).toBeLessThanOrEqual(ancho);
};

/** Botones y campos de texto de la pantalla (las casillas de verificación no cuentan). */
const controlesAltos = async (page: Page) => {
  const bajos = await page.evaluate(() =>
    [...document.querySelectorAll('main button, main input:not([type="checkbox"]), main select, main a.btn, header button, header select')]
      .filter((el) => (el as HTMLElement).offsetParent !== null)
      .map((el) => ({ id: el.getAttribute('data-testid') ?? el.textContent?.trim(), h: el.getBoundingClientRect().height }))
      .filter((x) => x.h < 44)
  );
  expect(bajos).toEqual([]);
};

const accionVisible = async (page: Page, testId: string) => {
  const box = await page.getByTestId(testId).boundingBox();
  const vh = page.viewportSize()?.height ?? 0;
  expect(box).not.toBeNull();
  expect((box?.y ?? 0) + (box?.height ?? 0)).toBeLessThanOrEqual(vh);
};

for (const ancho of [375, 360]) {
  test(`E47 y E48: el conductor vende, cobra con QR y registra montos a ${ancho} px`, async ({ page }) => {
    await page.setViewportSize({ width: ancho, height: 640 });
    await limpio(page);
    await entrarComo(page, 'wilson.ortega');

    // V06 · Mi camión y nueva venta: vender de más avisa pero no bloquea (E19).
    await expect(page).toHaveURL(/\/conductor\/venta$/);
    await expect(page.getByTestId('leyenda-demo')).toHaveText(DISCLAIMER);
    await sinScrollHorizontal(page);
    await controlesAltos(page);
    await accionVisible(page, 'registrar-venta');
    await expect(page.getByTestId('quedan-P100')).toHaveText('1');
    await page.getByTestId('mas-P100').click();
    await page.getByTestId('mas-P100').click();
    await expect(page.getByTestId('aviso-existencias')).toHaveText('Quedan 1 de 100 lb en tu camión; vas a registrar 2');
    await page.getByTestId('valor-venta').fill('400000');
    await expect(page.getByTestId('registrar-venta')).toHaveText('Registrar de todas formas');
    await page.getByTestId('registrar-venta').click();

    // V07 · Cobro con QR: un solo QR grande.
    await expect(page).toHaveURL(/\/conductor\/cobro\?venta=VTA-A-004$/);
    await sinScrollHorizontal(page);
    await controlesAltos(page);
    await accionVisible(page, 'registrar-recibido');
    await page.getByTestId('opcion-qr-empresa').click();
    await expect(page.getByTestId('monto-qr-empresa')).toHaveValue('400000');
    const qr = await page.getByTestId('qr-empresa').getByTestId('qr-imagen').locator('svg').boundingBox();
    expect(qr?.width ?? 0).toBeGreaterThanOrEqual(240);
    expect(qr?.height ?? 0).toBeGreaterThanOrEqual(240);
    await expect(page.getByTestId('qr-marca')).toHaveText('MUESTRA · NO PAGAR');
    await sinScrollHorizontal(page);
    await page.getByTestId('registrar-recibido').click();

    // V08 · Registro de montos: monto en cero bloquea (E26); sin referencia pide confirmación (E27).
    await expect(page).toHaveURL(/\/conductor\/montos\?venta=VTA-A-004$/);
    await sinScrollHorizontal(page);
    await controlesAltos(page);
    await accionVisible(page, 'guardar-cobros');
    await page.getByTestId('monto-0').fill('0');
    await page.getByTestId('guardar-cobros').click();
    await expect(page.getByTestId('error-montos')).toHaveText('El monto debe ser mayor que cero');
    await page.getByTestId('monto-0').fill('400000');
    await page.getByTestId('guardar-cobros').click();
    await expect(page.getByTestId('confirmar-sin-referencia')).toContainText(
      'Sin referencia, la empresa no podrá cuadrar este pago. ¿Guardar de todas formas?'
    );
    await page.getByTestId('guardar-sin-referencia').click();
    await expect(page).toHaveURL(/\/conductor\/venta$/);
    await expect(page.getByTestId('estado-venta-VTA-A-004')).toHaveText('Cobrada');
    await expect(page.getByTestId('quedan-P100')).toHaveText('-1');
    await sinScrollHorizontal(page);
  });
}
