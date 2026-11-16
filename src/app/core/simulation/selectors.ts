/**
 * Cálculos puros del motor (flow-map §2.14 y §3, reglas R-01 a R-12). Reciben el estado y
 * devuelven valores derivados: nada de esto se guarda, se recalcula cada vez que cambia algo.
 */
import { formatMoney } from './format';
import {
  Carga,
  Cobro,
  Conductor,
  DemoState,
  Empresa,
  LineaCarga,
  LineaVenta,
  MedioCobro,
  PagoVendedor,
  Presentacion,
  PresentacionId,
  PRESENTACIONES,
  Usuario,
  Vehiculo,
  Vendedor,
  Venta,
} from './model';

/* ---------------------------------------------------------------- utilidades */

/** Orden cronológico `(fechaHora, id)`: el que usan FIFO, abonos y movimientos. */
export const byTime = <T extends { fechaHora: string; id: string }>(a: T, b: T): number =>
  a.fechaHora < b.fechaHora ? -1 : a.fechaHora > b.fechaHora ? 1 : a.id < b.id ? -1 : a.id > b.id ? 1 : 0;

const sum = (xs: number[]): number => xs.reduce((a, b) => a + b, 0);

export const empresaById = (s: DemoState, id: string | null | undefined): Empresa | undefined =>
  s.empresas.find((e) => e.id === id);
export const vendedorById = (s: DemoState, id: string | null | undefined): Vendedor | undefined =>
  s.vendedores.find((v) => v.id === id);
export const vehiculoById = (s: DemoState, id: string | null | undefined): Vehiculo | undefined =>
  s.vehiculos.find((v) => v.id === id);
export const conductorById = (s: DemoState, id: string | null | undefined): Conductor | undefined =>
  s.conductores.find((c) => c.id === id);
export const cargaById = (s: DemoState, id: string | null | undefined): Carga | undefined => s.cargas.find((c) => c.id === id);
export const ventaById = (s: DemoState, id: string | null | undefined): Venta | undefined => s.ventas.find((v) => v.id === id);
export const usuarioById = (s: DemoState, id: string | null | undefined): Usuario | undefined =>
  s.usuarios.find((u) => u.id === id);

export const placaDe = (s: DemoState, vehiculoId: string): string => vehiculoById(s, vehiculoId)?.placa ?? vehiculoId;
export const conductorNombre = (s: DemoState, conductorId: string): string =>
  conductorById(s, conductorId)?.nombre ?? conductorId;
export const vendedorNombre = (s: DemoState, vendedorId: string): string => vendedorById(s, vendedorId)?.nombre ?? vendedorId;

/** Catálogo de una empresa, en el orden 100 · 40 · 30 lb. */
export const catalogo = (s: DemoState, empresaId: string): Presentacion[] =>
  PRESENTACIONES.map((p) => s.presentaciones.find((x) => x.empresaId === empresaId && x.id === p)).filter(
    (p): p is Presentacion => !!p
  );

export const presentacion = (s: DemoState, empresaId: string, id: PresentacionId): Presentacion | undefined =>
  s.presentaciones.find((p) => p.empresaId === empresaId && p.id === id);

export const etiquetaCorta = (id: PresentacionId): string => ({ P100: '100 lb', P40: '40 lb', P30: '30 lb' })[id];

/** «Configuración completa» si tiene llave y las tres presentaciones con precio (§4.1). */
export const configuracionCompleta = (s: DemoState, empresaId: string): boolean => {
  const e = empresaById(s, empresaId);
  const cat = catalogo(s, empresaId);
  return !!e?.llave && cat.length === 3 && cat.every((p) => p.valorUnitario > 0);
};

/* ---------------------------------------------------------------- R-01 carga */

/** R-01: valor consolidado y peso total de las líneas de una carga. */
export const totalesCarga = (lineas: Pick<LineaCarga, 'unidades' | 'pesoDecimasKg' | 'valorUnitario'>[]) => ({
  valorConsolidado: sum(lineas.map((l) => l.unidades * l.valorUnitario)),
  pesoTotalDecimasKg: sum(lineas.map((l) => l.unidades * l.pesoDecimasKg)),
});

/* ---------------------------------------------------------------- R-03 existencias */

export const cargasDeCamion = (s: DemoState, vehiculoId: string): Carga[] =>
  s.cargas.filter((c) => c.vehiculoId === vehiculoId).sort(byTime);

