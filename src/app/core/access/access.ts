import { Perfil, PERFILES } from '../simulation/model';
import { pathOf } from '../../views';

/**
 * Matriz de acceso pantalla × perfil (flow-map §1.4). Es la fuente única de la guarda de rutas,
 * del menú ☰, de la pantalla de inicio y de los botones de cada pantalla (ALC-01). Un usuario
 * con dos perfiles ve la unión de sus columnas (R-15).
 */
export const VIEW_IDS = [
  'V01', 'V02', 'V03', 'V04', 'V05', 'V06', 'V07', 'V08', 'V09', 'V10',
  'V11', 'V12', 'V13', 'V14', 'V15', 'V16', 'V17', 'V18', 'V19', 'V20',
  'V21', 'V22', 'V23', 'V24', 'V25', 'V26', 'V27', 'V28', 'V29', 'V30',
  'V31', 'V32', 'V33', 'V34', 'V35',
] as const;

export type ViewId = (typeof VIEW_IDS)[number];

const ADMIN: readonly Perfil[] = ['administrador'];
const EMPRESA: readonly Perfil[] = ['empresa'];
const VENDEDOR: readonly Perfil[] = ['vendedor'];
const CONDUCTOR: readonly Perfil[] = ['conductor'];

export const VIEW_ACCESS: Record<ViewId, readonly Perfil[]> = {
  V01: [],
  V02: ADMIN,
  V03: ADMIN,
  V04: ADMIN,
  V05: ADMIN,
  V06: ADMIN,
  V07: EMPRESA,
  V08: EMPRESA,
  V09: EMPRESA,
  V10: EMPRESA,
  V11: EMPRESA,
  V12: EMPRESA,
  V13: EMPRESA,
  V14: EMPRESA,
  V15: EMPRESA,
  V16: EMPRESA,
  V17: EMPRESA,
  V18: EMPRESA,
  V19: EMPRESA,
  V20: EMPRESA,
  V21: EMPRESA,
  V22: EMPRESA,
  V23: EMPRESA,
  V24: EMPRESA,
  V25: EMPRESA,
  V26: VENDEDOR,
  V27: VENDEDOR,
  V28: VENDEDOR,
  V29: VENDEDOR,
  V30: CONDUCTOR,
  V31: CONDUCTOR,
  V32: CONDUCTOR,
  V33: CONDUCTOR,
  V34: CONDUCTOR,
  V35: CONDUCTOR,
};

/** Acciones restringidas dentro de las pantallas (§1.4). */
export type AccessAction =
  | 'empresa.crear'
  | 'usuario.crear'
  | 'usuario.cambiarEstado'
  | 'catalogo.editar'
  | 'flota.editar'
  | 'carga.registrar'
  | 'cobro.marcarLlegada'
  | 'pago.registrar'
  | 'venta.registrar'
  | 'cobro.registrar';

export const ACTION_ACCESS: Record<AccessAction, readonly Perfil[]> = {
  'empresa.crear': ADMIN,
  'usuario.crear': ADMIN,
  'usuario.cambiarEstado': ADMIN,
  'catalogo.editar': EMPRESA,
  'flota.editar': EMPRESA,
  'carga.registrar': EMPRESA,
  'cobro.marcarLlegada': EMPRESA,
  'pago.registrar': EMPRESA,
  'venta.registrar': CONDUCTOR,
  'cobro.registrar': CONDUCTOR,
};

/** Opción del menú ☰, con la descripción y los ítems que muestra «Qué puede hacer este usuario» (§8.2). */
export interface MenuOpcion {
  view: ViewId;
  label: string;
  descripcion: string;
  items: readonly string[];
}

export interface MenuSeccion {
  seccion: string;
  opciones: readonly MenuOpcion[];
}

