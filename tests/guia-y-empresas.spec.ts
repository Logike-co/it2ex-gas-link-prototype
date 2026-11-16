import { expect, test } from '@playwright/test';
import { abrirGuia, aviso, cambiarA, DISCLAIMER, entrarComo, limpio, menu, textoMenu } from './helpers';

const USUARIOS_CONDOR = ['Paula Méndez', 'Doris Lucero', 'Olga Pineda', 'Ramiro Cárdenas', 'Edna Quiroga', 'Wilson Ortega', 'Yesid Navarro'];

/** D02 · La guía es el centro de control del demo (E45, E46, E65, E66, E68). */
test('E45: elegir ESC-02 en la guía reinicia la demo y ofrece «Ingresar como…» del paso 1', async ({ page }) => {
  await limpio(page);
  await entrarComo(page, 'paula.condor');
  await page.getByTestId('nuevo-cargue').click();
  await page.getByTestId('cargue-vendedor').selectOption('VEN-A1');
  await page.getByTestId('cargue-P40').fill('1');
  await page.getByTestId('registrar-carga').click();
  await aviso(page, 'CAR-A-004');

  await abrirGuia(page);
  await expect(page.getByTestId('guia-leyenda')).toHaveText(DISCLAIMER);
  await page.getByTestId('escenario-ESC-02').click();
  await aviso(page, 'Demo reiniciada a los datos de ejemplo');
  await expect(page.getByTestId('guia-paso-num')).toContainText('ESC-02 · Paso 1 · 1 de 6');
  await expect(page.getByTestId('guia-ingresar-como')).toHaveText('Ingresar como Doris Lucero');
  await page.getByTestId('guia-ingresar-como').click();
  await expect(page).toHaveURL(/\/vendedor\/cuenta$/);
  await expect(page.getByTestId('resumen-saldo')).toHaveText('$ 1.000.000');
  await expect(page.getByTestId('resumen-en-poder')).toContainText('$ 390.000');

  // El paso 2 es de Paula: la guía la ofrece y abre la conciliación de Transportes Lucero.
  await page.getByTestId('guia-siguiente').click();
  await page.getByTestId('guia-ingresar-como').click();
  await expect(page).toHaveURL(/\/empresa\/conciliacion\/VEN-A2$/);
  await page.getByTestId('ir-registrar-pago').click();
  await page.getByTestId('pago-monto').fill('500000');
  await page.getByTestId('pago-referencia').fill('TRF-DEMO-2001');
  await page.getByTestId('registrar-pago').click();
  await aviso(page, 'Aplicado: CAR-A-002 $ 500.000');
  await expect(page).toHaveURL(/\/empresa\/conciliacion\/VEN-A2$/);
  await page.getByTestId('ir-registrar-pago').click();
  await expect(page.getByTestId('pago-pendiente')).toContainText('CAR-A-002 $ 100.000 · CAR-A-003 $ 400.000');
});

