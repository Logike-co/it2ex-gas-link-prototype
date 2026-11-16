/**
 * Guiones de los escenarios precargados ESC-01..ESC-03 (flow-map §6). Cada escenario parte de
 * la semilla: al elegirlo, la demo se reinicia y la guía va al paso 1. Los números esperados
 * son los valores de control de §6.2 a §6.4.
 */
import { ViewId } from '../core/access/access';
import { Perfil } from '../core/simulation/model';

export type PresetId = 'ESC-01' | 'ESC-02' | 'ESC-03';

export interface DemoStep {
  n: string;
  title: string;
  view: ViewId;
  /** Ruta de la vista, sin «/» inicial; puede llevar parámetros (`?vendedor=VEN-A1`). */
  route: string;
  /** Usuario demo y perfil con que se hace el paso: la guía ofrece «Ingresar como…». */
  user: string;
  perfil: Perfil;
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
      route: 'admin/empresas',
      user: 'usr-andrea',
      perfil: 'administrador',
      items: ['F01'],
      actions: ['Muestra las dos empresas.'],
      say: 'GasLink sirve a varias empresas distribuidoras; cada una ve solo lo suyo.',
      expect: ['2 empresas, ambas «Configuración completa».'],
    },
    {
      n: '1',
      title: 'Catálogo, llave y flota de la empresa',
      view: 'V03',
      route: 'empresa/catalogo',
      user: 'usr-paula',
      perfil: 'empresa',
      items: ['F02', 'F03', 'F04'],
      actions: ['Muestra los precios y la llave @gascondor.demo.', 'Abre Flota y muestra a Ramiro Cárdenas con GLK 101.'],
      say: 'La empresa define lo que le cobra al vendedor por cada cilindro y la llave donde recibe los pagos.',
      expect: ['Catálogo 170.000 · 82.500 · 65.000 con «Ilustrativo».', 'Ramiro Cárdenas «Sin cargas».'],
    },
    {
      n: '2',
      title: 'Cargue a Ramiro en GLK 101',
      view: 'V05',
      route: 'empresa/cargue',
      user: 'usr-paula',
      perfil: 'empresa',
      items: ['F05'],
      actions: ['Elige Ramiro Cárdenas · GLK 101 · Ramiro Cárdenas.', 'Escribe 2 de 100 lb y 8 de 40 lb.', 'Pulsa «Registrar carga».'],
      say: 'Cada carga suma a lo que el vendedor le debe a la empresa, con su peso y su valor consolidado.',
      expect: ['Vista previa 235,6 kg y $ 1.000.000.', 'Aviso «Carga CAR-A-004 registrada».'],
    },
    {
      n: '3',
      title: 'Venta con precio libre desde el camión',
      view: 'V06',
      route: 'conductor/venta',
      user: 'usr-ramiro',
      perfil: 'conductor',
      items: ['F06'],
      actions: ['Escribe 1 de 100 lb y 6 de 40 lb.', 'Valor de la venta $ 750.000.', 'Pulsa «Registrar venta».'],
      say: 'El vendedor conserva su precio y sus clientes: la plataforma no pide datos del cliente.',
      expect: ['Antes: GLK 101 100 lb 2 / 40 lb 8. Después: 1 / 2.', 'VTA-A-004 «Por cobrar».'],
    },
    {
      n: '4',
      title: 'QR de la empresa y del vendedor',
      view: 'V07',
      route: 'conductor/cobro?venta=VTA-A-004',
      user: 'usr-ramiro',
      perfil: 'conductor',
      items: ['F06', 'F06b'],
      actions: ['Elige «Ambos».', 'Empresa $ 300.000, vendedor $ 150.000.'],
      say: 'Lo que el cliente paga a la llave de la empresa ya es de la empresa y no pasa por el conductor.',
      expect: ['Dos QR de muestra.', '«Resto en efectivo: $ 300.000».'],
    },
    {
      n: '5',
      title: 'Registro de lo recibido',
      view: 'V08',
      route: 'conductor/montos?venta=VTA-A-004',
      user: 'usr-ramiro',
      perfil: 'conductor',
      items: ['F07'],
      actions: [
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
      view: 'V09',
      route: 'cuenta',
      user: 'usr-ramiro',
      perfil: 'vendedor',
      items: ['F08', 'F08b'],
      actions: ['Revisa el resumen y la carga CAR-A-004.', 'Pulsa «Informe».'],
      say: 'El vendedor ve cuánto debe en total y por carga, y cuánto dinero tiene en su poder.',
      expect: ['Cargado $ 1.000.000 · abonado $ 300.000 · saldo $ 700.000.', 'En su poder $ 450.000.', 'CAR-A-004 «Con saldo».'],
    },
    {
      n: '7a',
      title: 'Conciliación: la referencia llegó',
      view: 'V10',
      route: 'empresa/conciliacion?vendedor=VEN-A1',
      user: 'usr-paula',
      perfil: 'empresa',
      items: ['F09'],
      actions: ['Revisa la referencia BRB-DEMO-1001.', 'Pulsa «Llegó» en COB-A-005.'],
      say: 'La empresa marca lo que ya vio en su cuenta; el saldo no cambia, cambia la confirmación.',
      expect: ['Vendido $ 1.000.000 · pagado $ 300.000 (confirmado) · pendiente $ 700.000.'],
    },
    {
      n: '7b',
      title: 'Pago del vendedor por transferencia',
      view: 'V10',
      route: 'empresa/conciliacion?vendedor=VEN-A1',
      user: 'usr-paula',
      perfil: 'empresa',
      items: ['F10'],
      actions: ['«Registrar pago»: transferencia $ 500.000, ref. TRF-DEMO-1001.'],
      say: 'El pago del vendedor se aplica a la carga más antigua con saldo.',
      expect: ['PAG-A-002 · «Aplicado: CAR-A-004 $ 500.000».', 'Pendiente $ 200.000.'],
    },
    {
      n: '7c',
      title: 'Pagar la diferencia',
      view: 'V10',
      route: 'empresa/conciliacion?vendedor=VEN-A1',
      user: 'usr-paula',
      perfil: 'empresa',
      items: ['F10'],
      actions: ['Pulsa «Pagar el saldo».', 'Según acuerdo: «Efectivo entregado en la bodega».', 'Guarda.'],
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
      view: 'V09',
      route: 'cuenta',
      user: 'usr-doris',
      perfil: 'vendedor',
      items: ['F08'],
      actions: ['Muestra la cuenta.'],
      say: 'Dos cargas pendientes, una por camión.',
      expect: ['Cargado $ 1.000.000 · saldo $ 1.000.000.', 'CAR-A-002 $ 600.000 y CAR-A-003 $ 400.000 «Pendiente».', 'En poder $ 390.000.'],
    },
    {
      n: '2',
      title: 'Pago a la carga más antigua',
      view: 'V10',
      route: 'empresa/conciliacion?vendedor=VEN-A2',
      user: 'usr-paula',
      perfil: 'empresa',
      items: ['F10'],
      actions: ['«Registrar pago»: transferencia $ 500.000, ref. TRF-DEMO-2001.'],
      say: 'El pago del vendedor va a la carga más antigua con saldo.',
      expect: ['«Aplicado: CAR-A-002 $ 500.000».', 'CAR-A-002 $ 100.000 · CAR-A-003 $ 400.000.'],
    },
    {
      n: '3',
      title: 'Venta desde GLK 103 cobrada a la llave de la empresa',
      view: 'V06',
      route: 'conductor/venta',
      user: 'usr-yesid',
      perfil: 'conductor',
      items: ['F06', 'F06b', 'F07'],
      actions: ['1 de 30 lb, $ 75.000.', 'QR de la empresa.', 'Registra $ 75.000 con ref. BRB-DEMO-3001.'],
      say: 'Este cilindro salió de la carga CAR-A-003.',
      expect: ['VTA-A-004 «Cobrada».', 'GLK 103: 30 lb queda en 0.'],
    },
    {
      n: '4',
      title: 'El cobro va a la carga de origen',
      view: 'V09',
      route: 'cuenta',
      user: 'usr-doris',
      perfil: 'vendedor',
      items: ['F08'],
      actions: ['Abre el detalle de CAR-A-003.'],
      say: 'Aunque CAR-A-002 es más antigua, el cobro va a CAR-A-003 porque el producto salió de ahí.',
      expect: ['COB-A-005 «origen» → CAR-A-003 $ 325.000.', 'CAR-A-002 sigue en $ 100.000.', 'Saldo $ 425.000.'],
    },
    {
      n: '5',
      title: 'Un pago se parte entre dos cargas',
      view: 'V10',
      route: 'empresa/conciliacion?vendedor=VEN-A2',
      user: 'usr-paula',
      perfil: 'empresa',
      items: ['F10'],
      actions: ['«Registrar pago»: transferencia $ 250.000, ref. TRF-DEMO-2002.'],
      say: 'Lo que sobra al saldar una carga sigue a la siguiente.',
      expect: ['«Aplicado: CAR-A-002 $ 100.000 · CAR-A-003 $ 150.000».', 'CAR-A-002 «Saldada» · CAR-A-003 $ 175.000.'],
    },
    {
      n: '6',
      title: 'Pagar el saldo (opcional)',
      view: 'V10',
      route: 'empresa/conciliacion?vendedor=VEN-A2',
      user: 'usr-paula',
      perfil: 'empresa',
      items: ['F10'],
      actions: ['«Pagar el saldo» $ 175.000, ref. TRF-DEMO-2003.'],
      say: 'La cuenta corriente queda en ceros.',
      expect: ['Saldo $ 0 · Transportes Lucero «Al día».'],
    },
  ],
};

