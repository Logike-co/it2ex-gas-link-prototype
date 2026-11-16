/**
 * Guiones de los escenarios precargados ESC-01..ESC-03 (flow-map §6). Cada escenario parte de
 * la semilla: al elegirlo, la demo se reinicia y la guía va al paso 1. Los números esperados
 * son los valores de control de §6.2 a §6.4.
 */
import { ViewId } from '../core/access/access';

export type PresetId = 'ESC-01' | 'ESC-02' | 'ESC-03';

export interface DemoStep {
  n: string;
  title: string;
  /** Pantalla donde arranca el paso (la de `route`). */
  view: ViewId;
  /** Otras pantallas por las que pasa el paso: la guía lo sigue también en ellas. */
  also?: ViewId[];
  /** Ruta de la pantalla, sin «/» inicial; puede llevar parámetros (`?vendedor=VEN-A1`). */
  route: string;
  /** Usuario demo con que se hace el paso (la sesión es por usuario): la guía ofrece «Ingresar como…». */
  user: string;
  items: string[];
  /** Acción del presentador: clics y datos exactos. */
  actions: string[];
  /** Narrativa sugerida. */
  say: string;
  /** Resultado esperado en pantalla. */
  expect: string[];
}

export interface DemoPreset {
  id: PresetId;
  name: string;
  summary: string;
  steps: DemoStep[];
}