test('E65 y E66: la guía cambia de usuario y recalcula «Qué puede hacer»; la barra no tiene controles del demo', async ({ page }) => {
  await limpio(page);
  await entrarComo(page, 'paula.condor');
  const barra = page.getByTestId('barra-superior');
  await expect(barra.locator('select')).toHaveCount(0);
  await expect(barra.getByRole('button')).toHaveText(['☰', 'Guía', 'Salir']);
  await expect(page.getByText('Reiniciar demo')).toHaveCount(0);

  await abrirGuia(page);
  const grupos = await page.getByTestId('guia-cambiar-usuario').locator('optgroup').evaluateAll((gs) => gs.map((g) => g.getAttribute('label')));
  expect(grupos).toEqual(['Plataforma', 'Gas Cóndor Demo', 'Gas Ceiba Demo']);
  const opciones = page.getByTestId('guia-que-puede').getByTestId('guia-opcion-enlace');
  await expect(opciones).toHaveText([
    'Cargues',
    'Cuentas de vendedores',
    'Conciliación',
    'Pagos de vendedores',
    'Vendedores',
    'Camiones',
    'Conductores',
    'Catálogo de cilindros',
    'Llave de cobro',
  ]);
  await expect(page.getByTestId('guia-opcion-V16')).toContainText('Registrar lo que sale en cada camión');
  await expect(page.getByTestId('guia-opcion-V19')).toContainText('F08b');

  await cambiarA(page, 'usr-yesid', /\/conductor\/camion$/);
  await expect(opciones).toHaveText(['Mi camión', 'Nueva venta', 'Mis ventas']);
  expect(await textoMenu(page)).toBe('Venta en calle › Mi camión, Nueva venta, Mis ventas');
  await expect(page.getByTestId('guia-usuario-nombre')).toHaveText('Yesid Navarro');
  await page.getByTestId('guia-opcion-V31').getByTestId('guia-opcion-enlace').click();
  await expect(page).toHaveURL(/\/conductor\/ventas\/nueva$/);

  await page.getByTestId('btn-salir').click();
  await expect(page).toHaveURL(/\/ingreso$/);
  await expect(page.getByTestId('btn-salir')).toHaveCount(0);
  await expect(page.getByTestId('btn-menu')).toHaveCount(0);
  await expect(page.getByTestId('guia-usuario-nombre')).toHaveText('Sin sesión');
  await expect(page.getByTestId('guia-que-puede-vacio')).toHaveText('Elige un usuario para ver lo que puede hacer');
});

test('E68: el paso del escenario dice si es del usuario activo', async ({ page }) => {
  await limpio(page);
  await entrarComo(page, 'paula.condor');
  await abrirGuia(page);
  await page.getByTestId('escenario-ESC-01').click();
  await page.getByTestId('guia-todos-los-pasos').click();
  await page.getByTestId('guia-ir-paso-3').click();
  await expect(page.getByTestId('guia-marca-usuario')).toHaveText('Otro usuario: Ramiro Cárdenas');
  await expect(page.getByTestId('guia-ingresar-como')).toHaveText('Ingresar como Ramiro Cárdenas');
  await page.getByTestId('guia-ingresar-como').click();
  await expect(page).toHaveURL(/\/conductor\/ventas\/nueva$/);
  await expect(page.getByTestId('usuario-sesion')).toHaveText('Ramiro Cárdenas');
  await expect(page.getByTestId('guia-marca-usuario')).toHaveText('Usuario activo');
  await page.getByTestId('guia-siguiente').click();
  await expect(page.getByTestId('guia-paso-num')).toContainText('Paso 4');
  await expect(page.getByTestId('guia-ir-pantalla')).toHaveText('Ir a la pantalla');
  await expect(page.getByTestId('guia-ingresar-como')).toHaveCount(0);
});

