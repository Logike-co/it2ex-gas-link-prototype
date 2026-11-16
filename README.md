# GasLink · Demo

**GasLink — Gestión comercial del gas.** Demo navegable, sin backend, de una plataforma para empresas que venden gas en cilindros a través de vendedores dueños de camiones. Muestra cómo la empresa sabe en todo momento cuánto le debe cada vendedor por cada carga, sin quitarle al vendedor su libertad de precio ni sus clientes.

> **DEMO CON DATOS FICTICIOS · SIN PAGOS REALES.** Todos los nombres, empresas, llaves, placas, referencias y montos son inventados. Los QR son imágenes de muestra marcadas «MUESTRA · NO PAGAR»: no son códigos de cobro y no hay conexión con bancos ni con Bre-B. Los precios al vendedor y algunas reglas llevan el rótulo «Ilustrativo»: son valores de ejemplo que se validan con el prospecto.

## Qué incluye

| Vista | Ruta | Perfil | Qué se ve |
| :--- | :--- | :--- | :--- |
| V01 Ingreso por perfil | `/ingreso` | Todos | Tarjetas de usuarios de ejemplo agrupadas por plataforma y empresa; se entra con un clic. |
| V02 Empresas | `/admin/empresas` | Administrador | Lista de empresas y alta de una empresa con su usuario. |
| V03 Catálogo y llave | `/empresa/catalogo` | Empresa | Cilindros de 100, 40 y 30 lb con peso y valor al vendedor; llave de cobro y vista previa del QR. |
| V04 Flota | `/empresa/flota` | Empresa | Vendedores (con su llave), camiones (placa y dueño) y conductores. |
| V05 Cargue | `/empresa/cargue` | Empresa | Carga al vendedor con vista previa de peso y valor consolidado. |
| V06 Mi camión y nueva venta | `/conductor/venta` | Conductor | Existencias del camión y venta con precio libre (pensada para el celular). |
| V07 Cobro con QR | `/conductor/cobro` | Conductor | QR de la empresa, del vendedor o ambos, con reparto y resto en efectivo. |
| V08 Registro de montos | `/conductor/montos` | Conductor | Lo recibido por medio (llave de la empresa, llave del vendedor, efectivo) con referencia. |
| V09 Cuenta del vendedor e informe | `/cuenta` | Empresa, vendedor | Saldo total y por carga, aplicación de abonos, movimientos, dinero en poder del vendedor e informe imprimible. |
| V10 Conciliación | `/empresa/conciliacion` | Empresa | Vendido, pagado (confirmado / por confirmar), pendiente y referencias por vendedor; marca «Llegó» y pago del vendedor. |

Reglas de la cuenta del vendedor:

- Abonan a la cuenta solo lo cobrado a la **llave de la empresa** y los **pagos del vendedor** a la empresa (que registra la empresa). El efectivo y lo cobrado a la llave del vendedor se muestran como dinero en su poder.
- Un **pago del vendedor** se aplica a la carga más antigua con saldo y, si sobra, a la siguiente (un pago se puede partir entre cargas).
- Lo cobrado a la **llave de la empresa** en una venta se aplica a la carga de donde salió el producto; si la venta salió de varias cargas, se reparte en proporción al valor de los cilindros.
- Lo cobrado de más queda como saldo a favor y se aplica a la siguiente carga.

## Perfiles y usuarios de ejemplo

| Grupo | Usuario | Nombre | Perfil |
| :--- | :--- | :--- | :--- |
| Plataforma | `andrea.admin` | Andrea Ríos | Administrador de la plataforma |
| Gas Cóndor Demo | `paula.condor` | Paula Méndez | Empresa |
| Gas Cóndor Demo | `ramiro.cardenas` | Ramiro Cárdenas | Vendedor y conductor (elige con cuál entra) |
| Gas Cóndor Demo | `doris.lucero` | Doris Lucero (Transportes Lucero) | Vendedor |
| Gas Cóndor Demo | `olga.pineda` | Olga Pineda | Vendedor |
| Gas Cóndor Demo | `wilson.ortega`, `yesid.navarro`, `edna.quiroga` | Wilson Ortega, Yesid Navarro, Edna Quiroga | Conductor |
| Gas Ceiba Demo | `jorge.ceiba` | Jorge Salas | Empresa |
| Gas Ceiba Demo | `hernan.rojas` | Hernán Rojas | Vendedor y conductor |
| Gas Ceiba Demo | `marta.gil` | Marta Gil (Distribuciones El Trébol) | Vendedor |
| Gas Ceiba Demo | `nelson.pardo` | Nelson Pardo | Conductor |