const ESC_01: DemoPreset = {
  id: 'ESC-01',
  name: 'Camino feliz: de la carga a la cuenta en ceros',
  summary: 'Carga $ 1.000.000 → cobros → saldo $ 700.000 → pago $ 500.000 → diferencia $ 200.000 → ceros.',
  steps: [
    {
      n: '0',
      title: 'Las empresas de la plataforma (opcional)',
      view: 'V02',
      also: ['V04', 'V05'],
      route: 'admin/empresas',
      user: 'usr-andrea',
      items: ['F01'],
      actions: ['Muestra las dos empresas.', 'Si hay tiempo, abre Gas Cóndor Demo y pulsa «Usuarios».'],
      say: 'GasLink sirve a varias empresas distribuidoras; cada una ve solo lo suyo y la plataforma administra sus usuarios.',
      expect: ['2 empresas, ambas «Configuración completa».', 'Si se abre: 7 usuarios de Gas Cóndor Demo, todos «Activo».'],
    },
    {
      n: '1',
      title: 'Catálogo, llave y flota de la empresa',
      view: 'V07',
      also: ['V08', 'V09', 'V11'],
      route: 'empresa/configuracion/catalogo',
      user: 'usr-paula',
      items: ['F02', 'F03', 'F04'],
      actions: [
        'Por el menú ☰: «Configuración › Catálogo de cilindros» y muestra los precios.',
        '«Configuración › Llave de cobro»: la llave @gascondor.demo.',
        '«Flota › Vendedores» › Ramiro Cárdenas, con GLK 101.',
      ],
      say: 'La empresa define lo que le cobra al vendedor por cada cilindro y la llave donde recibe los pagos.',
      expect: ['Catálogo 170.000 · 82.500 · 65.000 con «Ilustrativo».', 'Ramiro Cárdenas «Sin cargas».'],
    },
    {
      n: '2',
      title: 'Cargue a Ramiro en GLK 101',
      view: 'V16',
      also: ['V17', 'V18'],
      route: 'empresa/cargues',
      user: 'usr-paula',
      items: ['F05'],
      actions: [
        '«Operación › Cargues» › «Nuevo cargue».',
        'Elige Ramiro Cárdenas · GLK 101 · Ramiro Cárdenas.',
        'Escribe 2 de 100 lb y 8 de 40 lb.',
        'Pulsa «Registrar carga».',
      ],
      say: 'Cada carga suma a lo que el vendedor le debe a la empresa, con su peso y su valor consolidado.',
      expect: ['Vista previa 235,6 kg y $ 1.000.000.', 'Aviso «Carga CAR-A-004 registrada».', 'Se abre el detalle de CAR-A-004.'],
    },
    {
      n: '3',
      title: 'Venta con precio libre desde el camión',
      view: 'V31',
      also: ['V33'],
      route: 'conductor/ventas/nueva',
      user: 'usr-ramiro',
      items: ['F06'],
      actions: ['«Venta en calle › Nueva venta».', 'Escribe 1 de 100 lb y 6 de 40 lb.', 'Valor de la venta $ 750.000.', 'Pulsa «Registrar venta».'],
      say: 'El vendedor conserva su precio y sus clientes: la plataforma no pide datos del cliente.',
      expect: ['Antes: GLK 101 100 lb 2 / 40 lb 8. Después: 1 / 2.', 'VTA-A-004 «Por cobrar».'],
    },
    {
      n: '4',
      title: 'QR de la empresa y del vendedor',
      view: 'V34',
      route: 'conductor/ventas/VTA-A-004/cobro',
      user: 'usr-ramiro',
      items: ['F06', 'F06b'],
      actions: ['En el detalle de la venta, «Cobrar con QR».', 'Elige «Ambos».', 'Empresa $ 300.000, vendedor $ 150.000.'],
      say: 'Lo que el cliente paga a la llave de la empresa ya es de la empresa y no pasa por el conductor.',
      expect: ['Dos QR de muestra.', '«Resto en efectivo: $ 300.000».'],
    },
    {
      n: '5',
      title: 'Registro de lo recibido',
      view: 'V35',
      also: ['V33'],
      route: 'conductor/ventas/VTA-A-004/montos',
      user: 'usr-ramiro',
      items: ['F07'],
      actions: [
        '«Registrar lo recibido».',
        'Llave de la empresa $ 300.000, ref. BRB-DEMO-1001.',
        'Llave del vendedor $ 150.000, ref. BRB-DEMO-1002.',
        'Efectivo $ 300.000.',
        'Pulsa «Guardar cobros».',
      ],
      say: 'Cada cobro queda con su medio y su referencia, para que la empresa pueda cuadrar.',
      expect: ['COB-A-005 a COB-A-007.', 'VTA-A-004 «Cobrada».'],
    },
    {
      n: '6',
      title: 'Cuenta de Ramiro e informe',
      view: 'V26',
      also: ['V29'],
      route: 'vendedor/cuenta',
      user: 'usr-ramiro',
      items: ['F08', 'F08b'],
      actions: ['Sin cambiar de usuario: «Mi cuenta › Resumen».', 'Revisa la carga CAR-A-004.', '«Mi cuenta › Informe».'],
      say: 'El vendedor ve cuánto debe en total y por carga, y cuánto dinero tiene en su poder. Ramiro hace todo con una sola sesión.',
      expect: ['Cargado $ 1.000.000 · abonado $ 300.000 · saldo $ 700.000.', 'En su poder $ 450.000.', 'CAR-A-004 «Con saldo».'],
    },
    {
      n: '7a',
      title: 'Conciliación: la referencia llegó',
      view: 'V22',
      also: ['V23'],
      route: 'empresa/conciliacion',
      user: 'usr-paula',
      items: ['F09'],
      actions: ['«Cartera › Conciliación» › Ramiro Cárdenas.', 'Revisa la referencia BRB-DEMO-1001.', 'Pulsa «Llegó» en COB-A-005.'],
      say: 'La empresa marca lo que ya vio en su cuenta; el saldo no cambia, cambia la confirmación.',
      expect: ['Vendido $ 1.000.000 · pagado $ 300.000 (confirmado) · pendiente $ 700.000.'],
    },
    {
      n: '7b',
      title: 'Pago del vendedor por transferencia',
      view: 'V25',
      also: ['V23'],
      route: 'empresa/pagos/nuevo?vendedor=VEN-A1',
      user: 'usr-paula',
      items: ['F10'],
      actions: ['En la conciliación de Ramiro, «Registrar pago»: transferencia $ 500.000, ref. TRF-DEMO-1001.'],
      say: 'El pago del vendedor se aplica a la carga más antigua con saldo.',
      expect: ['PAG-A-002 · «Aplicado: CAR-A-004 $ 500.000».', 'Pendiente $ 200.000.'],
    },
    {
      n: '7c',
      title: 'Pagar la diferencia',
      view: 'V25',
      also: ['V23', 'V22'],
      route: 'empresa/pagos/nuevo?vendedor=VEN-A1',
      user: 'usr-paula',
      items: ['F10'],
      actions: ['«Registrar pago» · «Pagar el saldo».', 'Según acuerdo: «Efectivo entregado en la bodega».', 'Guarda y abre «Cartera › Conciliación».'],
      say: 'La cuenta queda en ceros y la carga saldada; la empresa sabe en todo momento cuánto le debe cada vendedor.',
      expect: [
        'PAG-A-003 $ 200.000 · pendiente $ 0.',
        'CAR-A-004 «Saldada» · Ramiro «Al día».',
        'Totales: vendido $ 2.330.000, pagado $ 1.330.000, pendiente $ 1.000.000.',
      ],
    },
  ],
};

