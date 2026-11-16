# GasLink · Demo

**GasLink — Gestión comercial del gas.** Demo navegable, sin backend, de una plataforma para empresas que venden gas en cilindros a través de vendedores dueños de camiones. Muestra cómo la empresa sabe en todo momento cuánto le debe cada vendedor por cada carga, sin quitarle al vendedor su libertad de precio ni sus clientes.

> **DEMO CON DATOS FICTICIOS · SIN PAGOS REALES.** Todos los nombres, empresas, llaves, placas, referencias y montos son inventados. Los QR son imágenes de muestra marcadas «MUESTRA · NO PAGAR»: no son códigos de cobro y no hay conexión con bancos ni con Bre-B. Los precios al vendedor y algunas reglas llevan el rótulo «Ilustrativo»: son valores de ejemplo que se validan con el prospecto.

## Qué incluye

Cada usuario entra una sola vez y ve un menú ☰ con las secciones de sus perfiles. Las pantallas de menú se abren desde el ☰; las pantallas hijas (formularios y detalles) se abren desde su pantalla padre y llevan migas de pan. Si falta algo para usar una pantalla, la pantalla lo dice y enlaza a donde se configura.

### Menú ☰ por perfil

| Perfil | Sección › opción | Pantallas hijas (no van al menú) |
| :--- | :--- | :--- |
| Administrador de la plataforma | Plataforma › Empresas | Nueva empresa · Detalle de la empresa · Usuarios de la empresa · Nuevo usuario |
| Empresa | Operación › Cargues | Nuevo cargue · Detalle del cargue |
| | Cartera › Cuentas de vendedores · Conciliación · Pagos de vendedores | Cuenta del vendedor · Informe de la cuenta · Conciliación del vendedor · Registrar pago |
| | Flota › Vendedores · Camiones · Conductores | Nuevo vendedor · Detalle del vendedor · Nuevo camión · Nuevo conductor |
| | Configuración › Catálogo de cilindros · Llave de cobro | — |
| Vendedor | Mi cuenta › Resumen · Movimientos · Informe | Detalle de mi carga |
| Conductor | Venta en calle › Mi camión · Nueva venta · Mis ventas | Detalle de la venta · Cobro con QR · Registro de montos |

Un usuario con dos perfiles (vendedor y conductor) ve las dos secciones en el mismo menú. La pantalla de inicio es la primera opción de su menú.

### Pantallas y rutas

| Id | Pantalla | Ruta | Perfil |
| :--- | :--- | :--- | :--- |
| V01 | Ingreso | `/ingreso` | Sin sesión |
| V02 | Empresas | `/admin/empresas` | Administrador |
| V03 | Nueva empresa | `/admin/empresas/nueva` | Administrador |
| V04 | Detalle de la empresa | `/admin/empresas/:empresaId` | Administrador |
| V05 | Usuarios de la empresa | `/admin/empresas/:empresaId/usuarios` | Administrador |
| V06 | Nuevo usuario de la empresa | `/admin/empresas/:empresaId/usuarios/nuevo` | Administrador |
| V07 | Catálogo de cilindros | `/empresa/configuracion/catalogo` | Empresa |
| V08 | Llave de cobro | `/empresa/configuracion/llave` | Empresa |
| V09 | Vendedores | `/empresa/flota/vendedores` | Empresa |
| V10 | Nuevo vendedor | `/empresa/flota/vendedores/nuevo` | Empresa |
| V11 | Detalle del vendedor | `/empresa/flota/vendedores/:vendedorId` | Empresa |
| V12 | Camiones | `/empresa/flota/camiones` | Empresa |
| V13 | Nuevo camión | `/empresa/flota/camiones/nuevo` (`?vendedor=` desde el detalle del vendedor) | Empresa |
| V14 | Conductores | `/empresa/flota/conductores` | Empresa |
| V15 | Nuevo conductor | `/empresa/flota/conductores/nuevo` (`?vendedor=` desde el detalle del vendedor) | Empresa |
| V16 | Cargues | `/empresa/cargues` | Empresa |
| V17 | Nuevo cargue | `/empresa/cargues/nuevo` | Empresa |
| V18 | Detalle del cargue | `/empresa/cargues/:cargaId` | Empresa |
| V19 | Cuentas de vendedores | `/empresa/cuentas` | Empresa |
| V20 | Cuenta del vendedor | `/empresa/cuentas/:vendedorId` | Empresa |
| V21 | Informe de la cuenta | `/empresa/cuentas/:vendedorId/informe` (`?cargas=` con las marcadas) | Empresa |
| V22 | Conciliación | `/empresa/conciliacion` | Empresa |
| V23 | Conciliación del vendedor | `/empresa/conciliacion/:vendedorId` | Empresa |
| V24 | Pagos de vendedores | `/empresa/pagos` | Empresa |
| V25 | Registrar pago del vendedor | `/empresa/pagos/nuevo` (`?vendedor=` desde la cuenta o la conciliación) | Empresa |
| V26 | Mi cuenta (Resumen) | `/vendedor/cuenta` | Vendedor |
| V27 | Detalle de mi carga | `/vendedor/cargas/:cargaId` | Vendedor |
| V28 | Mis movimientos | `/vendedor/movimientos` | Vendedor |
| V29 | Mi informe | `/vendedor/informe` | Vendedor |
| V30 | Mi camión | `/conductor/camion` | Conductor |
| V31 | Nueva venta | `/conductor/ventas/nueva` | Conductor |
| V32 | Mis ventas | `/conductor/ventas` | Conductor |
| V33 | Detalle de la venta | `/conductor/ventas/:ventaId` | Conductor |
| V34 | Cobro con QR | `/conductor/ventas/:ventaId/cobro` | Conductor |
| V35 | Registro de montos | `/conductor/ventas/:ventaId/montos` | Conductor |