/** F01 · Empresas y sus usuarios (E06, E07, E53–E58). */
test('E06 y E07: el administrador da de alta una empresa con su usuario', async ({ page }) => {
  await limpio(page);
  await entrarComo(page, 'andrea.admin');
  await page.getByTestId('nueva-empresa').click();
  await expect(page).toHaveURL(/\/admin\/empresas\/nueva$/);
  await page.getByTestId('empresa-nombre').fill('gas condor demo');
  await page.getByTestId('empresa-persona').fill('Lina Torres');
  await page.getByTestId('empresa-usuario').fill('lina.paramo');
  await page.getByTestId('crear-empresa').click();
  await expect(page.getByTestId('error-empresa')).toHaveText('Ya existe una empresa con ese nombre');

  await page.getByTestId('empresa-nombre').fill('Gas Páramo Demo');
  await page.getByTestId('empresa-ciudad').fill('Sogamoso');
  await page.getByTestId('crear-empresa').click();
  await expect(page).toHaveURL(/\/admin\/empresas\/EMP-C$/);
  await aviso(page, 'Empresa EMP-C · Gas Páramo Demo creada con el usuario lina.paramo');
  await expect(page.getByTestId('empresa-detalle-config')).toHaveText('Configuración pendiente');
  await expect(page.getByTestId('empresa-detalle-faltas')).toContainText('Sin llave de cobro');
  await page.getByTestId('ver-usuarios').click();
  await expect(page.getByTestId('usuario-nombre')).toHaveText(['Lina Torres']);
  await expect(page.getByTestId('estado-usuario-lina.paramo')).toHaveText('Activo');
  await menu(page, 'V02');
  await expect(page.getByTestId('total-empresas')).toHaveText('3 empresas');

  await page.goto('/ingreso');
  await expect(page.getByTestId('grupo-Gas Páramo Demo')).toBeVisible();
  await page.getByTestId('tarjeta-lina.paramo').click();
  await expect(page).toHaveURL(/\/empresa\/cargues$/);
  await expect(page.getByTestId('empresa-sesion')).toHaveText('Gas Páramo Demo');
  await expect(page.getByTestId('sin-cargues')).toBeVisible();
  for (const [v, tabla] of [
    ['V09', 'tabla-vendedores'],
    ['V12', 'tabla-camiones'],
    ['V14', 'tabla-conductores'],
    ['V19', 'tabla-cuentas'],
  ]) {
    await menu(page, v);
    await expect(page.getByTestId(tabla).locator('tbody tr')).toHaveCount(1);
    await expect(page.getByTestId(tabla).locator('tbody')).toContainText(/todavía no/i);
  }
  await menu(page, 'V22');
  await expect(page.getByTestId('total-vendido')).toHaveText('$ 0');
  await menu(page, 'V24');
  await expect(page.getByTestId('sin-pagos')).toBeVisible();
  await menu(page, 'V07');
  for (const p of ['P100', 'P40', 'P30']) {
    await expect(page.getByTestId(`valor-${p}`)).toHaveValue('');
  }
});