const ESC_02: DemoPreset = {
  id: 'ESC-02',
  name: 'Cuenta corriente y aplicación de pagos',
  summary: 'Opción C: pago a la carga más antigua, cobro a la carga de origen, pago partido entre dos cargas.',
  steps: [
    {
      n: '1',
      title: 'Cuenta de Transportes Lucero',
      view: 'V26',
      route: 'vendedor/cuenta',
      user: 'usr-doris',
      items: ['F08'],
      actions: ['Muestra la cuenta («Mi cuenta › Resumen»).'],
      say: 'Dos cargas pendientes, una por camión.',
      expect: ['Cargado $ 1.000.000 · saldo $ 1.000.000.', 'CAR-A-002 $ 600.000 y CAR-A-003 $ 400.000 «Pendiente».', 'En poder $ 390.000.'],
    },
    {
      n: '2',
      title: 'Pago a la carga más antigua',
      view: 'V23',
      also: ['V25'],
      route: 'empresa/conciliacion/VEN-A2',
      user: 'usr-paula',
      items: ['F10'],
      actions: ['«Registrar pago»: transferencia $ 500.000, ref. TRF-DEMO-2001.'],
      say: 'El pago del vendedor va a la carga más antigua con saldo.',
      expect: ['«Aplicado: CAR-A-002 $ 500.000».', 'CAR-A-002 $ 100.000 · CAR-A-003 $ 400.000.'],
    },
    {
      n: '3',
      title: 'Venta desde GLK 103 cobrada a la llave de la empresa',
      view: 'V31',
      also: ['V33', 'V34', 'V35'],
      route: 'conductor/ventas/nueva',
      user: 'usr-yesid',
      items: ['F06', 'F06b', 'F07'],
      actions: ['1 de 30 lb, $ 75.000, «Registrar venta».', '«Cobrar con QR»: QR de la empresa.', '«Registrar lo recibido»: $ 75.000 con ref. BRB-DEMO-3001.'],
      say: 'Este cilindro salió de la carga CAR-A-003.',
      expect: ['VTA-A-004 «Cobrada».', 'GLK 103: 30 lb queda en 0.'],
    },
    {
      n: '4',
      title: 'El cobro va a la carga de origen',
      view: 'V26',
      also: ['V27'],
      route: 'vendedor/cuenta',
      user: 'usr-doris',
      items: ['F08'],
      actions: ['Abre el detalle de CAR-A-003 desde el resumen.'],
      say: 'Aunque CAR-A-002 es más antigua, el cobro va a CAR-A-003 porque el producto salió de ahí.',
      expect: ['COB-A-005 «origen» → CAR-A-003 $ 325.000.', 'CAR-A-002 sigue en $ 100.000.', 'Saldo $ 425.000.'],
    },
    {
      n: '5',
      title: 'Un pago se parte entre dos cargas',
      view: 'V23',
      also: ['V25'],
      route: 'empresa/conciliacion/VEN-A2',
      user: 'usr-paula',
      items: ['F10'],
      actions: ['«Registrar pago»: transferencia $ 250.000, ref. TRF-DEMO-2002.'],
      say: 'Lo que sobra al saldar una carga sigue a la siguiente.',
      expect: ['«Aplicado: CAR-A-002 $ 100.000 · CAR-A-003 $ 150.000».', 'CAR-A-002 «Saldada» · CAR-A-003 $ 175.000.'],
    },
    {
      n: '6',
      title: 'Pagar el saldo (opcional)',
      view: 'V25',
      also: ['V23'],
      route: 'empresa/pagos/nuevo?vendedor=VEN-A2',
      user: 'usr-paula',
      items: ['F10'],
      actions: ['«Registrar pago» · «Pagar el saldo» $ 175.000, ref. TRF-DEMO-2003.'],
      say: 'La cuenta corriente queda en ceros.',
      expect: ['Saldo $ 0 · Transportes Lucero «Al día».'],
    },
  ],
};

