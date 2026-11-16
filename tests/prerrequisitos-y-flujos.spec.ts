import { expect, test } from '@playwright/test';
import { aviso, entrarComo, limpio, menu } from './helpers';

/** D-T2 · Dependencias reflejadas en la navegación: prerrequisitos guiados (R-16) y pantallas hijas (SUP-28). */
test('E59: una empresa nueva ve qué le falta para cargar; la llave avisa sin bloquear', async ({ page }) => {
  await limpio(page);
  await entrarComo(page, 'andrea.admin');
  await page.getByTestId('nueva-empresa').click();
  await page.getByTestId('empresa-nombre').fill('Gas Páramo Demo');
  await page.getByTestId('empresa-ciudad').fill('Sogamoso');
  await page.getByTestId('empresa-persona').fill('Lina Torres');
  await page.getByTestId('empresa-usuario').fill('lina.paramo');
  await page.getByTestId('crear-empresa').click();
  await expect(page).toHaveURL(/\/admin\/empresas\/EMP-C$/);

  await entrarComo(page, 'lina.paramo');
  await page.getByTestId('nuevo-cargue').click();
  await expect(page.getByTestId('prerrequisito-catalogo')).toContainText('Falta el valor unitario de los cilindros en el catálogo');
  await expect(page.getByTestId('prerrequisito-catalogo-enlace')).toHaveText('Catálogo de cilindros');
  await expect(page.getByTestId('prerrequisito-flota')).toContainText('Falta un vendedor con camión y conductor');
  await expect(page.getByTestId('prerrequisito-flota-enlace')).toHaveText('Vendedores');
  await expect(page.getByTestId('prerrequisito-llave')).toContainText(
    'Tu empresa no tiene llave de cobro: los conductores no podrán mostrar el QR de la empresa'
  );
  await expect(page.getByTestId('prerrequisito-llave-enlace')).toHaveText('Llave de cobro');
  await expect(page.getByTestId('registrar-carga')).toBeDisabled();

  // Pone precio a las tres presentaciones.
  await page.getByTestId('prerrequisito-catalogo-enlace').click();
  await expect(page).toHaveURL(/\/empresa\/configuracion\/catalogo$/);
  await page.getByTestId('valor-P100').fill('170000');
  await page.getByTestId('valor-P40').fill('82500');
  await page.getByTestId('valor-P30').fill('65000');
  await page.getByTestId('guardar-catalogo').click();
  await aviso(page, 'Catálogo guardado');

  // Registra un vendedor con camión y conductor, desde su detalle.
  await menu(page, 'V09');
  await page.getByTestId('nuevo-vendedor').click();
  await page.getByTestId('vendedor-nombre').fill('Gases Sogamoso');
  await page.getByTestId('crear-vendedor').click();
  await expect(page).toHaveURL(/\/empresa\/flota\/vendedores\/VEN-C1$/);
  await expect(page.getByTestId('agregar-conductor')).toBeDisabled();
  await page.getByTestId('agregar-camion').click();
  await page.getByTestId('camion-placa').fill('PRM 101');
  await page.getByTestId('crear-camion').click();
  await expect(page).toHaveURL(/\/empresa\/flota\/vendedores\/VEN-C1$/);
  await page.getByTestId('agregar-conductor').click();
  await page.getByTestId('conductor-es-vendedor').check();
  await page.getByTestId('crear-conductor').click();
  await expect(page).toHaveURL(/\/empresa\/flota\/vendedores\/VEN-C1$/);

  await menu(page, 'V16');
  await page.getByTestId('nuevo-cargue').click();
  await expect(page.getByTestId('prerrequisito-catalogo')).toHaveCount(0);
  await expect(page.getByTestId('prerrequisito-flota')).toHaveCount(0);
  await expect(page.getByTestId('prerrequisito-llave')).toBeVisible();
  await expect(page.getByTestId('registrar-carga')).toBeEnabled();
  await page.getByTestId('cargue-vendedor').selectOption('VEN-C1');
  await page.getByTestId('cargue-P100').fill('1');
  await page.getByTestId('registrar-carga').click();
  await expect(page).toHaveURL(/\/empresa\/cargues\/CAR-C-001$/);
});