Cada perfil ve solo su menú; las dos empresas no ven los datos de la otra. Crear una empresa, un vendedor o un conductor crea su usuario de ingreso.

## Controles del presentador

- **Guía** (botón de la barra superior o `Ctrl+Shift+D`): paso actual del escenario con usuario, ruta, qué hacer, qué contar y qué debe verse; «Ingresar como…», pasos anterior y siguiente, e interruptor **Trazabilidad** (ítems, reglas y escenarios de cada vista).
- **Escenarios precargados** (en la guía): elegir uno reinicia la demo y abre su paso 1.
  - **ESC-01 · Camino feliz:** carga de $ 1.000.000 → venta con QR → saldo $ 700.000 → pago de $ 500.000 → diferencia de $ 200.000 → cuenta en ceros.
  - **ESC-02 · Cuenta corriente y aplicación de pagos:** pago a la carga más antigua, cobro a la carga de origen y pago partido entre dos cargas.
  - **ESC-03 · Excepciones y aislamiento:** avisos que no bloquean, errores que sí, perfil sin permiso y una empresa que no ve la otra.
- **Reiniciar demo** (barra superior, guía o `Ctrl+Shift+R`): un clic, sin confirmación; vuelve a los datos de ejemplo.
- **Cambio rápido de perfil** (lista de la barra superior): cambia de usuario y perfil sin pasar por el ingreso.

El estado se guarda en el navegador (`gaslink-demo:v1:estado`, preferencias de la guía en `gaslink-demo:v1:guia`). Si el almacenamiento no está disponible, la demo arranca desde los datos de ejemplo y funciona igual.

## Cómo ejecutar

Requisitos: Node.js 24 (LTS) o superior y npm.

```bash
npm ci
npm start            # http://localhost:4200
npm run build:prod   # salida en dist/gas-link-prototype/browser
```

La publicación en GitHub Pages está en `.github/workflows/pages.yml`: en cada push a `main` verifica lint y pruebas unitarias, compila con la ruta del repositorio y publica `dist/gas-link-prototype/browser`.

## Pruebas

```bash
npm run lint                     # ESLint (TypeScript y plantillas)
npx jest --ci                    # motor, formatos, almacén, acceso, guía y shell
npx playwright install chromium  # una sola vez
npx playwright test              # recorrido ESC-01, aislamiento, guía y pantallas del conductor a 375 y 360 px
```

Las pruebas unitarias verifican los valores de control de los datos de ejemplo y de los escenarios ESC-01 y ESC-02, la aplicación por origen y por antigüedad (incluido un pago partido entre cargas), el saldo a favor, el dinero en poder del vendedor, la conciliación y los invariantes de la cuenta.

## Estructura

```text
src/app/
  core/simulation/   motor puro: modelo, datos de ejemplo, comandos, cálculos y formatos (COP, kg, fechas)
  core/state/        almacén con signal() persistido en el navegador
  core/access/       matriz vista × perfil, menú y guarda de rutas
  demo/              guía del presentador, escenarios ESC-01..03 y trazabilidad
  features/          las 10 vistas
  shared/            QR de muestra, etiquetas, rótulo «Ilustrativo» y formatos
tests/               pruebas de extremo a extremo (Playwright)
```

## Licencia

Propiedad de IT2EX; todos los derechos reservados (ver `LICENSE`). Los avisos de componentes de terceros están en `THIRD_PARTY_NOTICES.md`.
