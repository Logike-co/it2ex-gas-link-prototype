import { expect, Page } from '@playwright/test';

export const DISCLAIMER = 'DEMO CON DATOS FICTICIOS · SIN PAGOS REALES';

/** Arranca limpio (sin estado guardado) en la pantalla de ingreso. */
export const limpio = async (page: Page): Promise<void> => {
  await page.goto('/ingreso');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.getByTestId('tarjeta-andrea.admin')).toBeVisible();
};

/**
 * Entra por la pantalla de ingreso con la tarjeta del usuario (`paula.condor`) y, si tiene dos
 * perfiles, con el perfil pedido.
 */
export const entrarComo = async (page: Page, usuario: string, perfil?: 'vendedor' | 'conductor'): Promise<void> => {
  await page.goto('/ingreso');
  await page.getByTestId(perfil ? `entrar-${usuario}-${perfil}` : `entrar-${usuario}`).click();
  await expect(page).not.toHaveURL(/\/ingreso/);
};

/** Cambio rápido de perfil desde la barra superior (E46). */
export const cambiarA = async (page: Page, value: string, url: RegExp): Promise<void> => {
  await page.getByTestId('cambio-perfil').selectOption(value);
  await expect(page).toHaveURL(url);
};

export const aviso = async (page: Page, text: string | RegExp): Promise<void> => {
  await expect(page.getByTestId('aviso')).toContainText(text);
};
