import { expect, test } from '@playwright/test';
import { abrirGuia, aviso, entrarComo, limpio, menu } from './helpers';

/**
 * Avisos que sobreviven solo a la navegación que los trae (SUP-28), menú ☰ como diálogo modal en
 * el celular (E67), reinicio desde una pantalla creada en vivo y validaciones de V34 y V35 que
 * se ven en la pantalla (E24, E28).
 */

test('SUP-28: el aviso del formulario hijo llega al padre aunque su pantalla tarde más de 2 s en cargar', async ({ page }) => {
  await limpio(page);
  // La pantalla del detalle del cargue no llega hasta que la prueba la suelte (también su precarga).
  let soltar: () => void = () => undefined;
  const retenida = new Promise<void>((r) => (soltar = r));
  await page.route('**/carga-detalle.component-*.js', async (route) => {
    await retenida;
    await route.continue().catch(() => undefined);
  });

  await entrarComo(page, 'paula.condor');
  await page.getByTestId('nuevo-cargue').click();
  await page.getByTestId('cargue-vendedor').selectOption('VEN-A1');
  await page.getByTestId('cargue-P40').fill('1');
  await page.getByTestId('registrar-carga').click();
  await page.waitForTimeout(2_500);
  soltar();

  await expect(page).toHaveURL(/\/empresa\/cargues\/CAR-A-004$/);
  await expect(page.getByTestId('carga-detalle-id')).toBeVisible();
  await aviso(page, 'Carga CAR-A-004 registrada');
});

test('un aviso no se arrastra a la pantalla que se abre por el menú', async ({ page }) => {
  await limpio(page);
  await entrarComo(page, 'jorge.ceiba');
  await menu(page, 'V22');
  await page.getByTestId('ver-VEN-B1').click();
  await expect(page).toHaveURL(/\/empresa\/conciliacion\/VEN-B1$/);
  await page.getByTestId('llego-COB-B-001').click();
  await expect(page.getByTestId('aviso')).toBeVisible();
  await menu(page, 'V16');
  await expect(page).toHaveURL(/\/empresa\/cargues$/);
  await expect(page.getByTestId('aviso')).toHaveCount(0);
});

test('E67: en el celular el menú ☰ es un diálogo modal: foco, Tab atrapado, Esc, Atrás y cambio de ancho', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 640 });
  await limpio(page);
  await entrarComo(page, 'ramiro.cardenas');
  const nav = page.getByTestId('menu');
  const boton = page.getByTestId('btn-menu');

  // Al abrir, el foco va al primer enlace y el menú es un diálogo modal.
  await boton.click();
  await expect(nav).toHaveAttribute('role', 'dialog');
  await expect(nav).toHaveAttribute('aria-modal', 'true');
  await expect(page.getByTestId('nav-V26')).toBeFocused();

  // Tab y Mayús+Tab no salen del menú.
  await page.keyboard.press('Shift+Tab');
  await expect(page.getByTestId('nav-V32')).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByTestId('nav-V26')).toBeFocused();
  for (let i = 0; i < 6; i++) {
    await page.keyboard.press('Tab');
  }
  await expect(page.getByTestId('nav-V26')).toBeFocused();

  // Esc cierra y devuelve el foco al ☰.
  await page.keyboard.press('Escape');
  await expect(nav).toHaveCount(0);
  await expect(boton).toBeFocused();

  // El botón Atrás del navegador también lo cierra.
  await menu(page, 'V30');
  await expect(page).toHaveURL(/\/conductor\/camion$/);
  await boton.click();
  await expect(nav).toBeVisible();
  await page.goBack();
  await expect(page).toHaveURL(/\/vendedor\/cuenta$/);
  await expect(nav).toHaveCount(0);

  // En escritorio es una columna (sin rol de diálogo); al pasar a angosto se cierra sola.
  await page.setViewportSize({ width: 1366, height: 900 });
  await expect(nav).toBeVisible();
  await expect(nav).not.toHaveAttribute('role', 'dialog');
  await expect(nav).not.toHaveAttribute('aria-modal', 'true');
  await page.setViewportSize({ width: 360, height: 640 });
  await expect(nav).toHaveCount(0);
});

