/**
 * Datos semilla de la demo (flow-map §5). Todos los nombres, llaves, placas y referencias son
 * inventados; ninguna empresa usa una marca real y todas llevan «Demo» en el nombre.
 *
 * Las fechas son relativas al día de la demo (SUP-01): hoy − 1, − 2 y − 3 días, para que el
 * orden FIFO sea siempre el mismo sin importar cuándo se presente.
 */
import { addDays, atTime, Clock } from './clock';
import { totalesCarga } from './selectors';
import {
  Carga,
  Cobro,
  DemoState,
  Empresa,
  LineaCarga,
  PagoVendedor,
  Presentacion,
  PresentacionId,
  Prefijo,
  SCHEMA_VERSION,
  Usuario,
  Venta,
} from './model';

/** Peso por presentación en décimas de kilo (SUP-03): 45,4 · 18,1 · 13,6 kg. */
export const PESO_DEFECTO: Record<PresentacionId, number> = { P100: 454, P40: 181, P30: 136 };

/** Precio promedio al usuario, Superservicios, I trim. 2026 (solo referencia). */
export const PRECIO_REFERENCIA: Record<PresentacionId, number> = { P100: 204_540, P40: 87_234, P30: 72_436 };

export const ETIQUETA: Record<PresentacionId, string> = {
  P100: 'Cilindro de 100 lb',
  P40: 'Cilindro de 40 lb',
  P30: 'Cilindro de 30 lb',
};

export const LIBRAS: Record<PresentacionId, number> = { P100: 100, P40: 40, P30: 30 };

/** Catálogo de una empresa; sin valores = empresa nueva (SUP-19). */
export const catalogoInicial = (empresaId: string, valores?: Record<PresentacionId, number>): Presentacion[] =>
  (['P100', 'P40', 'P30'] as PresentacionId[]).map((id) => ({
    id,
    empresaId,
    etiqueta: ETIQUETA[id],
    libras: LIBRAS[id],
    pesoDecimasKg: PESO_DEFECTO[id],
    valorUnitario: valores?.[id] ?? 0,
    precioReferenciaUsuario: PRECIO_REFERENCIA[id],
    activa: true,
  }));

export const contadoresVacios = (): Record<Prefijo, number> => ({ CAR: 0, VTA: 0, COB: 0, PAG: 0, VEN: 0, VEH: 0, CDT: 0 });

/** Valores al vendedor (SUP-02, «Ilustrativo»). */
const PRECIOS_A: Record<PresentacionId, number> = { P100: 170_000, P40: 82_500, P30: 65_000 };
const PRECIOS_B: Record<PresentacionId, number> = { P100: 175_000, P40: 80_000, P30: 64_000 };

