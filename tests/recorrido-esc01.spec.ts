import { expect, test } from '@playwright/test';
import { abrirGuia, aviso, cambiarA, DISCLAIMER, entrarComo, limpio, menu } from './helpers';

/**
 * E49 · Recorrido completo de ESC-01 (flow-map §6.2) con las rutas v2: cargue → venta → cobro
 * con QR → registro de montos → cuenta del vendedor → conciliación y pagos, con los valores de
 * control en cada paso. Es la prueba de regresión numérica de D-T2.
 */
test('ESC-01: de la carga a la cuenta en ceros, coherente entre pantallas', async ({ page }) => {
  await limpio(page);
  await expect(page.getByTestId('leyenda-demo')).toHaveText(DISCLAIMER);

  // Paso 0 · administrador: dos empresas con la configuración completa y los usuarios de Gas Cóndor Demo.
  await entrarComo(page, 'andrea.admin');
  await expect(page).toHaveURL(/\/admin\/empresas$/);
  await expect(page.getByTestId('config-EMP-A')).toHaveText('Configuración completa');
  await expect(page.getByTestId('config-EMP-B')).toHaveText('Configuración completa');
  await expect(page.getByTestId('total-empresas')).toHaveText('2 empresas');
  await page.getByTestId('abrir-EMP-A').click();
  await page.getByTestId('ver-usuarios').click();
  await expect(page).toHaveURL(/\/admin\/empresas\/EMP-A\/usuarios$/);
  await expect(page.getByTestId('total-usuarios')).toHaveText('7 usuarios · 7 activos');

  // Paso 1 · empresa: catálogo, llave y Ramiro con GLK 101, por el menú ☰.
  await entrarComo(page, 'paula.condor');
  await expect(page).toHaveURL(/\/empresa\/cargues$/);
  await menu(page, 'V07');
  await expect(page).toHaveURL(/\/empresa\/configuracion\/catalogo$/);
  await expect(page.getByTestId('valor-P100')).toHaveValue('170000');
  await expect(page.getByTestId('valor-P40')).toHaveValue('82500');
  await menu(page, 'V08');
  await expect(page.getByTestId('llave-actual')).toHaveText('@gascondor.demo');
  await menu(page, 'V09');
  await page.getByTestId('abrir-VEN-A1').click();
  await expect(page).toHaveURL(/\/empresa\/flota\/vendedores\/VEN-A1$/);
  await expect(page.getByTestId('vendedor-camiones')).toContainText('GLK 101');
  await expect(page.getByTestId('vendedor-detalle-estado')).toHaveText('Sin cargas');

  // Paso 2 · cargue (E15): Cargues › Nuevo cargue → detalle de la carga.
  await menu(page, 'V16');
  await page.getByTestId('nuevo-cargue').click();
  await expect(page).toHaveURL(/\/empresa\/cargues\/nuevo$/);
  await page.getByTestId('cargue-vendedor').selectOption('VEN-A1');
  await expect(page.getByTestId('cargue-camion')).toHaveValue('VEH-A1');
  await expect(page.getByTestId('cargue-conductor')).toHaveValue('CDT-A1');
  await page.getByTestId('cargue-P100').fill('2');
  await page.getByTestId('cargue-P40').fill('8');
  await expect(page.getByTestId('preview-peso')).toHaveText('235,6 kg');
  await expect(page.getByTestId('preview-valor')).toHaveText('$ 1.000.000');
  await page.getByTestId('registrar-carga').click();
  await expect(page).toHaveURL(/\/empresa\/cargues\/CAR-A-004$/);
  await aviso(page, 'Carga CAR-A-004 registrada: $ 1.000.000 · 235,6 kg');
  await expect(page.getByTestId('carga-detalle-estado')).toHaveText('Pendiente');
  await expect(page.getByTestId('carga-detalle-valor')).toHaveText('$ 1.000.000');
  await expect(page.getByTestId('carga-detalle-peso')).toHaveText('235,6 kg');

  // Paso 3 · Ramiro, en la misma sesión, como conductor: venta con precio libre (E02, E18).
  await cambiarA(page, 'usr-ramiro', /\/vendedor\/cuenta$/);
  await menu(page, 'V30');
  await expect(page).toHaveURL(/\/conductor\/camion$/);
  await expect(page.getByTestId('mi-camion-placa')).toHaveText('Mi camión: GLK 101');
  await expect(page.getByTestId('quedan-P100')).toHaveText('2');
  await expect(page.getByTestId('quedan-P40')).toHaveText('8');
  await menu(page, 'V31');
  await page.getByTestId('mas-P100').click();
  for (let i = 0; i < 6; i++) {
    await page.getByTestId('mas-P40').click();
  }
  await page.getByTestId('valor-venta').fill('750000');
  await expect(page.getByTestId('registrar-venta')).toHaveText('Registrar venta');
  await page.getByTestId('registrar-venta').click();
  await expect(page).toHaveURL(/\/conductor\/ventas\/VTA-A-004$/);
  await expect(page.getByTestId('estado-venta')).toHaveText('Por cobrar');
  await expect(page.getByTestId('venta-detalle-camion')).toHaveText('GLK 101');
  await expect(page.getByTestId('venta-detalle-conductor')).toHaveText('Ramiro Cárdenas');
  await expect(page.getByTestId('quedan-P100')).toHaveText('1');
  await expect(page.getByTestId('quedan-P40')).toHaveText('2');

  // Paso 4 · cobro con QR desde la venta (E22).
  await page.getByTestId('cobrar-qr').click();
  await expect(page).toHaveURL(/\/conductor\/ventas\/VTA-A-004\/cobro$/);
  await page.getByTestId('opcion-qr-ambos').click();
  await page.getByTestId('monto-qr-empresa').fill('300000');
  await page.getByTestId('monto-qr-vendedor').fill('150000');
  await expect(page.getByTestId('resto-efectivo')).toHaveText('Resto en efectivo: $ 300.000');
  await expect(page.getByTestId('qr-empresa').getByTestId('qr-texto')).toHaveText('@gascondor.demo · $ 300.000');
  await expect(page.getByTestId('qr-vendedor').getByTestId('qr-texto')).toHaveText('@ramiro.demo · $ 150.000');
  await expect(page.getByTestId('qr-marca')).toHaveText(['MUESTRA · NO PAGAR', 'MUESTRA · NO PAGAR']);
  await page.getByTestId('registrar-recibido').click();

  // Paso 5 · registro de montos (E25) → vuelve al detalle de la venta.
  await expect(page).toHaveURL(/\/conductor\/ventas\/VTA-A-004\/montos$/);
  await expect(page.getByTestId('monto-0')).toHaveValue('300000');
  await expect(page.getByTestId('monto-1')).toHaveValue('150000');
  await expect(page.getByTestId('monto-2')).toHaveValue('300000');
  await page.getByTestId('referencia-0').fill('BRB-DEMO-1001');
  await page.getByTestId('referencia-1').fill('BRB-DEMO-1002');
  await page.getByTestId('guardar-cobros').click();
  await expect(page).toHaveURL(/\/conductor\/ventas\/VTA-A-004$/);
  await aviso(page, 'Venta VTA-A-004 cobrada');
  await expect(page.getByTestId('estado-venta')).toHaveText('Cobrada');
  await expect(page.getByTestId('venta-cobros')).toContainText('COB-A-005');
  await expect(page.getByTestId('venta-cobros')).toContainText('COB-A-007');
  await expect(page.getByTestId('cobrar-qr')).toHaveCount(0);

  // Paso 6 · Mi cuenta e informe, sin cambiar de usuario (E29, E37).
  await menu(page, 'V26');
  await expect(page).toHaveURL(/\/vendedor\/cuenta$/);
  await expect(page.getByTestId('resumen-cargado')).toHaveText('$ 1.000.000');
  await expect(page.getByTestId('resumen-abonado')).toHaveText('$ 300.000');
  await expect(page.getByTestId('resumen-saldo')).toHaveText('$ 700.000');
  await expect(page.getByTestId('resumen-en-poder')).toContainText('Dinero en tu poder: $ 450.000 (efectivo $ 300.000 · tu llave $ 150.000)');
  await expect(page.getByTestId('estado-CAR-A-004')).toHaveText('Con saldo');
  await expect(page.getByTestId('abonado-CAR-A-004')).toHaveText('$ 300.000');
  await expect(page.getByTestId('ir-registrar-pago')).toHaveCount(0);
  await menu(page, 'V29');
  await expect(page).toHaveURL(/\/vendedor\/informe$/);
  await expect(page.getByTestId('leyenda-demo')).toHaveText(DISCLAIMER);
  await expect(page.getByTestId('informe-leyenda')).toHaveText(DISCLAIMER);
  await expect(page.getByTestId('informe-vendedor')).toHaveText('Ramiro Cárdenas');
  await expect(page.getByTestId('informe-saldo')).toHaveText('$ 700.000');

  // Paso 7a · conciliación y «Llegó» (E38, E39).
  await cambiarA(page, 'usr-paula', /\/empresa\/cargues$/);
  await menu(page, 'V22');
  await expect(page.getByTestId('vendido-VEN-A1')).toHaveText('$ 1.000.000');
  await expect(page.getByTestId('pagado-VEN-A1')).toHaveText('$ 300.000');
  await expect(page.getByTestId('porconfirmar-VEN-A1')).toHaveText('$ 300.000');
  await expect(page.getByTestId('pendiente-VEN-A1')).toHaveText('$ 700.000');
  await expect(page.getByTestId('enpoder-VEN-A1')).toHaveText('$ 450.000');
  await page.getByTestId('ver-VEN-A1').click();
  await expect(page).toHaveURL(/\/empresa\/conciliacion\/VEN-A1$/);
  const ref = page.getByTestId('ref-COB-A-005');
  for (const t of ['BRB-DEMO-1001', 'GLK 101', 'Ramiro Cárdenas', 'VTA-A-004', '$ 300.000', 'Por confirmar']) {
    await expect(ref).toContainText(t);
  }
  await page.getByTestId('llego-COB-A-005').click();
  await expect(page.getByTestId('estado-ref-COB-A-005')).toHaveText('Confirmado');
  await expect(page.getByTestId('confirmado-VEN-A1')).toHaveText('$ 300.000');
  await expect(page.getByTestId('porconfirmar-VEN-A1')).toHaveText('$ 0');
  await expect(page.getByTestId('pendiente-VEN-A1')).toHaveText('$ 700.000');

  // Paso 7b · pago por transferencia con el vendedor fijo (E40, E62).
  await page.getByTestId('ir-registrar-pago').click();
  await expect(page).toHaveURL(/\/empresa\/pagos\/nuevo\?vendedor=VEN-A1$/);
  await expect(page.getByTestId('pago-vendedor-fijo')).toHaveText('Ramiro Cárdenas');
  await expect(page.getByTestId('pago-pendiente')).toContainText('$ 700.000');
  await page.getByTestId('pago-monto').fill('500000');
  await page.getByTestId('pago-referencia').fill('TRF-DEMO-1001');
  await page.getByTestId('registrar-pago').click();
  await expect(page).toHaveURL(/\/empresa\/conciliacion\/VEN-A1$/);
  await aviso(page, 'PAG-A-002');
  await aviso(page, 'Aplicado: CAR-A-004 $ 500.000');
  await expect(page.getByTestId('pendiente-VEN-A1')).toHaveText('$ 200.000');

  // Paso 7c · pagar la diferencia (E42).
  await page.getByTestId('ir-registrar-pago').click();
  await page.getByTestId('pagar-saldo').click();
  await expect(page.getByTestId('pago-monto')).toHaveValue('200000');
  await page.getByTestId('forma-acuerdo').click();
  await page.getByTestId('pago-detalle').fill('Efectivo entregado en la bodega');
  await page.getByTestId('registrar-pago').click();
  await expect(page).toHaveURL(/\/empresa\/conciliacion\/VEN-A1$/);
  await aviso(page, 'PAG-A-003 registrado por $ 200.000');
  await expect(page.getByTestId('pendiente-VEN-A1')).toHaveText('$ 0');
  await expect(page.getByTestId('estado-VEN-A1')).toHaveText('Al día');
  await menu(page, 'V22');
  await expect(page.getByTestId('total-vendido')).toHaveText('$ 2.330.000');
  await expect(page.getByTestId('total-pagado')).toHaveText('$ 1.330.000');
  await expect(page.getByTestId('total-pendiente')).toHaveText('$ 1.000.000');

  // La cuenta de Ramiro, vista por la empresa, cuadra con la conciliación.
  await page.getByTestId('ver-VEN-A1').click();
  await page.getByTestId('ver-cuenta').click();
  await expect(page).toHaveURL(/\/empresa\/cuentas\/VEN-A1$/);
  await expect(page.getByTestId('estado-CAR-A-004')).toHaveText('Saldada');
  await expect(page.getByTestId('resumen-saldo')).toHaveText('$ 0');
  await expect(page.getByTestId('resumen-estado')).toHaveText('Al día');
  await expect(page.getByTestId('resumen-en-poder')).toContainText('$ 450.000');
  // Pagos de vendedores lista los dos pagos con su aplicación.
  await menu(page, 'V24');
  await expect(page.getByTestId('aplicacion-PAG-A-003')).toHaveText('CAR-A-004 $ 200.000');
  await expect(page.getByTestId('aplicacion-PAG-A-002')).toHaveText('CAR-A-004 $ 500.000');
});

