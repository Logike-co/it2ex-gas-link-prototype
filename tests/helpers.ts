import { expect, Page } from '@playwright/test';

export const DISCLAIMER = 'DEMO CON DATOS FICTICIOS · SIN PAGOS REALES';

/** Arranca limpio (sin estado guardado) en la pantalla de ingreso. */
export const limpio = async (page: Page): Promise<void> => {
  await page.goto('/ingreso');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.getByTestId('tarjeta-andrea.admin')).toBeVisible();
};

/** Entra por la pantalla de ingreso con la tarjeta del usuario (`paula.condor`): una sola entrada por usuario. */
export const entrarComo = async (page: Page, usuario: string): Promise<void> => {
  await page.goto('/ingreso');
  const tarjeta = page.getByTestId(`tarjeta-${usuario}`);
  const nombre = (await tarjeta.getByTestId('tarjeta-nombre').textContent())?.trim() ?? '';
  await tarjeta.click();
  await expect(page).not.toHaveURL(/\/ingreso/);
  // Con las pantallas precargadas, la URL cambia antes de que se pinte la sesión nueva: se espera
  // a que la barra muestre al usuario (el menú se pinta en la misma pasada).
  await expect(page.getByTestId('usuario-sesion')).toHaveText(nombre);
};

/** Abre la guía si está cerrada. */
export const abrirGuia = async (page: Page): Promise<void> => {
  if (!(await page.getByTestId('guia-demo').isVisible())) {
    await page.getByTestId('btn-guia').click();
  }
  await expect(page.getByTestId('guia-demo')).toBeVisible();
};

/** «Cambiar de usuario» desde la guía (E46): cambia la sesión sin pasar por el ingreso. */
export const cambiarA = async (page: Page, usuarioId: string, url: RegExp): Promise<void> => {
  await abrirGuia(page);
  await page.getByTestId('guia-cambiar-usuario').selectOption(usuarioId);
  await expect(page).toHaveURL(url);
};

/** Elige una opción del menú ☰ (lo abre si está plegado, p. ej. en el celular). */
export const menu = async (page: Page, view: string): Promise<void> => {
  // El ☰ y el menú se pintan juntos: sin el ☰ en pantalla, el menú aún no se puede leer.
  await expect(page.getByTestId('btn-menu')).toBeVisible();
  const link = page.getByTestId(`nav-${view}`);
  if (!(await link.isVisible())) {
    await page.getByTestId('btn-menu').click();
  }
  await link.click();
};

/** Secciones y opciones del menú ☰, como en E50: «Sección › Opción, Opción; …». */
export const textoMenu = async (page: Page): Promise<string> =>
  page.getByTestId('menu-seccion').evaluateAll((secs) =>
    secs
      .map((s) => {
        const titulo = s.querySelector('[data-testid="menu-seccion-titulo"]')?.textContent?.trim();
        const ops = [...s.querySelectorAll('a')].map((a) => a.textContent?.trim());
        return `${titulo} › ${ops.join(', ')}`;
      })
      .join('; ')
  );

export const aviso = async (page: Page, text: string | RegExp): Promise<void> => {
  await expect(page.getByTestId('aviso')).toContainText(text);
};
