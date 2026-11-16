import { defineConfig, devices } from '@playwright/test';

/**
 * Pruebas de extremo a extremo de la demo (rutas v2, D-T2): recorrido ESC-01 (E49), aislamiento
 * entre empresas (E08, E09, E64), menú ☰ por usuario (E50, E51), guía (E45, E46, E65, E66, E68),
 * usuarios de la empresa (E53–E58), prerrequisitos guiados (E59–E63) y celular (E47, E48, E67).
 * Ver https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 2 : 0,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never' }]],
  timeout: 120_000,
  use: {
    baseURL: 'http://localhost:4200',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1366, height: 900 } },
    },
  ],
  webServer: {
    command: 'npm run start -- --port 4200',
    url: 'http://localhost:4200',
    reuseExistingServer: !process.env['CI'],
    timeout: 180_000,
  },
});
