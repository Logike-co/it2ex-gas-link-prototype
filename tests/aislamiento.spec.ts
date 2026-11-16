import { expect, test } from '@playwright/test';
import { entrarComo, limpio } from './helpers';

/** ALC-01 y ALC-02: cada perfil ve solo su menú y ninguna empresa ve los datos de la otra. */
test('E08 y E09: cada empresa ve solo lo suyo, también si se manipula la URL', async ({ page }) => {
  await limpio(page);

  await entrarComo(page, 'paula.condor');
  await page.getByTestId('nav-V04').click();
  const vendedoresA = page.getByTestId('tabla-vendedores');
  for (const t of ['Ramiro Cárdenas', 'Transportes Lucero', 'Olga Pineda', 'GLK 101', 'GLK 102', 'GLK 103', 'GLK 104']) {
    await expect(vendedoresA).toContainText(t);
  }
  for (const t of ['Hernán Rojas', 'Distribuciones El Trébol', 'CBA 201']) {
    await expect(page.locator('main')).not.toContainText(t);
  }
  await page.getByTestId('nav-V10').click();
  await expect(page.getByTestId('total-vendido')).toHaveText('$ 1.330.000');
  await expect(page.getByTestId('total-pagado')).toHaveText('$ 330.000');
  await expect(page.getByTestId('total-pendiente')).toHaveText('$ 1.000.000');

  await page.goto('/cuenta?vendedor=VEN-B1');
  await expect(page.getByTestId('vendedor-ajeno')).toHaveText('Ese vendedor no existe en Gas Cóndor Demo');
  await expect(page.locator('main')).not.toContainText('Hernán');
  await expect(page.locator('main')).not.toContainText('Gas Ceiba');
  await page.goto('/empresa/conciliacion?vendedor=VEN-B1');
  await expect(page.getByTestId('vendedor-ajeno')).toHaveText('Ese vendedor no existe en Gas Cóndor Demo');

  await entrarComo(page, 'jorge.ceiba');
  await expect(page.getByTestId('empresa-sesion')).toHaveText('Gas Ceiba Demo');
  await page.getByTestId('nav-V04').click();
  const vendedoresB = page.getByTestId('tabla-vendedores');
  await expect(vendedoresB.locator('tbody tr')).toHaveCount(2);
  for (const t of ['Hernán Rojas', 'Distribuciones El Trébol', 'CBA 201', 'CBA 202']) {
    await expect(vendedoresB).toContainText(t);
  }
  await expect(page.locator('main')).not.toContainText('GLK');
  await page.getByTestId('nav-V10').click();
  await expect(page.getByTestId('total-vendido')).toHaveText('$ 1.195.000');
  await expect(page.getByTestId('total-pagado')).toHaveText('$ 175.000');
  await expect(page.getByTestId('total-pendiente')).toHaveText('$ 1.020.000');
  await expect(page.locator('main')).not.toContainText('Transportes Lucero');
});

test('E01, E04 y E05: menú por perfil, rutas ajenas y sin sesión', async ({ page }) => {
  await limpio(page);
  await page.goto('/empresa/conciliacion');
  await expect(page).toHaveURL(/\/ingreso$/);

  await entrarComo(page, 'doris.lucero');
  await expect(page).toHaveURL(/\/cuenta$/);
  await expect(page.getByTestId('menu').locator('a')).toHaveText(['Mi cuenta']);
  await page.goto('/cuenta?vendedor=VEN-A1');
  await expect(page.getByTestId('cuenta-vendedor')).toHaveText('Transportes Lucero');
  await page.goto('/empresa/cargue');
  await expect(page).toHaveURL(/\/cuenta$/);
  await expect(page.getByTestId('aviso')).toContainText('Tu perfil no tiene acceso a esa pantalla');

  await entrarComo(page, 'wilson.ortega');
  await expect(page.getByTestId('menu').locator('a')).toHaveText(['Nueva venta', 'Cobro con QR', 'Registro de montos']);
  await page.goto('/empresa/conciliacion');
  await expect(page).toHaveURL(/\/conductor\/venta$/);
  await expect(page.getByTestId('aviso')).toContainText('Tu perfil no tiene acceso a esa pantalla');

  await entrarComo(page, 'andrea.admin');
  await expect(page.getByTestId('menu').locator('a')).toHaveText(['Empresas']);
  await page.goto('/cuenta');
  await expect(page).toHaveURL(/\/admin\/empresas$/);
});