export const cargasDeVendedor = (s: DemoState, vendedorId: string): Carga[] =>
  s.cargas.filter((c) => c.vendedorId === vendedorId).sort(byTime);

/** Unidades de `p` que las ventas tomaron de una carga (según su origen, R-04). */
export const vendidasDeCarga = (s: DemoState, cargaId: string, p: PresentacionId): number =>
  sum(
    s.ventas.flatMap((v) =>
      v.lineas.filter((l) => l.presentacionId === p).flatMap((l) => l.origen.filter((o) => o.cargaId === cargaId).map((o) => o.unidades))
    )
  );

export const quedanEnCarga = (s: DemoState, carga: Carga, p: PresentacionId): number =>
  (carga.lineas.find((l) => l.presentacionId === p)?.unidades ?? 0) - vendidasDeCarga(s, carga.id, p);

export interface ExistenciaLinea {
  presentacionId: PresentacionId;
  etiqueta: string;
  cargadas: number;
  vendidas: number;
  quedan: number;
}

/** R-03: por presentación que el camión ha traído, cargadas / vendidas / quedan (puede ser negativo). */
export const existenciasCamion = (s: DemoState, vehiculoId: string): ExistenciaLinea[] => {
  const cargas = cargasDeCamion(s, vehiculoId);
  const ventas = s.ventas.filter((v) => v.vehiculoId === vehiculoId);
  return PRESENTACIONES.filter((p) => cargas.some((c) => c.lineas.some((l) => l.presentacionId === p))).map((p) => {
    const cargadas = sum(cargas.flatMap((c) => c.lineas.filter((l) => l.presentacionId === p).map((l) => l.unidades)));
    const vendidas = sum(ventas.flatMap((v) => v.lineas.filter((l) => l.presentacionId === p).map((l) => l.unidades)));
    return { presentacionId: p, etiqueta: etiquetaCorta(p), cargadas, vendidas, quedan: cargadas - vendidas };
  });
};

export const quedanEnCamion = (s: DemoState, vehiculoId: string, p: PresentacionId): number =>
  existenciasCamion(s, vehiculoId).find((e) => e.presentacionId === p)?.quedan ?? 0;

export type EstadoExistencias = 'en_ruta' | 'vendida' | 'sobrevendida';

export const ESTADO_EXISTENCIAS_LABEL: Record<EstadoExistencias, string> = {
  en_ruta: 'En ruta',
  vendida: 'Vendida',
  sobrevendida: 'Sobrevendida',
};

/** Estado informativo de existencias de una carga (§4.1). */
export const estadoExistencias = (s: DemoState, carga: Carga): EstadoExistencias => {
  const quedan = carga.lineas.map((l) => quedanEnCarga(s, carga, l.presentacionId));
  return quedan.some((q) => q < 0) ? 'sobrevendida' : quedan.every((q) => q === 0) ? 'vendida' : 'en_ruta';
};

/* ---------------------------------------------------------------- R-04 origen */

/**
 * R-04 (SUP-04): de qué cargas del camión salen los cilindros de una venta. FIFO por
 * `(fechaHora, id)`; lo que exceda las existencias va a la carga más reciente que trajo esa
 * presentación (o, si ninguna la trajo, a la más reciente del camión). `null` si el camión no
 * tiene cargas (E21).
 */
export const origenVenta = (
  s: DemoState,
  vehiculoId: string,
  pedido: { presentacionId: PresentacionId; unidades: number }[]
): { lineas: LineaVenta[]; avisoExistencias: boolean } | null => {
  const cargas = cargasDeCamion(s, vehiculoId);
  if (cargas.length === 0) {
    return null;
  }
  let aviso = false;
  const lineas = pedido
    .filter((l) => l.unidades > 0)
    .map((l) => {
      let restante = l.unidades;
      const origen: { cargaId: string; unidades: number }[] = [];
      for (const c of cargas) {
        if (restante === 0) break;
        const x = Math.min(restante, Math.max(0, quedanEnCarga(s, c, l.presentacionId)));
        if (x > 0) {
          origen.push({ cargaId: c.id, unidades: x });
          restante -= x;
        }
      }
      if (restante > 0) {
        aviso = true;
        const trajo = cargas.filter((c) => c.lineas.some((x) => x.presentacionId === l.presentacionId));
        const destino = (trajo.length ? trajo : cargas)[(trajo.length ? trajo : cargas).length - 1];
        const previo = origen.find((o) => o.cargaId === destino.id);
        if (previo) {
          previo.unidades += restante;
        } else {
          origen.push({ cargaId: destino.id, unidades: restante });
        }
      }
      return { presentacionId: l.presentacionId, unidades: l.unidades, origen };
    });
  return { lineas, avisoExistencias: aviso };
};