test('E13, E14, E60 y E61: flota jerárquica y vendedor sin camión no elegible en el cargue', async ({ page }) => {
  await limpio(page);
  await entrarComo(page, 'paula.condor');
  await menu(page, 'V09');
  await page.getByTestId('nuevo-vendedor').click();
  await expect(page).toHaveURL(/\/empresa\/flota\/vendedores\/nuevo$/);
  await page.getByTestId('vendedor-nombre').fill('Gases La Loma');
  await page.getByTestId('vendedor-llave').fill('@laloma.demo');
  await page.getByTestId('crear-vendedor').click();
  await expect(page).toHaveURL(/\/empresa\/flota\/vendedores\/VEN-A4$/);
  await aviso(page, 'Vendedor VEN-A4 · Gases La Loma registrado con su usuario gases.la.loma');
  await expect(page.getByTestId('vendedor-falta')).toBeVisible();
  await expect(page.getByTestId('agregar-conductor-ayuda')).toHaveText('Primero agrega un camión');

  // E60: en el cargue, Gases La Loma no se puede elegir; los otros tres sí.
  await menu(page, 'V16');
  await page.getByTestId('nuevo-cargue').click();
  await expect(page.getByTestId('opcion-vendedor-VEN-A4')).toBeDisabled();
  await expect(page.getByTestId('opcion-vendedor-VEN-A4')).toContainText('Sin camión');
  await expect(page.getByTestId('vendedor-no-listo-VEN-A4')).toContainText('Gases La Loma: Sin camión');
  for (const v of ['VEN-A1', 'VEN-A2', 'VEN-A3']) {
    await expect(page.getByTestId(`opcion-vendedor-${v}`)).toBeEnabled();
  }
  await page.getByTestId('vendedor-no-listo-VEN-A4').getByRole('link').click();
  await expect(page).toHaveURL(/\/empresa\/flota\/vendedores\/VEN-A4$/);

  // E13: camiones y conductor desde el detalle del vendedor, que vuelve al detalle al guardar.
  for (const placa of ['glk105', 'GLK 106']) {
    await page.getByTestId('agregar-camion').click();
    await expect(page).toHaveURL(/\/empresa\/flota\/camiones\/nuevo\?vendedor=VEN-A4$/);
    await expect(page.getByTestId('camion-dueno-fijo')).toHaveText('Gases La Loma');
    await page.getByTestId('camion-placa').fill(placa);
    await page.getByTestId('crear-camion').click();
    await expect(page).toHaveURL(/\/empresa\/flota\/vendedores\/VEN-A4$/);
  }
  await page.getByTestId('agregar-conductor').click();
  await expect(page).toHaveURL(/\/empresa\/flota\/conductores\/nuevo\?vendedor=VEN-A4$/);
  await page.getByTestId('conductor-nombre').fill('Iván Mora');
  await page.getByTestId('conductor-camion').selectOption({ label: 'GLK 105' });
  await page.getByTestId('crear-conductor').click();
  await expect(page).toHaveURL(/\/empresa\/flota\/vendedores\/VEN-A4$/);
  await expect(page.getByTestId('vendedor-camiones')).toContainText('GLK 105');
  await expect(page.getByTestId('vendedor-camiones')).toContainText('GLK 106');
  await expect(page.getByTestId('vendedor-conductores')).toContainText('Iván Mora');
  await expect(page.getByTestId('vendedor-falta')).toHaveCount(0);
  await menu(page, 'V12');
  await expect(page.getByTestId('tabla-camiones')).toContainText('GLK 105');
  await expect(page.getByTestId('camion-VEH-A6')).toContainText('Gases La Loma');

  // E61: desde el detalle de Olga, el dueño queda fijo; desde «Camiones», se elige y vuelve a la lista.
  await page.goto('/empresa/flota/vendedores/VEN-A3');
  await page.getByTestId('agregar-camion').click();
  await page.getByTestId('camion-placa').fill('GLK 107');
  await page.getByTestId('crear-camion').click();
  await expect(page).toHaveURL(/\/empresa\/flota\/vendedores\/VEN-A3$/);
  await expect(page.getByTestId('vendedor-camiones')).toContainText('GLK 104');
  await expect(page.getByTestId('vendedor-camiones')).toContainText('GLK 107');
  await page.getByTestId('agregar-conductor').click();
  await expect(page.getByTestId('conductor-vendedor-fijo')).toHaveText('Olga Pineda');
  await expect(page.getByTestId('conductor-camion').locator('option')).toHaveText(['Elige el camión…', 'GLK 104', 'GLK 107']);
  await menu(page, 'V12');
  await page.getByTestId('nuevo-camion').click();
  await expect(page).toHaveURL(/\/empresa\/flota\/camiones\/nuevo$/);
  // E14: la placa es única dentro de la empresa.
  await page.getByTestId('camion-dueno').selectOption('VEN-A3');
  await page.getByTestId('camion-placa').fill('GLK 101');
  await page.getByTestId('crear-camion').click();
  await expect(page.getByTestId('error-camion')).toHaveText('Ya existe un camión con la placa GLK 101 en tu empresa');
  await page.getByTestId('camion-placa').fill('GLK 108');
  await page.getByTestId('crear-camion').click();
  await expect(page).toHaveURL(/\/empresa\/flota\/camiones$/);

  // Las tarjetas de ingreso de los usuarios creados en vivo.
  await page.goto('/ingreso');
  await expect(page.getByTestId('tarjeta-gases.la.loma')).toContainText('vendedor');
  await expect(page.getByTestId('tarjeta-ivan.mora')).toContainText('conductor');
});