test('E53 a E58: Empresas › empresa › Usuarios; alta, desactivar, SUP-22 e ingreso bloqueado', async ({ page }) => {
  await limpio(page);
  await entrarComo(page, 'andrea.admin');
  // E53: la jerarquía del administrador.
  await page.getByTestId('abrir-EMP-A').click();
  await expect(page).toHaveURL(/\/admin\/empresas\/EMP-A$/);
  await expect(page.getByTestId('ver-usuarios')).toHaveText(/Usuarios \(7 activos de 7\)/);
  await page.getByTestId('ver-usuarios').click();
  await expect(page).toHaveURL(/\/admin\/empresas\/EMP-A\/usuarios$/);
  await expect(page.getByTestId('usuario-nombre')).toHaveText(USUARIOS_CONDOR);
  await expect(page.getByTestId('usuario-ramiro.cardenas')).toContainText('vendedor · conductor de GLK 101');
  await expect(page.getByTestId('nota-flota')).toHaveText('Los vendedores y conductores se crean desde la Flota de la empresa');
  await expect(page.locator('main')).not.toContainText('$');

  // E57 (SUP-22): no se desactiva el último usuario empresa activo.
  await page.getByTestId('cambiar-estado-paula.condor').click();
  await expect(page.getByTestId('error-usuarios')).toHaveText('Gas Cóndor Demo debe tener al menos un usuario empresa activo');
  await expect(page.getByTestId('estado-usuario-paula.condor')).toHaveText('Activo');

  // E55 y E54: alta de un usuario empresa.
  await page.getByTestId('nuevo-usuario').click();
  await expect(page).toHaveURL(/\/admin\/empresas\/EMP-A\/usuarios\/nuevo$/);
  await page.getByTestId('usuario-nombre-input').fill('Camilo Ruiz');
  await page.getByTestId('usuario-usuario-input').fill('camilo condor');
  await page.getByTestId('crear-usuario').click();
  await expect(page.getByTestId('error-usuario')).toHaveText('El usuario no puede tener espacios ni tildes');
  await page.getByTestId('usuario-usuario-input').fill('doris.lucero');
  await page.getByTestId('crear-usuario').click();
  await expect(page.getByTestId('error-usuario')).toHaveText('Ese usuario ya existe');
  await page.getByTestId('usuario-usuario-input').fill('camilo.condor');
  await page.getByTestId('crear-usuario').click();
  await expect(page).toHaveURL(/\/admin\/empresas\/EMP-A\/usuarios$/);
  await aviso(page, 'Usuario camilo.condor creado en Gas Cóndor Demo');
  await expect(page.getByTestId('usuario-nombre')).toHaveCount(8);
  await expect(page.getByTestId('usuario-camilo.condor')).toContainText('empresa');
  await expect(page.getByTestId('estado-usuario-camilo.condor')).toHaveText('Activo');

  // E57: con Camilo activo, Paula sí se puede desactivar.
  await page.getByTestId('cambiar-estado-paula.condor').click();
  await expect(page.getByTestId('estado-usuario-paula.condor')).toHaveText('Inactivo');
  await page.getByTestId('cambiar-estado-paula.condor').click();
  await expect(page.getByTestId('estado-usuario-paula.condor')).toHaveText('Activo');

  // E56: desactivar a Wilson; sigue en la flota.
  await page.getByTestId('cambiar-estado-wilson.ortega').click();
  await aviso(page, 'Wilson Ortega desactivado');
  await expect(page.getByTestId('estado-usuario-wilson.ortega')).toHaveText('Inactivo');
  await expect(page.getByTestId('cambiar-estado-wilson.ortega')).toHaveText('Activar');

  // E58: Wilson no puede ingresar, ni por la tarjeta ni por la guía.
  await page.goto('/ingreso');
  await expect(page.getByTestId('tarjeta-wilson.ortega').getByTestId('tarjeta-inactivo')).toHaveText('Inactivo');
  // La tarjeta está atenuada (aria-disabled); si se elige igual, avisa y no abre sesión.
  await page.getByTestId('tarjeta-wilson.ortega').click({ force: true });
  await expect(page).toHaveURL(/\/ingreso$/);
  await aviso(page, 'Este usuario está inactivo. Pídele al administrador de la plataforma que lo active');
  await expect(page.getByTestId('usuario-sesion')).toHaveText('Andrea Ríos');
  await abrirGuia(page);
  const opcionWilson = page.getByTestId('guia-cambiar-usuario').locator('option', { hasText: 'Wilson Ortega' });
  await expect(opcionWilson).toHaveText(/Inactivo/);
  await expect(opcionWilson).toBeDisabled();
  await page.getByTestId('escenario-ESC-03').click();
  // Reiniciar vuelve a activar a todos: se desactiva de nuevo y el «Ingresar como» del paso 1 muestra el aviso.
  await cambiarA(page, 'usr-andrea', /\/admin\/empresas$/);
  await page.goto('/admin/empresas/EMP-A/usuarios');
  await page.getByTestId('cambiar-estado-wilson.ortega').click();
  await expect(page.getByTestId('guia-ingresar-como')).toHaveText('Ingresar como Wilson Ortega');
  await page.getByTestId('guia-ingresar-como').click();
  await aviso(page, 'Este usuario está inactivo');
  await expect(page.getByTestId('usuario-sesion')).toHaveText('Andrea Ríos');

  // E54: Camilo (creado antes del reinicio) ya no existe; se crea de nuevo y entra con el menú de la empresa.
  await page.goto('/admin/empresas/EMP-A/usuarios/nuevo');
  await page.getByTestId('usuario-nombre-input').fill('Camilo Ruiz');
  await page.getByTestId('usuario-usuario-input').fill('camilo.condor');
  await page.getByTestId('crear-usuario').click();
  await page.goto('/ingreso');
  await page.getByTestId('tarjeta-camilo.condor').click();
  await expect(page).toHaveURL(/\/empresa\/cargues$/);
  await menu(page, 'V22');
  await expect(page.getByTestId('total-vendido')).toHaveText('$ 1.330.000');
  await expect(page.getByTestId('total-pagado')).toHaveText('$ 330.000');
  await expect(page.getByTestId('total-pendiente')).toHaveText('$ 1.000.000');
  // E56: el camión GLK 102 sigue teniendo a Wilson como conductor.
  await menu(page, 'V12');
  await expect(page.getByTestId('camion-VEH-A2')).toContainText('Wilson Ortega');
});