/* ---------------------------------------------------------------- R-12 venta y cobros */

export const cobrosDeVenta = (s: DemoState, ventaId: string): Cobro[] => s.cobros.filter((c) => c.ventaId === ventaId).sort(byTime);

export type EstadoVenta = 'por_cobrar' | 'parcial' | 'cobrada';

export const ESTADO_VENTA_LABEL: Record<EstadoVenta, string> = {
  por_cobrar: 'Por cobrar',
  parcial: 'Cobro parcial',
  cobrada: 'Cobrada',
};

export interface ResumenVenta {
  venta: Venta;
  cobrado: number;
  /** valor − cobrado; negativo si se cobró de más. */
  porCobrar: number;
  estado: EstadoVenta;
  excede: number;
}

export const resumenVenta = (s: DemoState, venta: Venta): ResumenVenta => {
  const cobrado = sum(cobrosDeVenta(s, venta.id).map((c) => c.monto));
  const porCobrar = venta.valor - cobrado;
  const estado: EstadoVenta = cobrado >= venta.valor ? 'cobrada' : cobrado > 0 ? 'parcial' : 'por_cobrar';
  return { venta, cobrado, porCobrar, estado, excede: Math.max(0, -porCobrar) };
};

export const textoVenta = (r: ResumenVenta): string =>
  r.excede > 0 ? `${ESTADO_VENTA_LABEL[r.estado]} · excede en ${formatMoney(r.excede)}` : ESTADO_VENTA_LABEL[r.estado];

/* ---------------------------------------------------------------- R-05 / R-06 abonos */

export type TipoAbono = 'cobro_empresa' | 'pago_vendedor';

export interface Abono {
  id: string;
  tipo: TipoAbono;
  fechaHora: string;
  monto: number;
  vendedorId: string;
  ventaId: string | null;
  referencia: string | null;
  cobro: Cobro | null;
  pago: PagoVendedor | null;
}

export type Regla = 'origen' | 'fifo';

export interface Aplicacion {
  abonoId: string;
  cargaId: string;
  monto: number;
  regla: Regla;
}

/** R-05: cobros a la llave de la empresa + pagos del vendedor, en orden `(fechaHora, id)`. */
export const abonosDe = (s: DemoState, vendedorId: string): Abono[] =>
  [
    ...s.cobros
      .filter((c) => c.vendedorId === vendedorId && c.medio === 'llave_empresa')
      .map<Abono>((c) => ({
        id: c.id,
        tipo: 'cobro_empresa',
        fechaHora: c.fechaHora,
        monto: c.monto,
        vendedorId,
        ventaId: c.ventaId,
        referencia: c.referencia,
        cobro: c,
        pago: null,
      })),
    ...s.pagos
      .filter((p) => p.vendedorId === vendedorId)
      .map<Abono>((p) => ({
        id: p.id,
        tipo: 'pago_vendedor',
        fechaHora: p.fechaHora,
        monto: p.monto,
        vendedorId,
        ventaId: null,
        referencia: p.referencia,
        cobro: null,
        pago: p,
      })),
  ].sort(byTime);

/** Valor al vendedor de una unidad de `p` en la carga (copia del catálogo al cargar). */
const valorEnCarga = (s: DemoState, carga: Carga, p: PresentacionId): number =>
  carga.lineas.find((l) => l.presentacionId === p)?.valorUnitario ?? presentacion(s, carga.empresaId, p)?.valorUnitario ?? 0;

export interface AplicacionResultado {
  aplicaciones: Aplicacion[];
  /** Saldo de cada carga del vendedor tras aplicar todos los abonos. */
  saldo: Record<string, number>;
  saldoAFavor: number;
}

/**
 * R-06 (RN-13, opción C): aplica desde cero todos los abonos del vendedor a sus cargas.
 * Cobro a la llave de la empresa → carga de origen del producto, repartido en proporción al
 * valor de los cilindros de cada carga (SUP-05; el residuo en pesos va a la más antigua).
 * Pago del vendedor y sobrantes → FIFO, a la carga más antigua con saldo, partiendo el abono
 * entre cargas si hace falta. Lo que no cabe en ninguna carga queda como saldo a favor (SUP-06).
 */