test('E35, E37, E41 y E62: cuenta, informe con cargas marcadas y pago con el vendedor prellenado', async ({ page }) => {
  await limpio(page);
  await entrarComo(page, 'paula.condor');
  await menu(page, 'V19');
  await page.getByTestId('abrir-VEN-A2').click();
  await expect(page).toHaveURL(/\/empresa\/cuentas\/VEN-A2$/);
  // E35: subtotal de la selección.
  await page.getByTestId('marcar-CAR-A-003').check();
  await expect(page.getByTestId('sel-valor')).toHaveText('$ 400.000');
  await expect(page.getByTestId('sel-saldo')).toHaveText('$ 400.000');
  await expect(page.getByTestId('resumen-saldo')).toHaveText('$ 1.000.000');
  // E37: informe con las cargas marcadas.
  await page.getByTestId('marcar-CAR-A-002').check();
  await page.getByTestId('btn-informe').click();
  await expect(page).toHaveURL(/\/empresa\/cuentas\/VEN-A2\/informe\?cargas=CAR-A-003(,|%2C)CAR-A-002$/);
  await expect(page.getByTestId('informe-leyenda')).toHaveText('DEMO CON DATOS FICTICIOS · SIN PAGOS REALES');
  await expect(page.getByTestId('informe-cargas').locator('tbody tr')).toHaveCount(2);
  await expect(page.getByTestId('nav-V19')).toHaveAttribute('aria-current', 'page');
  await page.getByTestId('volver-cuenta').click();
  await expect(page).toHaveURL(/\/empresa\/cuentas\/VEN-A2$/);

  // E62: desde la cuenta, el vendedor queda fijo con su pendiente.
  await page.getByTestId('ir-registrar-pago').click();
  await expect(page).toHaveURL(/\/empresa\/pagos\/nuevo\?vendedor=VEN-A2$/);
  await expect(page.getByTestId('pago-vendedor-fijo')).toHaveText('Transportes Lucero');
  await expect(page.getByTestId('pago-pendiente')).toContainText('$ 1.000.000');
  // E41: validaciones del pago.
  await page.getByTestId('pago-monto').fill('1200000');
  await page.getByTestId('pago-referencia').fill('TRF-DEMO-9');
  await page.getByTestId('registrar-pago').click();
  await expect(page.getByTestId('error-pago')).toHaveText('El pago supera lo que debe el vendedor ($ 1.000.000)');
  await page.getByTestId('pago-monto').fill('100000');
  await page.getByTestId('pago-referencia').fill('');
  await page.getByTestId('registrar-pago').click();
  await expect(page.getByTestId('error-pago')).toHaveText('Escribe la referencia de la transferencia');
  await page.getByTestId('pago-referencia').fill('TRF-DEMO-9');
  await page.getByTestId('registrar-pago').click();
  await expect(page).toHaveURL(/\/empresa\/conciliacion\/VEN-A2$/);

  // Desde la conciliación del vendedor, igual.
  await page.getByTestId('ir-registrar-pago').click();
  await expect(page).toHaveURL(/\/empresa\/pagos\/nuevo\?vendedor=VEN-A2$/);
  await expect(page.getByTestId('pago-pendiente')).toContainText('$ 900.000');
  await page.getByTestId('cancelar').click();
  await expect(page).toHaveURL(/\/empresa\/conciliacion\/VEN-A2$/);

  // Desde «Pagos de vendedores», el vendedor se elige.
  await menu(page, 'V24');
  await expect(page.getByTestId('pago-PAG-A-002')).toContainText('Transportes Lucero');
  await page.getByTestId('ir-registrar-pago').click();
  await expect(page).toHaveURL(/\/empresa\/pagos\/nuevo$/);
  await page.getByTestId('pago-vendedor').selectOption('VEN-A2');
  await expect(page.getByTestId('pago-pendiente')).toContainText('$ 900.000');
  await page.getByTestId('pago-monto').fill('50000');
  await page.getByTestId('pago-referencia').fill('TRF-DEMO-10');
  await page.getByTestId('registrar-pago').click();
  await expect(page).toHaveURL(/\/empresa\/conciliacion\/VEN-A2$/);
  await expect(page.getByTestId('pendiente-VEN-A2')).toHaveText('$ 850.000');
});