test('E44 y E46: reinicio en un clic desde la guía y cambio de usuario sin pasar por el ingreso', async ({ page }) => {
  await limpio(page);
  await entrarComo(page, 'paula.condor');
  await page.getByTestId('nuevo-cargue').click();
  await page.getByTestId('cargue-vendedor').selectOption('VEN-A1');
  await page.getByTestId('cargue-P40').fill('1');
  await page.getByTestId('registrar-carga').click();
  await aviso(page, 'CAR-A-004');

  await abrirGuia(page);
  await page.getByTestId('guia-reiniciar').click();
  await aviso(page, 'Demo reiniciada a los datos de ejemplo');
  await menu(page, 'V16');
  await expect(page.getByTestId('carga-CAR-A-004')).toHaveCount(0);
  await expect(page.getByTestId('usuario-sesion')).toHaveText('Paula Méndez');

  await cambiarA(page, 'usr-ramiro', /\/vendedor\/cuenta$/);
  await expect(page.getByTestId('perfiles-sesion')).toHaveText('vendedor y conductor');
  await menu(page, 'V31');
  await expect(page.getByTestId('sin-cargas')).toHaveText('Tu camión no tiene cargas. Pídele a la empresa que registre el cargue');
  await expect(page.getByTestId('registrar-venta')).toBeDisabled();
});
