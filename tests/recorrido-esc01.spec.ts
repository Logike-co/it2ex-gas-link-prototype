import { expect, test } from '@playwright/test';
import { aviso, cambiarA, DISCLAIMER, entrarComo, limpio } from './helpers';

/**
 * E49 · Recorrido completo de ESC-01 (flow-map §6.2): cargue → venta con QR → registro de
 * montos → cuenta del vendedor → conciliación, con los valores de control en cada paso.
 */
test('ESC-01: de la carga a la cuenta en ceros, coherente entre pantallas', async ({ page }) => {
  await limpio(page);
  await expect(page.getByTestId('leyenda-demo')).toHaveText(DISCLAIMER);

  // Paso 0 · administrador: dos empresas con la configuración completa.
  await entrarComo(page, 'andrea.admin');
  await expect(page).toHaveURL(/\/admin\/empresas$/);
  await expect(page.getByTestId('config-EMP-A')).toHaveText('Configuración completa');
  await expect(page.getByTestId('config-EMP-B')).toHaveText('Configuración completa');
  await expect(page.getByTestId('total-empresas')).toHaveText('2 empresas');

  // Paso 1 · empresa: catálogo y flota.
  await entrarComo(page, 'paula.condor');
  await expect(page).toHaveURL(/\/empresa\/cargue$/);
  await page.getByTestId('nav-V03').click();
  await expect(page.getByTestId('valor-P100')).toHaveValue('170000');
  await expect(page.getByTestId('llave-actual')).toHaveText('@gascondor.demo');
  await page.getByTestId('nav-V04').click();
  await expect(page.getByTestId('vendedor-VEN-A1')).toContainText('GLK 101');
  await expect(page.getByTestId('vendedor-VEN-A1')).toContainText('Sin cargas');

  // Paso 2 · cargue (E15).
  await page.getByTestId('nav-V05').click();
  await page.getByTestId('cargue-vendedor').selectOption('VEN-A1');
  await expect(page.getByTestId('cargue-camion')).toHaveValue('VEH-A1');
  await expect(page.getByTestId('cargue-conductor')).toHaveValue('CDT-A1');
  await page.getByTestId('cargue-P100').fill('2');
  await page.getByTestId('cargue-P40').fill('8');
  await expect(page.getByTestId('preview-peso')).toHaveText('235,6 kg');
  await expect(page.getByTestId('preview-valor')).toHaveText('$ 1.000.000');
  await page.getByTestId('registrar-carga').click();
  await aviso(page, 'Carga CAR-A-004 registrada: $ 1.000.000 · 235,6 kg');
  await expect(page.getByTestId('estado-CAR-A-004')).toHaveText('Pendiente');

  // Paso 3 · conductor: venta con precio libre (E02, E18).
  await entrarComo(page, 'ramiro.cardenas', 'conductor');
  await expect(page).toHaveURL(/\/conductor\/venta$/);
  await expect(page.getByTestId('mi-camion-placa')).toHaveText('Mi camión: GLK 101');
  await expect(page.getByTestId('quedan-P100')).toHaveText('2');
  await expect(page.getByTestId('quedan-P40')).toHaveText('8');
  await page.getByTestId('mas-P100').click();
  for (let i = 0; i < 6; i++) {
    await page.getByTestId('mas-P40').click();
  }
  await page.getByTestId('valor-venta').fill('750000');
  await expect(page.getByTestId('registrar-venta')).toHaveText('Registrar venta');
  await page.getByTestId('registrar-venta').click();

  // Paso 4 · cobro con QR (E22).
  await expect(page).toHaveURL(/\/conductor\/cobro\?venta=VTA-A-004$/);
  await page.getByTestId('opcion-qr-ambos').click();
  await page.getByTestId('monto-qr-empresa').fill('300000');
  await page.getByTestId('monto-qr-vendedor').fill('150000');
  await expect(page.getByTestId('resto-efectivo')).toHaveText('Resto en efectivo: $ 300.000');
  await expect(page.getByTestId('qr-empresa').getByTestId('qr-texto')).toHaveText('@gascondor.demo · $ 300.000');
  await expect(page.getByTestId('qr-vendedor').getByTestId('qr-texto')).toHaveText('@ramiro.demo · $ 150.000');
  await expect(page.getByTestId('qr-marca')).toHaveText(['MUESTRA · NO PAGAR', 'MUESTRA · NO PAGAR']);
  await page.getByTestId('registrar-recibido').click();

  // Paso 5 · registro de montos (E25).
  await expect(page).toHaveURL(/\/conductor\/montos\?venta=VTA-A-004$/);
  await expect(page.getByTestId('monto-0')).toHaveValue('300000');
  await expect(page.getByTestId('monto-1')).toHaveValue('150000');
  await expect(page.getByTestId('monto-2')).toHaveValue('300000');
  await page.getByTestId('referencia-0').fill('BRB-DEMO-1001');
  await page.getByTestId('referencia-1').fill('BRB-DEMO-1002');
  await page.getByTestId('guardar-cobros').click();
  await expect(page).toHaveURL(/\/conductor\/venta$/);
  await aviso(page, 'Venta VTA-A-004 cobrada');
  await expect(page.getByTestId('estado-venta-VTA-A-004')).toHaveText('Cobrada');
  await expect(page.getByTestId('quedan-P100')).toHaveText('1');
  await expect(page.getByTestId('quedan-P40')).toHaveText('2');

  // Paso 6 · cuenta del vendedor e informe (E29, E37).
  await cambiarA(page, 'usr-ramiro|vendedor', /\/cuenta$/);
  await expect(page.getByTestId('resumen-cargado')).toHaveText('$ 1.000.000');
  await expect(page.getByTestId('resumen-abonado')).toHaveText('$ 300.000');
  await expect(page.getByTestId('resumen-saldo')).toHaveText('$ 700.000');
  await expect(page.getByTestId('resumen-en-poder')).toContainText('Dinero en tu poder: $ 450.000 (efectivo $ 300.000 · tu llave $ 150.000)');
  await expect(page.getByTestId('estado-CAR-A-004')).toHaveText('Con saldo');
  await expect(page.getByTestId('abonado-CAR-A-004')).toHaveText('$ 300.000');
  await expect(page.getByTestId('selector-vendedor')).toHaveCount(0);
  await expect(page.getByTestId('registrar-pago')).toHaveCount(0);
  await page.getByTestId('btn-informe').click();
  await expect(page.getByTestId('informe-leyenda')).toHaveText(DISCLAIMER);
  await expect(page.getByTestId('informe-vendedor')).toHaveText('Ramiro Cárdenas');
  await expect(page.getByTestId('informe-saldo')).toHaveText('$ 700.000');
  await page.getByTestId('cerrar-informe').click();

  // Paso 7a · conciliación y «Llegó» (E38, E39).
  await entrarComo(page, 'paula.condor');
  await page.goto('/empresa/conciliacion?vendedor=VEN-A1');
  await expect(page.getByTestId('vendido-VEN-A1')).toHaveText('$ 1.000.000');
  await expect(page.getByTestId('pagado-VEN-A1')).toHaveText('$ 300.000');
  await expect(page.getByTestId('porconfirmar-VEN-A1')).toHaveText('$ 300.000');
  await expect(page.getByTestId('pendiente-VEN-A1')).toHaveText('$ 700.000');
  await expect(page.getByTestId('enpoder-VEN-A1')).toHaveText('$ 450.000');
  const ref = page.getByTestId('ref-COB-A-005');
  for (const t of ['BRB-DEMO-1001', 'GLK 101', 'Ramiro Cárdenas', 'VTA-A-004', '$ 300.000', 'Por confirmar']) {
    await expect(ref).toContainText(t);
  }
  await page.getByTestId('llego-COB-A-005').click();
  await expect(page.getByTestId('estado-ref-COB-A-005')).toHaveText('Confirmado');
  await expect(page.getByTestId('confirmado-VEN-A1')).toHaveText('$ 300.000');
  await expect(page.getByTestId('porconfirmar-VEN-A1')).toHaveText('$ 0');
  await expect(page.getByTestId('pendiente-VEN-A1')).toHaveText('$ 700.000');

  // Paso 7b · pago por transferencia (E40).
  await page.getByTestId('pago-monto').fill('500000');
  await page.getByTestId('pago-referencia').fill('TRF-DEMO-1001');
  await page.getByTestId('registrar-pago').click();
  await expect(page.getByTestId('ultimo-pago')).toContainText('PAG-A-002');
  await expect(page.getByTestId('ultimo-pago')).toContainText('Aplicado: CAR-A-004 $ 500.000');
  await expect(page.getByTestId('pendiente-VEN-A1')).toHaveText('$ 200.000');

  // Paso 7c · pagar la diferencia (E42).
  await page.getByTestId('pagar-saldo').click();
  await expect(page.getByTestId('pago-monto')).toHaveValue('200000');
  await page.getByTestId('forma-acuerdo').click();
  await page.getByTestId('pago-detalle').fill('Efectivo entregado en la bodega');
  await page.getByTestId('registrar-pago').click();
  await expect(page.getByTestId('ultimo-pago')).toContainText('PAG-A-003 registrado por $ 200.000');
  await expect(page.getByTestId('pendiente-VEN-A1')).toHaveText('$ 0');
  await expect(page.getByTestId('estado-VEN-A1')).toHaveText('Al día');
  await expect(page.getByTestId('total-vendido')).toHaveText('$ 2.330.000');
  await expect(page.getByTestId('total-pagado')).toHaveText('$ 1.330.000');
  await expect(page.getByTestId('total-pendiente')).toHaveText('$ 1.000.000');

  // La cuenta de Ramiro, vista por la empresa, cuadra con la conciliación.
  await page.getByTestId('ver-cuenta').click();
  await expect(page).toHaveURL(/\/cuenta\?vendedor=VEN-A1$/);
  await expect(page.getByTestId('estado-CAR-A-004')).toHaveText('Saldada');
  await expect(page.getByTestId('resumen-saldo')).toHaveText('$ 0');
  await expect(page.getByTestId('resumen-estado')).toHaveText('Al día');
  await expect(page.getByTestId('resumen-en-poder')).toContainText('$ 450.000');
});

test('E44 y E46: reinicio en un clic y cambio rápido de perfil', async ({ page }) => {
  await limpio(page);
  await entrarComo(page, 'paula.condor');
  await page.getByTestId('cargue-vendedor').selectOption('VEN-A1');
  await page.getByTestId('cargue-P40').fill('1');
  await page.getByTestId('registrar-carga').click();
  await aviso(page, 'CAR-A-004');

  await page.getByTestId('btn-reiniciar').click();
  await aviso(page, 'Demo reiniciada a los datos de ejemplo');
  await expect(page.getByTestId('carga-CAR-A-004')).toHaveCount(0);
  await expect(page.getByTestId('usuario-sesion')).toHaveText('Paula Méndez');

  await cambiarA(page, 'usr-ramiro|conductor', /\/conductor\/venta$/);
  await expect(page.getByTestId('perfil-sesion')).toHaveText('conductor');
  await expect(page.getByTestId('sin-cargas')).toHaveText('Tu camión no tiene cargas. Pídele a la empresa que registre el cargue');
  await expect(page.getByTestId('registrar-venta')).toBeDisabled();
});