test('E52 y E63: las acciones dependientes no están en el menú; el cobro sale de una venta', async ({ page }) => {
  await limpio(page);
  await entrarComo(page, 'paula.condor');
  const menuPaula = await page.getByTestId('menu').locator('a').allTextContents();
  for (const hija of ['Nuevo cargue', 'Cuenta del vendedor', 'Registrar pago del vendedor', 'Nuevo camión', 'Nuevo conductor']) {
    expect(menuPaula.map((t) => t.trim())).not.toContain(hija);
  }

  await entrarComo(page, 'wilson.ortega');
  const menuWilson = (await page.getByTestId('menu').locator('a').allTextContents()).map((t) => t.trim());
  expect(menuWilson).not.toContain('Cobro con QR');
  expect(menuWilson).not.toContain('Registro de montos');
  await menu(page, 'V31');
  await page.getByTestId('mas-P30').click();
  await page.getByTestId('valor-venta').fill('70000');
  await page.getByTestId('registrar-venta').click();
  await expect(page).toHaveURL(/\/conductor\/ventas\/VTA-A-004$/);

  await menu(page, 'V32');
  await expect(page.getByTestId('cobrar-VTA-A-004')).toBeVisible();
  await page.getByTestId('abrir-VTA-A-004').click();
  await expect(page).toHaveURL(/\/conductor\/ventas\/VTA-A-004$/);
  await expect(page.getByTestId('cobrar-qr')).toHaveText('Cobrar con QR');
  await expect(page.getByTestId('registrar-montos')).toHaveText('Registrar montos');
  await expect(page.getByTestId('nav-V32')).toHaveAttribute('aria-current', 'page');
  await page.getByTestId('cobrar-qr').click();
  await expect(page).toHaveURL(/\/conductor\/ventas\/VTA-A-004\/cobro$/);
  await page.getByTestId('opcion-qr-vendedor').click();
  await page.getByTestId('registrar-recibido').click();
  await expect(page).toHaveURL(/\/conductor\/ventas\/VTA-A-004\/montos$/);
  await expect(page.getByTestId('medio-0-llave_vendedor')).toHaveAttribute('aria-checked', 'true');
  await expect(page.getByTestId('monto-0')).toHaveValue('70000');
  await page.getByTestId('guardar-cobros').click();
  await expect(page).toHaveURL(/\/conductor\/ventas\/VTA-A-004$/);
  await expect(page.getByTestId('estado-venta')).toHaveText('Cobrada');
  await expect(page.getByTestId('cobrar-qr')).toHaveCount(0);
  await menu(page, 'V32');
  await expect(page.getByTestId('estado-venta-VTA-A-004')).toHaveText('Cobrada');
  await expect(page.getByTestId('cobrar-VTA-A-004')).toHaveCount(0);
});