export const buildSeed = (clock: Clock): DemoState => {
  const hoy = clock.now();
  const at = (daysAgo: number, hhmm: string): string => atTime(addDays(hoy, -daysAgo), hhmm).toISOString();

  const empresas: Empresa[] = [
    {
      id: 'EMP-A',
      nombre: 'Gas Cóndor Demo',
      ciudad: 'Tunja',
      llave: { tipo: 'alfanumerica', valor: '@gascondor.demo' },
      creadaEn: at(30, '08:00'),
      usuarioId: 'usr-paula',
    },
    {
      id: 'EMP-B',
      nombre: 'Gas Ceiba Demo',
      ciudad: 'Villavicencio',
      llave: { tipo: 'alfanumerica', valor: '@gasceiba.demo' },
      creadaEn: at(30, '09:00'),
      usuarioId: 'usr-jorge',
    },
  ];

  const presentaciones = [...catalogoInicial('EMP-A', PRECIOS_A), ...catalogoInicial('EMP-B', PRECIOS_B)];
  const llave = (valor: string) => ({ tipo: 'alfanumerica' as const, valor });

  const vendedores = [
    { id: 'VEN-A1', empresaId: 'EMP-A', nombre: 'Ramiro Cárdenas', contacto: 'Ramiro Cárdenas', llave: llave('@ramiro.demo'), usuarioId: 'usr-ramiro' },
    { id: 'VEN-A2', empresaId: 'EMP-A', nombre: 'Transportes Lucero', contacto: 'Doris Lucero', llave: llave('@lucero.demo'), usuarioId: 'usr-doris' },
    { id: 'VEN-A3', empresaId: 'EMP-A', nombre: 'Olga Pineda', contacto: 'Olga Pineda', llave: llave('@olga.demo'), usuarioId: 'usr-olga' },
    { id: 'VEN-B1', empresaId: 'EMP-B', nombre: 'Hernán Rojas', contacto: 'Hernán Rojas', llave: llave('@hernan.demo'), usuarioId: 'usr-hernan' },
    { id: 'VEN-B2', empresaId: 'EMP-B', nombre: 'Distribuciones El Trébol', contacto: 'Marta Gil', llave: llave('@trebol.demo'), usuarioId: 'usr-marta' },
  ];

  const vehiculos = [
    { id: 'VEH-A1', empresaId: 'EMP-A', placa: 'GLK 101', vendedorId: 'VEN-A1' },
    { id: 'VEH-A2', empresaId: 'EMP-A', placa: 'GLK 102', vendedorId: 'VEN-A2' },
    { id: 'VEH-A3', empresaId: 'EMP-A', placa: 'GLK 103', vendedorId: 'VEN-A2' },
    { id: 'VEH-A4', empresaId: 'EMP-A', placa: 'GLK 104', vendedorId: 'VEN-A3' },
    { id: 'VEH-B1', empresaId: 'EMP-B', placa: 'CBA 201', vendedorId: 'VEN-B1' },
    { id: 'VEH-B2', empresaId: 'EMP-B', placa: 'CBA 202', vendedorId: 'VEN-B2' },
  ];

  const conductores = [
    { id: 'CDT-A1', empresaId: 'EMP-A', vendedorId: 'VEN-A1', nombre: 'Ramiro Cárdenas', esElVendedor: true, vehiculoId: 'VEH-A1', usuarioId: 'usr-ramiro' },
    { id: 'CDT-A2', empresaId: 'EMP-A', vendedorId: 'VEN-A2', nombre: 'Wilson Ortega', esElVendedor: false, vehiculoId: 'VEH-A2', usuarioId: 'usr-wilson' },
    { id: 'CDT-A3', empresaId: 'EMP-A', vendedorId: 'VEN-A2', nombre: 'Yesid Navarro', esElVendedor: false, vehiculoId: 'VEH-A3', usuarioId: 'usr-yesid' },
    { id: 'CDT-A4', empresaId: 'EMP-A', vendedorId: 'VEN-A3', nombre: 'Edna Quiroga', esElVendedor: false, vehiculoId: 'VEH-A4', usuarioId: 'usr-edna' },
    { id: 'CDT-B1', empresaId: 'EMP-B', vendedorId: 'VEN-B1', nombre: 'Hernán Rojas', esElVendedor: true, vehiculoId: 'VEH-B1', usuarioId: 'usr-hernan' },
    { id: 'CDT-B2', empresaId: 'EMP-B', vendedorId: 'VEN-B2', nombre: 'Nelson Pardo', esElVendedor: false, vehiculoId: 'VEH-B2', usuarioId: 'usr-nelson' },
  ];

  const usuarios: Usuario[] = [
    { id: 'usr-andrea', usuario: 'andrea.admin', nombre: 'Andrea Ríos', perfiles: [{ perfil: 'administrador' }] },
    { id: 'usr-paula', usuario: 'paula.condor', nombre: 'Paula Méndez', perfiles: [{ perfil: 'empresa', empresaId: 'EMP-A' }] },
    {
      id: 'usr-ramiro',
      usuario: 'ramiro.cardenas',
      nombre: 'Ramiro Cárdenas',
      perfiles: [
        { perfil: 'vendedor', empresaId: 'EMP-A', vendedorId: 'VEN-A1' },
        { perfil: 'conductor', empresaId: 'EMP-A', vendedorId: 'VEN-A1', conductorId: 'CDT-A1' },
      ],
    },
    { id: 'usr-doris', usuario: 'doris.lucero', nombre: 'Doris Lucero', perfiles: [{ perfil: 'vendedor', empresaId: 'EMP-A', vendedorId: 'VEN-A2' }] },
    { id: 'usr-olga', usuario: 'olga.pineda', nombre: 'Olga Pineda', perfiles: [{ perfil: 'vendedor', empresaId: 'EMP-A', vendedorId: 'VEN-A3' }] },
    {
      id: 'usr-wilson',
      usuario: 'wilson.ortega',
      nombre: 'Wilson Ortega',
      perfiles: [{ perfil: 'conductor', empresaId: 'EMP-A', vendedorId: 'VEN-A2', conductorId: 'CDT-A2' }],
    },
    {
      id: 'usr-yesid',
      usuario: 'yesid.navarro',
      nombre: 'Yesid Navarro',
      perfiles: [{ perfil: 'conductor', empresaId: 'EMP-A', vendedorId: 'VEN-A2', conductorId: 'CDT-A3' }],
    },
    {
      id: 'usr-edna',
      usuario: 'edna.quiroga',
      nombre: 'Edna Quiroga',
      perfiles: [{ perfil: 'conductor', empresaId: 'EMP-A', vendedorId: 'VEN-A3', conductorId: 'CDT-A4' }],
    },
    { id: 'usr-jorge', usuario: 'jorge.ceiba', nombre: 'Jorge Salas', perfiles: [{ perfil: 'empresa', empresaId: 'EMP-B' }] },
    {
      id: 'usr-hernan',
      usuario: 'hernan.rojas',
      nombre: 'Hernán Rojas',
      perfiles: [
        { perfil: 'vendedor', empresaId: 'EMP-B', vendedorId: 'VEN-B1' },
        { perfil: 'conductor', empresaId: 'EMP-B', vendedorId: 'VEN-B1', conductorId: 'CDT-B1' },
      ],
    },
    { id: 'usr-marta', usuario: 'marta.gil', nombre: 'Marta Gil', perfiles: [{ perfil: 'vendedor', empresaId: 'EMP-B', vendedorId: 'VEN-B2' }] },
    {
      id: 'usr-nelson',
      usuario: 'nelson.pardo',
      nombre: 'Nelson Pardo',
      perfiles: [{ perfil: 'conductor', empresaId: 'EMP-B', vendedorId: 'VEN-B2', conductorId: 'CDT-B2' }],
    },
  ];

  const linea = (empresaId: string, p: PresentacionId, unidades: number): LineaCarga => ({
    presentacionId: p,
    etiqueta: ETIQUETA[p],
    unidades,
    pesoDecimasKg: PESO_DEFECTO[p],
    valorUnitario: (empresaId === 'EMP-A' ? PRECIOS_A : PRECIOS_B)[p],
  });
  const carga = (
    id: string,
    when: string,
    vendedorId: string,
    vehiculoId: string,
    conductorId: string,
    lineas: LineaCarga[],
    registradaPor: string
  ): Carga => ({
    id,
    empresaId: id.startsWith('CAR-A') ? 'EMP-A' : 'EMP-B',
    vendedorId,
    vehiculoId,
    conductorId,
    fechaHora: when,
    lineas,
    ...totalesCarga(lineas),
    registradaPor,
  });

  const cargas: Carga[] = [
    carga('CAR-A-001', at(3, '07:30'), 'VEN-A3', 'VEH-A4', 'CDT-A4', [linea('EMP-A', 'P40', 4)], 'usr-paula'),
    carga('CAR-A-002', at(2, '07:00'), 'VEN-A2', 'VEH-A2', 'CDT-A2', [linea('EMP-A', 'P100', 2), linea('EMP-A', 'P30', 4)], 'usr-paula'),
    carga(
      'CAR-A-003',
      at(1, '07:00'),
      'VEN-A2',
      'VEH-A3',
      'CDT-A3',
      [linea('EMP-A', 'P100', 1), linea('EMP-A', 'P40', 2), linea('EMP-A', 'P30', 1)],
      'usr-paula'
    ),
    carga('CAR-B-001', at(1, '07:30'), 'VEN-B1', 'VEH-B1', 'CDT-B1', [linea('EMP-B', 'P100', 3)], 'usr-jorge'),
    carga('CAR-B-002', at(1, '08:00'), 'VEN-B2', 'VEH-B2', 'CDT-B2', [linea('EMP-B', 'P100', 2), linea('EMP-B', 'P40', 4)], 'usr-jorge'),
  ];

  const venta = (
    id: string,
    when: string,
    vendedorId: string,
    vehiculoId: string,
    conductorId: string,
    p: PresentacionId,
    unidades: number,
    cargaId: string,
    valor: number
  ): Venta => ({
    id,
    empresaId: id.startsWith('VTA-A') ? 'EMP-A' : 'EMP-B',
    vendedorId,
    vehiculoId,
    conductorId,
    fechaHora: when,
    lineas: [{ presentacionId: p, unidades, origen: [{ cargaId, unidades }] }],
    valor,
    qr: null,
    montoQrEmpresa: 0,
    montoQrVendedor: 0,
    avisoExistencias: false,
  });

  const ventas: Venta[] = [
    { ...venta('VTA-A-001', at(3, '10:00'), 'VEN-A3', 'VEH-A4', 'CDT-A4', 'P40', 4, 'CAR-A-001', 360_000), qr: 'empresa', montoQrEmpresa: 200_000 },
    venta('VTA-A-002', at(2, '11:00'), 'VEN-A2', 'VEH-A2', 'CDT-A2', 'P100', 1, 'CAR-A-002', 210_000),
    { ...venta('VTA-A-003', at(1, '15:00'), 'VEN-A2', 'VEH-A3', 'CDT-A3', 'P40', 2, 'CAR-A-003', 180_000), qr: 'vendedor', montoQrVendedor: 180_000 },
    {
      ...venta('VTA-B-001', at(1, '13:00'), 'VEN-B1', 'VEH-B1', 'CDT-B1', 'P100', 2, 'CAR-B-001', 420_000),
      qr: 'ambos',
      montoQrEmpresa: 175_000,
      montoQrVendedor: 155_000,
    },
  ];

  const cobro = (
    id: string,
    v: Venta,
    when: string,
    medio: Cobro['medio'],
    monto: number,
    referencia: string | null,
    llaveDestino: string | null,
    confirmado = false,
    confirmadoEn: string | null = null,
    confirmadoPor: string | null = null
  ): Cobro => ({
    id,
    ventaId: v.id,
    empresaId: v.empresaId,
    vendedorId: v.vendedorId,
    vehiculoId: v.vehiculoId,
    conductorId: v.conductorId,
    fechaHora: when,
    medio,
    llaveDestino,
    monto,
    referencia,
    conciliacion: medio === 'llave_empresa' ? (confirmado ? 'confirmado' : 'por_confirmar') : 'no_aplica',
    confirmadoPor,
    confirmadoEn,
  });

  const [a1, a2, a3, b1] = ventas;
  const cobros: Cobro[] = [
    cobro('COB-A-001', a1, at(3, '10:05'), 'llave_empresa', 200_000, 'BRB-DEMO-0001', '@gascondor.demo', true, at(3, '17:00'), 'usr-paula'),
    cobro('COB-A-002', a1, at(3, '10:06'), 'efectivo', 160_000, null, null),
    cobro('COB-A-003', a2, at(2, '11:05'), 'efectivo', 210_000, null, null),
    cobro('COB-A-004', a3, at(1, '15:05'), 'llave_vendedor', 180_000, 'BRB-DEMO-0002', '@lucero.demo'),
    cobro('COB-B-001', b1, at(1, '13:05'), 'llave_empresa', 175_000, 'BRB-DEMO-2001', '@gasceiba.demo'),
    cobro('COB-B-002', b1, at(1, '13:06'), 'llave_vendedor', 155_000, 'BRB-DEMO-2002', '@hernan.demo'),
    cobro('COB-B-003', b1, at(1, '13:07'), 'efectivo', 90_000, null, null),
  ];

  const pagos: PagoVendedor[] = [
    {
      id: 'PAG-A-001',
      empresaId: 'EMP-A',
      vendedorId: 'VEN-A3',
      fechaHora: at(2, '18:00'),
      forma: 'transferencia',
      monto: 130_000,
      referencia: 'TRF-DEMO-0001',
      detalle: null,
      registradoPor: 'usr-paula',
    },
  ];

  return {
    schemaVersion: SCHEMA_VERSION,
    empresas,
    presentaciones,
    vendedores,
    vehiculos,
    conductores,
    usuarios,
    cargas,
    ventas,
    cobros,
    pagos,
    contadores: {
      'EMP-A': { CAR: 3, VTA: 3, COB: 4, PAG: 1, VEN: 3, VEH: 4, CDT: 4 },
      'EMP-B': { CAR: 2, VTA: 1, COB: 3, PAG: 0, VEN: 2, VEH: 2, CDT: 2 },
    },
    empresasCreadas: 2,
    sesion: { usuarioId: null, perfil: null },
  };
};
