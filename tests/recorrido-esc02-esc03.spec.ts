import { expect, test } from '@playwright/test';
import { aviso, entrarComo, limpio, menu } from './helpers';

/**
 * Recorridos de ESC-02 (flow-map §6.3, cuenta corriente y aplicación de pagos) y ESC-03 (§6.4,
 * excepciones y aislamiento) con sus valores de control. Cada uno parte de la semilla: tocan a
 * Transportes Lucero y no se encadenan.
 */

test('ESC-02: pago a la carga más antigua, cobro a la carga de origen y pago partido entre dos cargas', async ({ page }) => {
  await limpio(page);

  // Paso 1 · Doris: su cuenta antes de los pagos.
  await entrarComo(page, 'doris.lucero');
  await expect(page).toHaveURL(/\/vendedor\/cuenta$/);
  await expect(page.getByTestId('resumen-cargado')).toHaveText('$ 1.000.000');
  await expect(page.getByTestId('resumen-saldo')).toHaveText('$ 1.000.000');
  await expect(page.getByTestId('saldo-CAR-A-002')).toHaveText('$ 600.000');
  await expect(page.getByTestId('saldo-CAR-A-003')).toHaveText('$ 400.000');
  await expect(page.getByTestId('estado-CAR-A-002')).toHaveText('Pendiente');
  await expect(page.getByTestId('estado-CAR-A-003')).toHaveText('Pendiente');
  await expect(page.getByTestId('resumen-en-poder')).toContainText('$ 390.000');

  // Paso 2 · Paula: transferencia de $ 500.000 → a la carga más antigua.
  await entrarComo(page, 'paula.condor');
  await menu(page, 'V22');
  await page.getByTestId('ver-VEN-A2').click();
  await expect(page).toHaveURL(/\/empresa\/conciliacion\/VEN-A2$/);
  await page.getByTestId('ir-registrar-pago').click();
  await expect(page).toHaveURL(/\/empresa\/pagos\/nuevo\?vendedor=VEN-A2$/);
  await page.getByTestId('pago-monto').fill('500000');
  await page.getByTestId('pago-referencia').fill('TRF-DEMO-2001');
  await page.getByTestId('registrar-pago').click();
  await expect(page).toHaveURL(/\/empresa\/conciliacion\/VEN-A2$/);
  await aviso(page, 'Aplicado: CAR-A-002 $ 500.000');
  await page.getByTestId('ir-registrar-pago').click();
  await expect(page.getByTestId('pago-pendiente')).toContainText('CAR-A-002 $ 100.000 · CAR-A-003 $ 400.000');

  // Paso 3 · Yesid: venta de 1 × 30 lb por $ 75.000 cobrada a la llave de la empresa.
  await entrarComo(page, 'yesid.navarro');
  await menu(page, 'V31');
  await page.getByTestId('mas-P30').click();
  await page.getByTestId('valor-venta').fill('75000');
  await page.getByTestId('registrar-venta').click();
  await expect(page).toHaveURL(/\/conductor\/ventas\/VTA-A-004$/);
  await page.getByTestId('cobrar-qr').click();
  await page.getByTestId('opcion-qr-empresa').click();
  await expect(page.getByTestId('monto-qr-empresa')).toHaveValue('75000');
  await expect(page.getByTestId('qr-empresa').getByTestId('qr-texto')).toHaveText('@gascondor.demo · $ 75.000');
  await page.getByTestId('registrar-recibido').click();
  await expect(page).toHaveURL(/\/conductor\/ventas\/VTA-A-004\/montos$/);
  await expect(page.getByTestId('medio-0-llave_empresa')).toHaveAttribute('aria-checked', 'true');
  await expect(page.getByTestId('monto-0')).toHaveValue('75000');
  await page.getByTestId('referencia-0').fill('BRB-DEMO-3001');
  await page.getByTestId('guardar-cobros').click();
  await expect(page).toHaveURL(/\/conductor\/ventas\/VTA-A-004$/);
  await aviso(page, 'Venta VTA-A-004 cobrada');
  await expect(page.getByTestId('estado-venta')).toHaveText('Cobrada');
  await expect(page.getByTestId('quedan-P30')).toHaveText('0');

  // Paso 4 · Doris: el cobro se aplica a su carga de origen (CAR-A-003).
  await entrarComo(page, 'doris.lucero');
  await expect(page.getByTestId('resumen-saldo')).toHaveText('$ 425.000');
  await expect(page.getByTestId('saldo-CAR-A-002')).toHaveText('$ 100.000');
  await page.getByTestId('abrir-CAR-A-003').click();
  await expect(page).toHaveURL(/\/vendedor\/cargas\/CAR-A-003$/);
  await expect(page.getByTestId('aplicacion-COB-A-005')).toContainText('origen');
  await expect(page.getByTestId('aplicacion-COB-A-005')).toContainText('$ 75.000');
  await expect(page.getByTestId('carga-detalle-saldo')).toHaveText('$ 325.000');

  // Paso 5 · Paula: transferencia de $ 250.000 partida entre las dos cargas.
  await entrarComo(page, 'paula.condor');
  await menu(page, 'V22');
  await page.getByTestId('ver-VEN-A2').click();
  await page.getByTestId('ir-registrar-pago').click();
  await page.getByTestId('pago-monto').fill('250000');
  await page.getByTestId('pago-referencia').fill('TRF-DEMO-2002');
  await page.getByTestId('registrar-pago').click();
  await expect(page).toHaveURL(/\/empresa\/conciliacion\/VEN-A2$/);
  await aviso(page, 'Aplicado: CAR-A-002 $ 100.000 · CAR-A-003 $ 150.000');
  await page.getByTestId('ver-cuenta').click();
  await expect(page).toHaveURL(/\/empresa\/cuentas\/VEN-A2$/);
  await expect(page.getByTestId('estado-CAR-A-002')).toHaveText('Saldada');
  await expect(page.getByTestId('saldo-CAR-A-003')).toHaveText('$ 175.000');
  await expect(page.getByTestId('resumen-saldo')).toHaveText('$ 175.000');

  // Paso 6 · Paula: pagar el saldo deja a Transportes Lucero al día.
  await page.getByTestId('ir-registrar-pago').click();
  await expect(page).toHaveURL(/\/empresa\/pagos\/nuevo\?vendedor=VEN-A2$/);
  await page.getByTestId('pagar-saldo').click();
  await expect(page.getByTestId('pago-monto')).toHaveValue('175000');
  await page.getByTestId('pago-referencia').fill('TRF-DEMO-2003');
  await page.getByTestId('registrar-pago').click();
  await expect(page).toHaveURL(/\/empresa\/conciliacion\/VEN-A2$/);
  await expect(page.getByTestId('pendiente-VEN-A2')).toHaveText('$ 0');
  await expect(page.getByTestId('estado-VEN-A2')).toHaveText('Al día');
});