La empresa, el vendedor y el conductor salen siempre de la sesión, nunca de la URL: un parámetro que no es del usuario (por ejemplo, un vendedor de la otra empresa) muestra un aviso, ningún dato y un enlace a su lista. Una ruta que ninguno de los perfiles del usuario puede ver lleva a su pantalla de inicio con «Tu perfil no tiene acceso a esa pantalla».

Prerrequisitos guiados:

- **Nuevo cargue** dice qué falta y enlaza a donde se configura: el valor unitario en el catálogo y un vendedor con camión y conductor bloquean el registro; la falta de llave de cobro solo avisa. Un vendedor sin camión o sin conductor aparece deshabilitado, con el enlace a su detalle.
- **Nuevo camión** y **Nuevo conductor** piden primero un vendedor; el conductor, además, un camión del vendedor.
- **Nueva venta** no deja vender si el camión no tiene cargas.
- **Cobro con QR** y **Registro de montos** solo se abren desde una venta.

Reglas de la cuenta del vendedor:

- Abonan a la cuenta solo lo cobrado a la **llave de la empresa** y los **pagos del vendedor** a la empresa (que registra la empresa). El efectivo y lo cobrado a la llave del vendedor se muestran como dinero en su poder.
- Un **pago del vendedor** se aplica a la carga más antigua con saldo y, si sobra, a la siguiente (un pago se puede partir entre cargas).
- Lo cobrado a la **llave de la empresa** en una venta se aplica a la carga de donde salió el producto; si la venta salió de varias cargas, se reparte en proporción al valor de los cilindros.
- Lo cobrado de más queda como saldo a favor y se aplica a la siguiente carga.

## Perfiles y usuarios de ejemplo

| Grupo | Usuario | Nombre | Perfiles | Inicio |
| :--- | :--- | :--- | :--- | :--- |
| Plataforma | `andrea.admin` | Andrea Ríos | Administrador de la plataforma | Empresas |
| Gas Cóndor Demo | `paula.condor` | Paula Méndez | Empresa | Cargues |
| Gas Cóndor Demo | `ramiro.cardenas` | Ramiro Cárdenas | Vendedor y conductor (una sola sesión, las dos secciones) | Mi cuenta |
| Gas Cóndor Demo | `doris.lucero` | Doris Lucero (Transportes Lucero) | Vendedor | Mi cuenta |
| Gas Cóndor Demo | `olga.pineda` | Olga Pineda | Vendedor | Mi cuenta |
| Gas Cóndor Demo | `wilson.ortega`, `yesid.navarro`, `edna.quiroga` | Wilson Ortega, Yesid Navarro, Edna Quiroga | Conductor | Mi camión |
| Gas Ceiba Demo | `jorge.ceiba` | Jorge Salas | Empresa | Cargues |
| Gas Ceiba Demo | `hernan.rojas` | Hernán Rojas | Vendedor y conductor | Mi cuenta |
| Gas Ceiba Demo | `marta.gil` | Marta Gil (Distribuciones El Trébol) | Vendedor | Mi cuenta |
| Gas Ceiba Demo | `nelson.pardo` | Nelson Pardo | Conductor | Mi camión |

Las dos empresas no ven los datos de la otra. Crear una empresa, un vendedor o un conductor crea su usuario de ingreso, activo. El administrador ve los usuarios de cada empresa (Empresas › empresa › Usuarios), crea usuarios con perfil empresa y activa o desactiva cualquiera; no se puede desactivar el último usuario empresa activo de una empresa. Un usuario inactivo aparece «Inactivo» en el ingreso y en la guía, y no puede entrar.

