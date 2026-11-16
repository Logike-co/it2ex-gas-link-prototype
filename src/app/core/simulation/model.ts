/**
 * Modelo del motor de simulación de GasLink (flow-map §2).
 *
 * Todos los montos son enteros en pesos colombianos; todos los pesos, enteros en décimas de
 * kilo (454 = 45,4 kg) para no acumular errores de coma flotante. Las fechas se guardan como
 * texto ISO para que el estado se pueda persistir en el navegador tal cual.
 */

/** Versión del esquema persistido: si cambia, el estado guardado se descarta y se usa la semilla. */
export const SCHEMA_VERSION = 1;

export type Perfil = 'administrador' | 'empresa' | 'vendedor' | 'conductor';

export const PERFILES: readonly Perfil[] = ['administrador', 'empresa', 'vendedor', 'conductor'];

export const PERFIL_LABEL: Record<Perfil, string> = {
  administrador: 'administrador',
  empresa: 'empresa',
  vendedor: 'vendedor',
  conductor: 'conductor',
};

export type TipoLlave = 'alfanumerica' | 'celular' | 'correo' | 'documento';

/** Llave de cobro (objeto de valor, §2.2). El tipo es solo informativo (SUP-17). */
export interface Llave {
  tipo: TipoLlave;
  valor: string;
}

/** Empresa distribuidora (tenant, §2.1). */
export interface Empresa {
  id: string;
  nombre: string;
  ciudad: string;
  llave: Llave | null;
  creadaEn: string;
  /** Usuario empresa creado con ella (V02). */
  usuarioId: string;
}

export type PresentacionId = 'P100' | 'P40' | 'P30';

export const PRESENTACIONES: readonly PresentacionId[] = ['P100', 'P40', 'P30'];

/** Presentación de cilindro del catálogo de una empresa (§2.3). */
export interface Presentacion {
  id: PresentacionId;
  empresaId: string;
  etiqueta: string;
  libras: number;
  pesoDecimasKg: number;
  /** Lo que la empresa le cobra al vendedor (RN-04). 0 = sin precio (SUP-19). */
  valorUnitario: number;
  /** Solo lectura: promedio nacional Superservicios, I trim. 2026. */
  precioReferenciaUsuario: number;
  activa: boolean;
}

export interface Vendedor {
  id: string;
  empresaId: string;
  /** Persona o negocio («Transportes Lucero»). */
  nombre: string;
  /** Persona que usa el perfil vendedor. */
  contacto: string;
  llave: Llave | null;
  usuarioId: string;
}

export interface Vehiculo {
  id: string;
  empresaId: string;
  /** `AAA 999`, única dentro de la empresa (RV-04, SUP-16). */
  placa: string;
  /** Dueño del camión (RN-12). */
  vendedorId: string;
}

export interface Conductor {
  id: string;
  empresaId: string;
  vendedorId: string;
  nombre: string;
  esElVendedor: boolean;
  vehiculoId: string;
  usuarioId: string;
}

/** Un perfil de un usuario, con el alcance de datos que le corresponde (SUP-11). */
export interface PerfilUsuario {
  perfil: Perfil;
  empresaId?: string;
  vendedorId?: string;
  conductorId?: string;
}

/** Usuario de la demo: se entra con un clic, sin contraseña (D01). */
export interface Usuario {
  id: string;
  usuario: string;
  nombre: string;
  perfiles: PerfilUsuario[];
}

/** Línea de una carga: copia del catálogo al registrar (SUP-15). */
export interface LineaCarga {
  presentacionId: PresentacionId;
  etiqueta: string;
  unidades: number;
  pesoDecimasKg: number;
  valorUnitario: number;
}

export interface Carga {
  id: string;
  empresaId: string;
  vendedorId: string;
  vehiculoId: string;
  conductorId: string;
  fechaHora: string;
  lineas: LineaCarga[];
  pesoTotalDecimasKg: number;
  /** Lo que el vendedor debe por la carga (R-01). */
  valorConsolidado: number;
  registradaPor: string;
}

/** De qué carga salieron los cilindros de una línea de venta (R-04). */
export interface OrigenLinea {
  cargaId: string;
  unidades: number;
}

export interface LineaVenta {
  presentacionId: PresentacionId;
  unidades: number;
  origen: OrigenLinea[];
}

export type QrElegido = 'empresa' | 'vendedor' | 'ambos';

export interface Venta {
  id: string;
  empresaId: string;
  vendedorId: string;
  vehiculoId: string;
  conductorId: string;
  fechaHora: string;
  lineas: LineaVenta[];
  /** Libre (RN-05). Sin datos del cliente (RN-06). */
  valor: number;
  /** Lo que se mostró en V07 (null mientras no se haya mostrado un QR). */
  qr: QrElegido | null;
  montoQrEmpresa: number;
  montoQrVendedor: number;
  /** Se registró con más unidades de las que quedaban (RV-01). */
  avisoExistencias: boolean;
}

export type MedioCobro = 'llave_empresa' | 'llave_vendedor' | 'efectivo';

export const MEDIOS: readonly MedioCobro[] = ['llave_empresa', 'llave_vendedor', 'efectivo'];

export type EstadoConciliacion = 'por_confirmar' | 'confirmado' | 'no_aplica';

/** Lo que el conductor recibe en una venta (§2.10). */
export interface Cobro {
  id: string;
  ventaId: string;
  empresaId: string;
  vendedorId: string;
  vehiculoId: string;
  conductorId: string;
  fechaHora: string;
  medio: MedioCobro;
  /** Copia de la llave al registrar (SUP-15); null en efectivo. */
  llaveDestino: string | null;
  monto: number;
  referencia: string | null;
  conciliacion: EstadoConciliacion;
  confirmadoPor: string | null;
  confirmadoEn: string | null;
}

export type FormaPago = 'transferencia' | 'acuerdo';

/** Pago del vendedor a la empresa, registrado por la empresa (§2.11, RN-14). */
export interface PagoVendedor {
  id: string;
  empresaId: string;
  vendedorId: string;
  fechaHora: string;
  forma: FormaPago;
  monto: number;
  referencia: string | null;
  detalle: string | null;
  registradoPor: string;
}

export interface Sesion {
  usuarioId: string | null;
  /** Perfil activo del usuario (SUP-11). */
  perfil: Perfil | null;
}

/** Consecutivos por empresa: CAR, VTA, COB, PAG, VEN, VEH, CDT (§0). */
export type Prefijo = 'CAR' | 'VTA' | 'COB' | 'PAG' | 'VEN' | 'VEH' | 'CDT';

export interface DemoState {
  schemaVersion: number;
  empresas: Empresa[];
  presentaciones: Presentacion[];
  vendedores: Vendedor[];
  vehiculos: Vehiculo[];
  conductores: Conductor[];
  usuarios: Usuario[];
  cargas: Carga[];
  ventas: Venta[];
  cobros: Cobro[];
  pagos: PagoVendedor[];
  /** Último número usado por empresa y prefijo. */
  contadores: Record<string, Record<Prefijo, number>>;
  /** Cantidad de empresas creadas (la siguiente es la letra n + 1). */
  empresasCreadas: number;
  sesion: Sesion;
}

/** Resultado de un comando: valor y mensaje para el aviso, o error para el formulario. */
export type Result<T> = { ok: true; value: T; message?: string } | { ok: false; error: string };

export const ok = <T>(value: T, message?: string): Result<T> => ({ ok: true, value, message });
export const fail = <T = never>(error: string): Result<T> => ({ ok: false, error });