test('ESC-03: avisos que no bloquean, errores que sí, usuario sin permiso y aislamiento (E43)', async ({ page }) => {
  await limpio(page);

  // Paso 1 · Wilson vende de más: avisa pero no bloquea.
  await entrarComo(page, 'wilson.ortega');
  await menu(page, 'V31');
  await page.getByTestId('mas-P100').click();
  await page.getByTestId('mas-P100').click();
  await expect(page.getByTestId('aviso-existencias')).toHaveText('Quedan 1 de 100 lb en tu camión; vas a registrar 2');
  await page.getByTestId('valor-venta').fill('400000');
  await expect(page.getByTestId('registrar-venta')).toHaveText('Registrar de todas formas');
  await page.getByTestId('registrar-venta').click();
  await expect(page).toHaveURL(/\/conductor\/ventas\/VTA-A-004$/);
  await expect(page.getByTestId('quedan-P100')).toHaveText('-1');
  await menu(page, 'V30');
  await expect(page.getByTestId('carga-camion-CAR-A-002')).toContainText('Sobrevendida');

  // Paso 2 · cobro a la llave de la empresa: monto 0 bloquea; sin referencia pide confirmación.
  await page.goto('/conductor/ventas/VTA-A-004');
  await page.getByTestId('cobrar-qr').click();
  await page.getByTestId('opcion-qr-empresa').click();
  await expect(page.getByTestId('monto-qr-empresa')).toHaveValue('400000');
  await page.getByTestId('registrar-recibido').click();
  await expect(page).toHaveURL(/\/conductor\/ventas\/VTA-A-004\/montos$/);
  await page.getByTestId('monto-0').fill('0');
  await page.getByTestId('guardar-cobros').click();
  await expect(page.getByTestId('error-montos')).toHaveText('El monto debe ser mayor que cero');
  await page.getByTestId('monto-0').fill('400000');
  await page.getByTestId('guardar-cobros').click();
  await expect(page.getByTestId('confirmar-sin-referencia')).toContainText('Sin referencia, la empresa no podrá cuadrar este pago.');
  await page.getByTestId('guardar-sin-referencia').click();
  await expect(page).toHaveURL(/\/conductor\/ventas\/VTA-A-004$/);
  await expect(page.getByTestId('cobro-COB-A-005')).toContainText('Sin referencia');

  // Paso 3 · Wilson no puede abrir la conciliación: vuelve a su inicio con el aviso.
  await page.goto('/empresa/conciliacion');
  await expect(page).toHaveURL(/\/conductor\/camion$/);
  await aviso(page, 'Tu perfil no tiene acceso a esa pantalla');

  // Paso 4 · Paula: alerta «1 cobro sin referencia» (E43) y los errores del pago.
  await entrarComo(page, 'paula.condor');
  await menu(page, 'V22');
  await expect(page.getByTestId('alerta-VEN-A2')).toHaveText('1 cobro sin referencia');
  await expect(page.getByTestId('pendiente-VEN-A2')).toHaveText('$ 600.000');
  await expect(page.getByTestId('alerta-VEN-A1')).toHaveCount(0);
  await page.getByTestId('ver-VEN-A2').click();
  await expect(page).toHaveURL(/\/empresa\/conciliacion\/VEN-A2$/);
  await expect(page.getByTestId('alerta-VEN-A2')).toHaveText('1 cobro sin referencia');
  const ref = page.getByTestId('ref-COB-A-005');
  await expect(ref.getByTestId('sin-referencia')).toHaveText('Sin referencia');
  await expect(page.getByTestId('estado-ref-COB-A-005')).toHaveText('Por confirmar');
  await page.getByTestId('ir-registrar-pago').click();
  await expect(page.getByTestId('pago-pendiente')).toContainText('CAR-A-002 $ 200.000 · CAR-A-003 $ 400.000');
  await page.getByTestId('pago-monto').fill('700000');
  await page.getByTestId('pago-referencia').fill('TRF-DEMO-9');
  await page.getByTestId('registrar-pago').click();
  await expect(page.getByTestId('error-pago')).toHaveText('El pago supera lo que debe el vendedor ($ 600.000)');
  await page.getByTestId('pago-monto').fill('100000');
  await page.getByTestId('pago-referencia').fill('');
  await page.getByTestId('registrar-pago').click();
  await expect(page.getByTestId('error-pago')).toHaveText('Escribe la referencia de la transferencia');

  // Paso 5 · un vendedor de la otra empresa no existe para Gas Cóndor Demo.
  await page.goto('/empresa/cuentas/VEN-B1');
  await expect(page.getByTestId('param-ajeno-texto')).toHaveText('Ese vendedor no existe en Gas Cóndor Demo');

  // Paso 6 · Jorge solo ve Gas Ceiba Demo.
  await entrarComo(page, 'jorge.ceiba');
  await menu(page, 'V22');
  await expect(page).toHaveURL(/\/empresa\/conciliacion$/);
  const filas = page.getByTestId('tabla-conciliacion').locator('[data-testid^="fila-"]');
  await expect(filas).toHaveCount(2);
  await expect(page.getByTestId('fila-VEN-B1')).toContainText('Hernán Rojas');
  await expect(page.getByTestId('fila-VEN-B2')).toContainText('Distribuciones El Trébol');
  await expect(page.getByTestId('total-vendido')).toHaveText('$ 1.195.000');
  await expect(page.getByTestId('total-pagado')).toHaveText('$ 175.000');
  await expect(page.getByTestId('total-pendiente')).toHaveText('$ 1.020.000');
  await expect(page.locator('main')).not.toContainText('Gas Cóndor');
});