## Barra superior y guía del presentador

La **barra superior** es la del producto: ☰, logo, empresa y usuario con sus perfiles, «Guía» y «Salir». En escritorio el menú ☰ es una columna plegable; en el celular es un panel sobre el contenido que se cierra al elegir una opción, con Esc o al tocar fuera.

Los controles del demo están solo en la **Guía** (botón «Guía» o `Ctrl+Shift+D`; en el celular sube como hoja inferior y se cierra con Esc o «Cerrar»):

1. **Usuario activo:** tarjeta con nombre, usuario, empresa y perfiles, y **«Cambiar de usuario»** agrupado por plataforma y empresa. Cambia la sesión sin pasar por el ingreso y abre la pantalla de inicio del usuario; también funciona sin sesión.
2. **Qué puede hacer este usuario:** las opciones de su menú, con enlace, descripción e ítems; se recalcula al cambiar de usuario.
3. **Escenarios** (elegir uno reinicia la demo y abre su paso 1): paso actual con usuario, ruta, qué hacer, qué contar y qué debe verse; «Ingresar como…» si el paso es de otro usuario o «Ir a la pantalla» si es del usuario activo; pasos anterior y siguiente.
   - **ESC-01 · Camino feliz:** carga de $ 1.000.000 → venta con QR → saldo $ 700.000 → pago de $ 500.000 → diferencia de $ 200.000 → cuenta en ceros.
   - **ESC-02 · Cuenta corriente y aplicación de pagos:** pago a la carga más antigua, cobro a la carga de origen y pago partido entre dos cargas.
   - **ESC-03 · Excepciones y aislamiento:** avisos que no bloquean, errores que sí, usuario sin permiso y una empresa que no ve la otra.
4. **Controles:** **Reiniciar demo** (o `Ctrl+Shift+R`; un clic, sin confirmación, vuelve a los datos de ejemplo), interruptor **Trazabilidad** (ítems, reglas y escenarios de cada pantalla) y atajos.

El estado se guarda en el navegador (`gaslink-demo:v1:estado`, preferencias de la guía en `gaslink-demo:v1:guia`); un estado guardado con una versión anterior de la demo se descarta. Si el almacenamiento no está disponible, la demo arranca desde los datos de ejemplo y funciona igual.

## Cómo ejecutar

Requisitos: Node.js 24 (LTS) o superior y npm.

```bash
npm ci
npm start            # http://localhost:4200
npm run build:prod   # salida en dist/gas-link-prototype/browser
```

La publicación en GitHub Pages está en `.github/workflows/pages.yml`: en cada push a `main` verifica lint, pruebas unitarias y de extremo a extremo (Playwright levanta su propio servidor en el puerto 4200), compila con la ruta del repositorio y publica `dist/gas-link-prototype/browser`.

## Pruebas

```bash
npm run lint                     # ESLint (TypeScript y plantillas)
npx jest --ci                    # motor, formatos, almacén, acceso, guía y shell
npx playwright install chromium  # una sola vez
npx playwright test              # recorridos ESC-01, ESC-02 y ESC-03, avisos, aislamiento, menú por usuario, guía, usuarios, prerrequisitos y celular (375 y 360 px)
```

Las pruebas unitarias verifican los valores de control de los datos de ejemplo y de los escenarios ESC-01 y ESC-02, la aplicación por origen y por antigüedad (incluido un pago partido entre cargas), el saldo a favor, el dinero en poder del vendedor, la conciliación, los invariantes de la cuenta, la sesión por usuario con la unión de perfiles, el menú y el inicio de cada usuario, los usuarios de cada empresa y los prerrequisitos guiados.

## Estructura

```text
src/app/
  core/simulation/   motor puro: modelo, datos de ejemplo, comandos, cálculos y formatos (COP, kg, fechas)
  core/state/        almacén con signal() persistido en el navegador
  core/access/       matriz pantalla × perfil, menú ☰ por secciones y guarda de rutas
  demo/              guía del presentador (usuario activo, qué puede hacer, escenarios ESC-01..03, controles) y trazabilidad
  features/          las 35 pantallas, por área (empresas, catálogo, flota, cargue, cuenta, conciliación, venta, cobro, montos)
  shared/            QR de muestra, etiquetas, rótulo «Ilustrativo», migas de pan, aviso de parámetro ajeno y formatos
tests/               pruebas de extremo a extremo (Playwright)
```

## Licencia

Propiedad de IT2EX; todos los derechos reservados (ver `LICENSE`). Los avisos de componentes de terceros están en `THIRD_PARTY_NOTICES.md`.