/** Menú ☰ por perfil, con secciones y etiquetas exactas (§1.2). */
export const MENU: Record<Perfil, readonly MenuSeccion[]> = {
  administrador: [
    {
      seccion: 'Plataforma',
      opciones: [{ view: 'V02', label: 'Empresas', descripcion: 'Crear empresas y administrar sus usuarios.', items: ['F01'] }],
    },
  ],
  empresa: [
    {
      seccion: 'Operación',
      opciones: [{ view: 'V16', label: 'Cargues', descripcion: 'Registrar lo que sale en cada camión, con su peso y su valor.', items: ['F05'] }],
    },
    {
      seccion: 'Cartera',
      opciones: [
        {
          view: 'V19',
          label: 'Cuentas de vendedores',
          descripcion: 'Ver cuánto debe cada vendedor, en total y por carga, con su informe.',
          items: ['F08', 'F08b'],
        },
        { view: 'V22', label: 'Conciliación', descripcion: 'Cuadrar referencias y marcar los pagos que llegaron.', items: ['F09'] },
        { view: 'V24', label: 'Pagos de vendedores', descripcion: 'Registrar y consultar los pagos de los vendedores.', items: ['F10'] },
      ],
    },
    {
      seccion: 'Flota',
      opciones: [
        { view: 'V09', label: 'Vendedores', descripcion: 'Vendedores con su llave, sus camiones y sus conductores.', items: ['F04'] },
        { view: 'V12', label: 'Camiones', descripcion: 'Camiones por placa y dueño.', items: ['F04'] },
        { view: 'V14', label: 'Conductores', descripcion: 'Conductores, su vendedor y su camión.', items: ['F04'] },
      ],
    },
    {
      seccion: 'Configuración',
      opciones: [
        { view: 'V07', label: 'Catálogo de cilindros', descripcion: 'Peso y valor al vendedor de cada cilindro.', items: ['F02'] },
        { view: 'V08', label: 'Llave de cobro', descripcion: 'Llave donde la empresa recibe los pagos.', items: ['F03'] },
      ],
    },
  ],
  vendedor: [
    {
      seccion: 'Mi cuenta',
      opciones: [
        { view: 'V26', label: 'Resumen', descripcion: 'Tu saldo, tus cargas y el dinero en tu poder.', items: ['F08'] },
        { view: 'V28', label: 'Movimientos', descripcion: 'Tu cuenta corriente con saldo corrido.', items: ['F08'] },
        { view: 'V29', label: 'Informe', descripcion: 'Informe imprimible de tu cuenta.', items: ['F08b'] },
      ],
    },
  ],
  conductor: [
    {
      seccion: 'Venta en calle',
      opciones: [
        { view: 'V30', label: 'Mi camión', descripcion: 'Lo que traes en el camión.', items: ['F06'] },
        { view: 'V31', label: 'Nueva venta', descripcion: 'Registrar una venta con precio libre.', items: ['F06'] },
        {
          view: 'V32',
          label: 'Mis ventas',
          descripcion: 'Tus ventas; desde cada una, cobrar con QR y registrar lo recibido.',
          items: ['F06', 'F06b', 'F07'],
        },
      ],
    },
  ],
};

/** Perfiles sin repetir, en el orden de SUP-27: administrador, empresa, vendedor, conductor. */
const ordenados = (perfiles: readonly Perfil[]): Perfil[] => PERFILES.filter((p) => perfiles.includes(p));

/** R-15: el menú del usuario es la concatenación de las secciones de sus perfiles. */
export const menuDe = (perfiles: readonly Perfil[]): MenuSeccion[] => ordenados(perfiles).flatMap((p) => MENU[p]);

/** R-15, SUP-24: la pantalla de inicio es la primera opción del menú. */
export const inicioDe = (perfiles: readonly Perfil[]): string => {
  const primera = menuDe(perfiles)[0]?.opciones[0];
  return primera ? '/' + pathOf(primera.view) : '/ingreso';
};

/** R-15: ve una pantalla si alguno de sus perfiles puede. */
export const canView = (perfiles: readonly Perfil[], view: ViewId): boolean =>
  view === 'V01' || perfiles.some((p) => VIEW_ACCESS[view].includes(p));

/** R-15: hace una acción si alguno de sus perfiles puede. */
export const can = (perfiles: readonly Perfil[], action: AccessAction): boolean => perfiles.some((p) => ACTION_ACCESS[action].includes(p));

export const NO_ACCESS_MESSAGE = 'Tu perfil no tiene acceso a esa pantalla';