const ESC_03: DemoPreset = {
  id: 'ESC-03',
  name: 'Excepciones y aislamiento',
  summary: 'Avisos que no bloquean, errores que sí, usuario sin permiso y una empresa que no ve la otra.',
  steps: [
    {
      n: '1',
      title: 'Vender más de lo que queda',
      view: 'V31',
      also: ['V33'],
      route: 'conductor/ventas/nueva',
      user: 'usr-wilson',
      items: ['F06'],
      actions: ['2 de 100 lb con 1 en existencia.', 'Valor $ 400.000.', '«Registrar de todas formas».'],
      say: 'La plataforma avisa, pero no frena la venta del vendedor.',
      expect: ['Aviso de existencias.', 'VTA-A-004 creada; GLK 102 100 lb: −1.', 'CAR-A-002 «Sobrevendida».'],
    },
    {
      n: '2',
      title: 'Monto inválido y cobro sin referencia',
      view: 'V34',
      also: ['V35'],
      route: 'conductor/ventas/VTA-A-004/cobro',
      user: 'usr-wilson',
      items: ['F06b', 'F07'],
      actions: [
        'Desde el detalle de la venta, «Cobrar con QR»: QR de la empresa $ 400.000.',
        '«Registrar lo recibido»: escribe 0 → error.',
        'Luego $ 400.000 sin referencia → «Guardar sin referencia».',
      ],
      say: 'Un monto en cero no se guarda; la referencia se pide con insistencia, sin bloquear.',
      expect: ['Error «El monto debe ser mayor que cero».', 'COB-A-005 «Sin referencia».'],
    },
    {
      n: '3',
      title: 'Usuario sin permiso',
      view: 'V30',
      route: 'conductor/camion',
      user: 'usr-wilson',
      items: ['D01'],
      actions: ['Escribe /empresa/conciliacion en la barra del navegador.'],
      say: 'Cada usuario ve solo las pantallas de sus perfiles.',
      expect: ['Vuelve a /conductor/camion con «Tu perfil no tiene acceso a esa pantalla».'],
    },
    {
      n: '4',
      title: 'Alertas y errores de la empresa',
      view: 'V22',
      also: ['V23', 'V25'],
      route: 'empresa/conciliacion',
      user: 'usr-paula',
      items: ['F09', 'F10'],
      actions: [
        'Mira la alerta de Transportes Lucero y abre su conciliación.',
        '«Registrar pago»: intenta un pago de $ 700.000.',
        'Luego una transferencia de $ 100.000 sin referencia.',
      ],
      say: 'A la empresa sí se le exige: no puede registrar de más ni sin referencia.',
      expect: [
        'Alerta «1 cobro sin referencia».',
        'Pendiente $ 600.000 (CAR-A-002 $ 200.000 · CAR-A-003 $ 400.000).',
        '«El pago supera lo que debe el vendedor ($ 600.000)» y «Escribe la referencia de la transferencia».',
      ],
    },
    {
      n: '5',
      title: 'Un vendedor de la otra empresa',
      view: 'V20',
      route: 'empresa/cuentas/VEN-B1',
      user: 'usr-paula',
      items: ['F08'],
      actions: ['Escribe /empresa/cuentas/VEN-B1.'],
      say: 'La empresa activa sale de la sesión, nunca de la URL.',
      expect: ['«Ese vendedor no existe en Gas Cóndor Demo».'],
    },
    {
      n: '6',
      title: 'La otra empresa',
      view: 'V22',
      route: 'empresa/conciliacion',
      user: 'usr-jorge',
      items: ['F09'],
      actions: ['Muestra la conciliación de Gas Ceiba Demo.'],
      say: 'Gas Ceiba Demo no ve nada de Gas Cóndor Demo.',
      expect: ['Solo Hernán Rojas y Distribuciones El Trébol.', 'Totales $ 1.195.000 / $ 175.000 / $ 1.020.000.'],
    },
  ],
};

export const PRESETS: readonly DemoPreset[] = [ESC_01, ESC_02, ESC_03];

export const presetById = (id: PresetId): DemoPreset => PRESETS.find((p) => p.id === id) ?? ESC_01;

/** El paso usa la pantalla: es la suya o una de las que recorre. */
const usa = (s: DemoStep, view: ViewId): boolean => s.view === view || !!s.also?.includes(view);

/**
 * Paso del guion que corresponde a una pantalla: el actual si ya la usa; si no, el siguiente
 * que la use; si no hay ninguno más adelante, el último anterior. −1 si no está en el guion.
 */
export function stepForView(steps: readonly DemoStep[], current: number, view: ViewId): number {
  if (steps[current] && usa(steps[current], view)) return current;
  const next = steps.findIndex((s, i) => i > current && usa(s, view));
  if (next >= 0) return next;
  for (let i = current - 1; i >= 0; i--) {
    if (usa(steps[i], view)) return i;
  }
  return -1;
}