export const aplicarAbonos = (s: DemoState, vendedorId: string): AplicacionResultado => {
  const cargas = cargasDeVendedor(s, vendedorId);
  const saldo: Record<string, number> = Object.fromEntries(cargas.map((c) => [c.id, c.valorConsolidado]));
  const aplicaciones: Aplicacion[] = [];
  let saldoAFavor = 0;

  const aplicar = (abonoId: string, cargaId: string, monto: number, regla: Regla) => {
    const previa = aplicaciones.find((a) => a.abonoId === abonoId && a.cargaId === cargaId && a.regla === regla);
    if (previa) {
      previa.monto += monto;
    } else {
      aplicaciones.push({ abonoId, cargaId, monto, regla });
    }
    saldo[cargaId] -= monto;
  };

  for (const a of abonosDe(s, vendedorId)) {
    let restante = a.monto;

    if (a.tipo === 'cobro_empresa' && a.ventaId) {
      const venta = ventaById(s, a.ventaId);
      const costo = new Map<string, number>();
      for (const l of venta?.lineas ?? []) {
        for (const o of l.origen) {
          const carga = cargaById(s, o.cargaId);
          if (carga && o.cargaId in saldo) {
            costo.set(o.cargaId, (costo.get(o.cargaId) ?? 0) + o.unidades * valorEnCarga(s, carga, l.presentacionId));
          }
        }
      }
      const origenes = cargas.filter((c) => costo.has(c.id));
      if (origenes.length) {
        const total = sum(origenes.map((c) => costo.get(c.id) ?? 0));
        const partes = new Map<string, number>(
          origenes.map((c) => [c.id, total > 0 ? Math.floor((a.monto * (costo.get(c.id) ?? 0)) / total) : 0])
        );
        const residuo = a.monto - sum([...partes.values()]);
        partes.set(origenes[0].id, (partes.get(origenes[0].id) ?? 0) + residuo);
        for (const c of origenes) {
          const x = Math.min(partes.get(c.id) ?? 0, saldo[c.id]);
          if (x > 0) {
            aplicar(a.id, c.id, x, 'origen');
            restante -= x;
          }
        }
      }
    }

    for (const c of cargas) {
      if (restante === 0) break;
      const x = Math.min(restante, saldo[c.id]);
      if (x > 0) {
        aplicar(a.id, c.id, x, 'fifo');
        restante -= x;
      }
    }
    saldoAFavor += restante;
  }
  return { aplicaciones, saldo, saldoAFavor };
};

/* ---------------------------------------------------------------- R-07 a R-09 cuenta */

export type EstadoPago = 'pendiente' | 'abonada' | 'saldada';

export const ESTADO_PAGO_LABEL: Record<EstadoPago, string> = {
  pendiente: 'Pendiente',
  abonada: 'Con saldo',
  saldada: 'Saldada',
};

export type EstadoVendedor = 'sin_cargas' | 'con_saldo' | 'al_dia' | 'a_favor';

export const ESTADO_VENDEDOR_LABEL: Record<EstadoVendedor, string> = {
  sin_cargas: 'Sin cargas',
  con_saldo: 'Con saldo',
  al_dia: 'Al día',
  a_favor: 'Saldo a favor',
};

export interface AplicacionDetalle extends Aplicacion {
  abono: Abono;
}

export interface CargaCuenta {
  carga: Carga;
  placa: string;
  conductor: string;
  aplicado: number;
  saldo: number;
  estadoPago: EstadoPago;
  estadoExistencias: EstadoExistencias;
  aplicaciones: AplicacionDetalle[];
}

export interface Movimiento {
  id: string;
  fechaHora: string;
  tipo: 'carga' | TipoAbono;
  descripcion: string;
  cargo: number;
  abono: number;
  /** Saldo corrido = anterior + cargo − abono (negativo = a favor). */
  saldo: number;
}

export interface AbonoCuenta {
  abono: Abono;
  aplicaciones: Aplicacion[];
  /** Parte del abono que quedó como saldo a favor. */
  sinAplicar: number;
}

export interface CuentaVendedor {
  vendedor: Vendedor;
  cargas: CargaCuenta[];
  abonos: AbonoCuenta[];
  movimientos: Movimiento[];
  totalCargado: number;
  cobrosEmpresa: number;
  pagosVendedor: number;
  totalAbonado: number;
  saldoGeneral: number;
  saldoAFavor: number;
  enPoder: { efectivo: number; llaveVendedor: number; total: number };
  cobrosEnPoder: Cobro[];
  estado: EstadoVendedor;
}