const ESC_03: DemoPreset = {
  id: 'ESC-03',
  name: 'Excepciones y aislamiento',
  summary: 'Avisos que no bloquean, errores que sí, perfil sin permiso y una empresa que no ve la otra.',
  steps: [
    {
      n: '1',
      title: 'Vender más de lo que queda',
      view: 'V06',
      route: 'conductor/venta',
      user: 'usr-wilson',
      perfil: 'conductor',
      items: ['F06'],
      actions: ['2 de 100 lb con 1 en existencia.', 'Valor $ 400.000.', '«Registrar de todas formas».'],
      say: 'La plataforma avisa, pero no frena la venta del vendedor.',
      expect: ['Aviso de existencias.', 'VTA-A-004 creada; GLK 102 100 lb: −1.', 'CAR-A-002 «Sobrevendida».'],
    },
    {
      n: '2',
      title: 'Monto inválido y cobro sin referencia',
      view: 'V07',
      route: 'conductor/cobro',
      user: 'usr-wilson',
      perfil: 'conductor',
      items: ['F06b', 'F07'],
      actions: ['QR de la empresa $ 400.000.', 'En montos escribe 0 → error.', 'Luego $ 400.000 sin referencia → «Guardar sin referencia».'],
      say: 'Un monto en cero no se guarda; la referencia se pide con insistencia, sin bloquear.',
      expect: ['Error «El monto debe ser mayor que cero».', 'COB-A-005 «Sin referencia».'],
    },
    {
      n: '3',
      title: 'Perfil sin permiso',
      view: 'V06',
      route: 'conductor/venta',
      user: 'usr-wilson',
      perfil: 'conductor',
      items: ['D01'],
      actions: ['Escribe /empresa/conciliacion en la barra del navegador.'],
      say: 'Cada perfil ve solo sus pantallas.',
      expect: ['Vuelve a /conductor/venta con «Tu perfil no tiene acceso a esa pantalla».'],
    },
    {
      n: '4',
      title: 'Alertas y errores de la empresa',
      view: 'V10',
      route: 'empresa/conciliacion?vendedor=VEN-A2',
      user: 'usr-paula',
      perfil: 'empresa',
      items: ['F09', 'F10'],
      actions: ['Mira la alerta.', 'Intenta un pago de $ 700.000.', 'Luego una transferencia de $ 100.000 sin referencia.'],
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
      view: 'V09',
      route: 'cuenta?vendedor=VEN-B1',
      user: 'usr-paula',
      perfil: 'empresa',
      items: ['F08'],
      actions: ['Escribe /cuenta?vendedor=VEN-B1.'],
      say: 'La empresa activa sale de la sesión, nunca de la URL.',
      expect: ['«Ese vendedor no existe en Gas Cóndor Demo».'],
    },
    {
      n: '6',
      title: 'La otra empresa',
      view: 'V10',
      route: 'empresa/conciliacion',
      user: 'usr-jorge',
      perfil: 'empresa',
      items: ['F09'],
      actions: ['Muestra la conciliación de Gas Ceiba Demo.'],
      say: 'Gas Ceiba Demo no ve nada de Gas Cóndor Demo.',
      expect: ['Solo Hernán Rojas y Distribuciones El Trébol.', 'Totales $ 1.195.000 / $ 175.000 / $ 1.020.000.'],
    },
  ],
};

export const PRESETS: readonly DemoPreset[] = [ESC_01, ESC_02, ESC_03];

export const presetById = (id: PresetId): DemoPreset => PRESETS.find((p) => p.id === id) ?? ESC_01;

/**
 * Paso del guion que corresponde a una vista: el actual si ya la usa; si no, el siguiente que
 * la use; si no hay ninguno más adelante, el último anterior. −1 si la vista no está en el guion.
 */
export function stepForView(steps: readonly DemoStep[], current: number, view: ViewId): number {
  if (steps[current]?.view === view) return current;
  const next = steps.findIndex((s, i) => i > current && s.view === view);
  if (next >= 0) return next;
  for (let i = current - 1; i >= 0; i--) {
    if (steps[i].view === view) return i;
  }
  return -1;
}