test('reiniciar en una venta creada en vivo abre la pantalla de inicio, sin el aviso de parámetro ajeno', async ({ page }) => {
  await limpio(page);
  await entrarComo(page, 'yesid.navarro');
  await menu(page, 'V31');
  await page.getByTestId('mas-P30').click();
  await page.getByTestId('valor-venta').fill('75000');
  await page.getByTestId('registrar-venta').click();
  await expect(page).toHaveURL(/\/conductor\/ventas\/VTA-A-004$/);

  await abrirGuia(page);
  await page.getByTestId('guia-reiniciar').click();
  await expect(page).toHaveURL(/\/conductor\/camion$/);
  await aviso(page, 'Demo reiniciada a los datos de ejemplo');
  await expect(page.getByTestId('param-ajeno')).toHaveCount(0);
  await expect(page.getByTestId('guia-paso-num')).toContainText('· 1 de ');
});

test('E24: el reparto del QR no puede superar el valor de la venta', async ({ page }) => {
  await limpio(page);
  await entrarComo(page, 'wilson.ortega');
  await menu(page, 'V31');
  await page.getByTestId('mas-P100').click();
  await page.getByTestId('valor-venta').fill('750000');
  await page.getByTestId('registrar-venta').click();
  await expect(page).toHaveURL(/\/conductor\/ventas\/VTA-A-004$/);
  await page.getByTestId('cobrar-qr').click();

  await page.getByTestId('opcion-qr-ambos').click();
  await page.getByTestId('monto-qr-empresa').fill('500000');
  await page.getByTestId('monto-qr-vendedor').fill('300000');
  await expect(page.getByTestId('error-reparto')).toHaveText('El reparto supera el valor de la venta en $ 50.000');
  await expect(page.getByTestId('qrs')).toHaveCount(0);
  await expect(page.getByTestId('registrar-recibido')).toBeDisabled();

  // Dentro del valor, los QR vuelven.
  await page.getByTestId('monto-qr-vendedor').fill('250000');
  await expect(page.getByTestId('error-reparto')).toHaveCount(0);
  await expect(page.getByTestId('qrs')).toBeVisible();
});

test('E28: registrar más de lo que vale la venta avisa sin bloquear; con cobros previos, frente a lo que falta', async ({ page }) => {
  await limpio(page);
  await entrarComo(page, 'yesid.navarro');
  await menu(page, 'V31');
  await page.getByTestId('mas-P30').click();
  await page.getByTestId('valor-venta').fill('75000');
  await page.getByTestId('registrar-venta').click();
  await expect(page).toHaveURL(/\/conductor\/ventas\/VTA-A-004$/);
  await page.getByTestId('registrar-montos').click();

  await expect(page).toHaveURL(/\/conductor\/ventas\/VTA-A-004\/montos$/);
  await expect(page.getByTestId('monto-0')).toHaveValue('75000');
  await page.getByTestId('monto-0').fill('80000');
  await expect(page.getByTestId('aviso-exceso')).toHaveText('Registraste $ 5.000 más que el valor de la venta');
  await page.getByTestId('guardar-cobros').click();
  await expect(page).toHaveURL(/\/conductor\/ventas\/VTA-A-004$/);
  await expect(page.getByTestId('estado-venta')).toHaveText('Cobrada · excede en $ 5.000');

  // Con cobros ya registrados, el aviso compara contra lo que falta por cobrar.
  await page.goto('/conductor/ventas/VTA-A-004/montos');
  await page.getByTestId('monto-0').fill('1000');
  await expect(page.getByTestId('aviso-exceso')).toHaveText('Registraste $ 1.000 más de lo que falta por cobrar');
});