export const MEDIO_LABEL: Record<MedioCobro, string> = {
  llave_empresa: 'Llave de la empresa',
  llave_vendedor: 'Llave del vendedor',
  efectivo: 'Efectivo',
};

export const estadoPagoDe = (valor: number, saldo: number): EstadoPago =>
  saldo <= 0 ? 'saldada' : saldo < valor ? 'abonada' : 'pendiente';

/** R-05 a R-09: la cuenta corriente completa de un vendedor. */
export const cuentaVendedor = (s: DemoState, vendedorId: string): CuentaVendedor | null => {
  const vendedor = vendedorById(s, vendedorId);
  if (!vendedor) {
    return null;
  }
  const cargas = cargasDeVendedor(s, vendedorId);
  const abonos = abonosDe(s, vendedorId);
  const res = aplicarAbonos(s, vendedorId);
  const abonoById = new Map(abonos.map((a) => [a.id, a]));

  const cargasCuenta: CargaCuenta[] = cargas.map((c) => {
    const aplicaciones = res.aplicaciones
      .filter((a) => a.cargaId === c.id)
      .map((a) => ({ ...a, abono: abonoById.get(a.abonoId) as Abono }));
    const saldo = res.saldo[c.id];
    return {
      carga: c,
      placa: placaDe(s, c.vehiculoId),
      conductor: conductorNombre(s, c.conductorId),
      aplicado: c.valorConsolidado - saldo,
      saldo,
      estadoPago: estadoPagoDe(c.valorConsolidado, saldo),
      estadoExistencias: estadoExistencias(s, c),
      aplicaciones,
    };
  });

  const totalCargado = sum(cargas.map((c) => c.valorConsolidado));
  const cobrosEmpresa = sum(abonos.filter((a) => a.tipo === 'cobro_empresa').map((a) => a.monto));
  const pagosVendedor = sum(abonos.filter((a) => a.tipo === 'pago_vendedor').map((a) => a.monto));
  const totalAbonado = cobrosEmpresa + pagosVendedor;
  const saldoGeneral = Math.max(0, totalCargado - totalAbonado);
  const saldoAFavor = Math.max(0, totalAbonado - totalCargado);

  const cobrosEnPoder = s.cobros.filter((c) => c.vendedorId === vendedorId && c.medio !== 'llave_empresa').sort(byTime);
  const efectivo = sum(cobrosEnPoder.filter((c) => c.medio === 'efectivo').map((c) => c.monto));
  const llaveVendedor = sum(cobrosEnPoder.filter((c) => c.medio === 'llave_vendedor').map((c) => c.monto));

  const eventos = [
    ...cargas.map((c) => ({ id: c.id, fechaHora: c.fechaHora, tipo: 'carga' as const, cargo: c.valorConsolidado, abono: 0, ref: c })),
    ...abonos.map((a) => ({ id: a.id, fechaHora: a.fechaHora, tipo: a.tipo, cargo: 0, abono: a.monto, ref: a })),
  ].sort(byTime);
  let corrido = 0;
  const movimientos: Movimiento[] = eventos.map((e) => {
    corrido += e.cargo - e.abono;
    let descripcion: string;
    if (e.tipo === 'carga') {
      const c = e.ref as Carga;
      descripcion = `Carga ${c.id} · ${placaDe(s, c.vehiculoId)}`;
    } else {
      const a = e.ref as Abono;
      descripcion =
        a.tipo === 'cobro_empresa'
          ? `Cobro ${a.id} a la llave de la empresa · venta ${a.ventaId}${a.referencia ? ` · ref. ${a.referencia}` : ' · sin referencia'}`
          : `Pago ${a.id} ${a.pago?.forma === 'acuerdo' ? `según acuerdo («${a.pago?.detalle}»)` : `por transferencia · ref. ${a.referencia}`}`;
    }
    return { id: e.id, fechaHora: e.fechaHora, tipo: e.tipo, descripcion, cargo: e.cargo, abono: e.abono, saldo: corrido };
  });

  const abonosCuenta: AbonoCuenta[] = abonos.map((a) => {
    const aplicaciones = res.aplicaciones.filter((x) => x.abonoId === a.id);
    return { abono: a, aplicaciones, sinAplicar: a.monto - sum(aplicaciones.map((x) => x.monto)) };
  });

  const estado: EstadoVendedor =
    totalCargado === 0 && totalAbonado === 0
      ? 'sin_cargas'
      : saldoAFavor > 0
        ? 'a_favor'
        : saldoGeneral > 0
          ? 'con_saldo'
          : totalCargado === 0
            ? 'sin_cargas'
            : 'al_dia';

  return {
    vendedor,
    cargas: cargasCuenta,
    abonos: abonosCuenta,
    movimientos,
    totalCargado,
    cobrosEmpresa,
    pagosVendedor,
    totalAbonado,
    saldoGeneral,
    saldoAFavor,
    enPoder: { efectivo, llaveVendedor, total: efectivo + llaveVendedor },
    cobrosEnPoder,
    estado,
  };
};

