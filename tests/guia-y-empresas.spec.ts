import { expect, test } from '@playwright/test';
import { aviso, DISCLAIMER, entrarComo, limpio } from './helpers';

/** D02 · Guía del presentador con escenarios precargados (E45) y F01 · alta de empresa (E06). */
test('E45: elegir ESC-02 en la guía reinicia la demo y ofrece «Ingresar como…» del paso 1', async ({ page }) => {
  await limpio(page);
  await entrarComo(page, 'paula.condor');
  await page.getByTestId('cargue-vendedor').selectOption('VEN-A1');
  await page.getByTestId('cargue-P40').fill('1');
  await page.getByTestId('registrar-carga').click();
  await aviso(page, 'CAR-A-004');

  await page.getByTestId('btn-guia').click();
  await expect(page.getByTestId('guia-leyenda')).toHaveText(DISCLAIMER);
  await page.getByTestId('escenario-ESC-02').click();
  await aviso(page, 'Demo reiniciada a los datos de ejemplo');
  await expect(page.getByTestId('guia-paso-num')).toContainText('ESC-02 · Paso 1 · 1 de 6');
  await expect(page.getByTestId('guia-ingresar-como')).toHaveText('Ingresar como Doris Lucero');
  await page.getByTestId('guia-ingresar-como').click();
  await expect(page).toHaveURL(/\/cuenta$/);
  await expect(page.getByTestId('resumen-saldo')).toHaveText('$ 1.000.000');
  await expect(page.getByTestId('resumen-en-poder')).toContainText('$ 390.000');

  // El paso 2 es de Paula: la guía la ofrece y abre la conciliación de Transportes Lucero.
  await page.getByTestId('guia-siguiente').click();
  await page.getByTestId('guia-ingresar-como').click();
  await expect(page).toHaveURL(/\/empresa\/conciliacion\?vendedor=VEN-A2$/);
  await page.getByTestId('pago-monto').fill('500000');
  await page.getByTestId('pago-referencia').fill('TRF-DEMO-2001');
  await page.getByTestId('registrar-pago').click();
  await expect(page.getByTestId('ultimo-pago')).toContainText('Aplicado: CAR-A-002 $ 500.000');
  await expect(page.getByTestId('pago-pendiente')).toContainText('CAR-A-002 $ 100.000 · CAR-A-003 $ 400.000');
});

test('E06 y E07: el administrador da de alta una empresa con su usuario', async ({ page }) => {
  await limpio(page);
  await entrarComo(page, 'andrea.admin');
  await page.getByTestId('empresa-nombre').fill('gas condor demo');
  await page.getByTestId('empresa-persona').fill('Lina Torres');
  await page.getByTestId('empresa-usuario').fill('lina.paramo');
  await page.getByTestId('crear-empresa').click();
  await expect(page.getByTestId('error-empresa')).toHaveText('Ya existe una empresa con ese nombre');

  await page.getByTestId('empresa-nombre').fill('Gas Páramo Demo');
  await page.getByTestId('empresa-ciudad').fill('Sogamoso');
  await page.getByTestId('crear-empresa').click();
  await expect(page.getByTestId('total-empresas')).toHaveText('3 empresas');
  await expect(page.getByTestId('config-EMP-C')).toHaveText('Configuración pendiente');

  await entrarComo(page, 'lina.paramo');
  await expect(page.getByTestId('empresa-sesion')).toHaveText('Gas Páramo Demo');
  await expect(page.getByTestId('aviso-configuracion')).toBeVisible();
  await expect(page.getByTestId('cargue-P100')).toHaveValue('Sin valor unitario');
  await page.getByTestId('nav-V10').click();
  await expect(page.getByTestId('total-vendido')).toHaveText('$ 0');
});