/** R-07: subtotal de una selección de cargas (usa los saldos que dejó R-06). */
export const subtotalSeleccion = (cuenta: CuentaVendedor, ids: readonly string[]) => {
  const sel = cuenta.cargas.filter((c) => ids.includes(c.carga.id));
  return {
    valor: sum(sel.map((c) => c.carga.valorConsolidado)),
    aplicado: sum(sel.map((c) => c.aplicado)),
    saldo: sum(sel.map((c) => c.saldo)),
  };
};

/* ---------------------------------------------------------------- R-10 conciliación */

export interface FilaConciliacion {
  vendedor: Vendedor;
  placas: string[];
  vendido: number;
  pagado: number;
  confirmado: number;
  porConfirmar: number;
  pendiente: number;
  aFavor: number;
  enPoder: number;
  sinReferencia: number;
  estado: EstadoVendedor;
}

export interface Conciliacion {
  filas: FilaConciliacion[];
  totales: { vendido: number; pagado: number; confirmado: number; porConfirmar: number; pendiente: number; aFavor: number; enPoder: number };
}

export const vendedoresDe = (s: DemoState, empresaId: string): Vendedor[] => s.vendedores.filter((v) => v.empresaId === empresaId);

export const filaConciliacion = (s: DemoState, vendedorId: string): FilaConciliacion | null => {
  const cuenta = cuentaVendedor(s, vendedorId);
  if (!cuenta) {
    return null;
  }
  const cobrosEmpresa = cuenta.abonos.filter((a) => a.abono.tipo === 'cobro_empresa').map((a) => a.abono.cobro as Cobro);
  const porConfirmar = sum(cobrosEmpresa.filter((c) => c.conciliacion === 'por_confirmar').map((c) => c.monto));
  return {
    vendedor: cuenta.vendedor,
    placas: s.vehiculos.filter((v) => v.vendedorId === vendedorId).map((v) => v.placa),
    vendido: cuenta.totalCargado,
    pagado: cuenta.totalAbonado,
    confirmado: cuenta.totalAbonado - porConfirmar,
    porConfirmar,
    pendiente: cuenta.saldoGeneral,
    aFavor: cuenta.saldoAFavor,
    enPoder: cuenta.enPoder.total,
    sinReferencia: cobrosEmpresa.filter((c) => !c.referencia).length,
    estado: cuenta.estado,
  };
};

/** R-10: una fila por vendedor de la empresa, más los totales. */
export const conciliacion = (s: DemoState, empresaId: string): Conciliacion => {
  const filas = vendedoresDe(s, empresaId)
    .map((v) => filaConciliacion(s, v.id))
    .filter((f): f is FilaConciliacion => !!f);
  const tot = (k: keyof Conciliacion['totales']) => sum(filas.map((f) => f[k]));
  return {
    filas,
    totales: {
      vendido: tot('vendido'),
      pagado: tot('pagado'),
      confirmado: tot('confirmado'),
      porConfirmar: tot('porConfirmar'),
      pendiente: tot('pendiente'),
      aFavor: tot('aFavor'),
      enPoder: tot('enPoder'),
    },
  };
};

export interface ReferenciaAbono {
  abono: Abono;
  placa: string;
  conductor: string;
  estado: 'por_confirmar' | 'confirmado' | 'registrado';
}

/** Detalle de referencias de los abonos de un vendedor (R-10, columna «Referencias»). */
export const referenciasDe = (s: DemoState, vendedorId: string): ReferenciaAbono[] =>
  abonosDe(s, vendedorId).map((a) => {
    const c = a.cobro;
    return {
      abono: a,
      placa: c ? placaDe(s, c.vehiculoId) : '—',
      conductor: c ? conductorNombre(s, c.conductorId) : '—',
      estado: c ? (c.conciliacion === 'confirmado' ? 'confirmado' : 'por_confirmar') : 'registrado',
    };
  });
