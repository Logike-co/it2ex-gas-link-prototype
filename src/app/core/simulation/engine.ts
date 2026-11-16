/**
 * Comandos del motor de simulación (flow-map §3). Cada comando valida, modifica el estado de
 * esta instancia y devuelve un `Result` con el mensaje del aviso o el error del formulario.
 * El motor nunca lee la sesión ni la fecha por su cuenta: el reloj se inyecta.
 *
 * Cargas, ventas, cobros y pagos no se editan ni se borran (SUP-13); la única marca reversible
 * es «Llegó» en la conciliación, que no mueve saldos (R-13).
 */
import { Clock } from './clock';
import { formatKg, formatMoney, normalizeCompanyName, normalizePlaca, normalizeText, parseKg, parsePesos } from './format';
import {
  Carga,
  Cobro,
  Conductor,
  DemoState,
  Empresa,
  fail,
  FormaPago,
  Llave,
  MedioCobro,
  ok,
  PagoVendedor,
  Perfil,
  PerfilUsuario,
  Prefijo,
  PresentacionId,
  PRESENTACIONES,
  QrElegido,
  Result,
  TipoLlave,
  Usuario,
  Vehiculo,
  Vendedor,
  Venta,
} from './model';
import { catalogoInicial, contadoresVacios } from './seed';
import {
  aplicarAbonos,
  cargasDeCamion,
  conductorById,
  cuentaVendedor,
  empresaById,
  origenVenta,
  presentacion,
  resumenVenta,
  totalesCarga,
  usuarioById,
  vehiculoById,
  vendedorById,
  ventaById,
} from './selectors';

export type Cantidades = Partial<Record<PresentacionId, number | string | null>>;

export interface NuevaEmpresa {
  nombre: string;
  ciudad: string;
  nombreUsuario: string;
  usuario: string;
}

export interface FilaCatalogo {
  presentacionId: PresentacionId;
  peso: string;
  valor: string;
  activa: boolean;
}

export interface NuevoVendedor {
  nombre: string;
  contacto: string;
  llaveTipo: TipoLlave;
  llave: string;
}

export interface NuevoConductor {
  vendedorId: string;
  esElVendedor: boolean;
  nombre: string;
  vehiculoId: string;
}

export interface NuevaCarga {
  vendedorId: string;
  vehiculoId: string;
  conductorId: string;
  cantidades: Cantidades;
}

export interface NuevaVenta {
  cantidades: Cantidades;
  valor: string | number | null;
}

export interface LineaCobro {
  medio: MedioCobro;
  monto: string | number | null;
  referencia: string | null;
}

export interface NuevoPago {
  vendedorId: string;
  forma: FormaPago;
  monto: string | number | null;
  referencia: string;
  detalle: string;
}

const letraDe = (empresaId: string): string => empresaId.slice(-1);

/** Lee una cantidad de cilindros: vacío = 0; solo enteros no negativos. */
const leerCantidad = (v: number | string | null | undefined): number | 'decimal' | 'negativa' => {
  if (v === null || v === undefined || String(v).trim() === '') {
    return 0;
  }
  const n = Number(String(v).trim().replace(',', '.'));
  if (!Number.isFinite(n) || !Number.isInteger(n)) {
    return 'decimal';
  }
  return n < 0 ? 'negativa' : n;
};

const leerCantidades = (c: Cantidades): Result<Record<PresentacionId, number>> => {
  const out = { P100: 0, P40: 0, P30: 0 } as Record<PresentacionId, number>;
  for (const p of PRESENTACIONES) {
    const n = leerCantidad(c[p]);
    if (n === 'decimal') return fail('Las cantidades son números enteros');
    if (n === 'negativa') return fail('Las cantidades no pueden ser negativas');
    out[p] = n;
  }
  return ok(out);
};

const sinEspacios = (s: string): boolean => !/\s/.test(s);

export class Simulator {
  constructor(
    public state: DemoState,
    private readonly clock: Clock
  ) {}

  /* ------------------------------------------------------------ utilidades */

  /** Marca de tiempo del próximo evento: el reloj, pero siempre después del último registrado. */
  private stamp(): string {
    const s = this.state;
    const all = [
      ...s.cargas.map((x) => x.fechaHora),
      ...s.ventas.map((x) => x.fechaHora),
      ...s.cobros.map((x) => x.fechaHora),
      ...s.pagos.map((x) => x.fechaHora),
    ];
    const latest = all.length ? Math.max(...all.map((t) => Date.parse(t))) : 0;
    return new Date(Math.max(this.clock.now().getTime(), latest + 1000)).toISOString();
  }

  private nextId(empresaId: string, prefijo: Prefijo): string {
    const c = (this.state.contadores[empresaId] ??= contadoresVacios());
    c[prefijo] += 1;
    const n = c[prefijo];
    return ['VEN', 'VEH', 'CDT'].includes(prefijo)
      ? `${prefijo}-${letraDe(empresaId)}${n}`
      : `${prefijo}-${letraDe(empresaId)}-${String(n).padStart(3, '0')}`;
  }

  /** Usuario de ingreso a partir de un nombre: `gases.la.loma`, único en la demo (SUP-12). */
  private usuarioLibre(nombre: string): string {
    const base = normalizeText(nombre).replace(/ /g, '.') || 'usuario';
    let candidato = base;
    for (let i = 2; this.state.usuarios.some((u) => u.usuario === candidato); i++) {
      candidato = `${base}${i}`;
    }
    return candidato;
  }

  private crearUsuario(nombre: string, usuario: string, perfiles: PerfilUsuario[]): Usuario {
    let id = `usr-${usuario.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`;
    for (let i = 2; this.state.usuarios.some((u) => u.id === id); i++) {
      id = `usr-${usuario}-${i}`;
    }
    const u: Usuario = { id, usuario, nombre, perfiles };
    this.state.usuarios.push(u);
    return u;
  }

  /* ------------------------------------------------------------ sesión (D01) */

  iniciarSesion(usuarioId: string, perfil?: Perfil): Result<{ usuario: Usuario; perfil: PerfilUsuario }> {
    const u = usuarioById(this.state, usuarioId);
    if (!u) {
      return fail('Ese usuario no existe en la demo');
    }
    const p = perfil ? u.perfiles.find((x) => x.perfil === perfil) : u.perfiles[0];
    if (!p) {
      return fail(`${u.nombre} no tiene el perfil ${perfil}`);
    }
    this.state.sesion = { usuarioId: u.id, perfil: p.perfil };
    return ok({ usuario: u, perfil: p });
  }

  cerrarSesion(): void {
    this.state.sesion = { usuarioId: null, perfil: null };
  }

  /* ------------------------------------------------------------ F01 empresas */

  crearEmpresa(input: NuevaEmpresa): Result<Empresa> {
    const nombre = input.nombre.trim();
    const usuario = input.usuario.trim().toLowerCase();
    const nombreUsuario = input.nombreUsuario.trim();
    if (!nombre) return fail('Escribe el nombre de la empresa');
    if (this.state.empresas.some((e) => normalizeCompanyName(e.nombre) === normalizeCompanyName(nombre))) {
      return fail('Ya existe una empresa con ese nombre');
    }
    if (!usuario) return fail('Escribe el usuario de la empresa');
    if (!/^[a-z0-9._-]+$/.test(usuario)) return fail('El usuario no puede tener espacios ni tildes');
    if (this.state.usuarios.some((u) => u.usuario === usuario)) return fail('Ese usuario ya existe');
    if (!nombreUsuario) return fail('Escribe el nombre de la persona que usará la empresa');

    const id = `EMP-${String.fromCharCode(65 + this.state.empresasCreadas)}`;
    this.state.empresasCreadas += 1;
    this.state.contadores[id] = contadoresVacios();
    const u = this.crearUsuario(nombreUsuario, usuario, [{ perfil: 'empresa', empresaId: id }]);
    const empresa: Empresa = {
      id,
      nombre,
      ciudad: input.ciudad.trim(),
      llave: null,
      creadaEn: this.clock.now().toISOString(),
      usuarioId: u.id,
    };
    this.state.empresas.push(empresa);
    this.state.presentaciones.push(...catalogoInicial(id));
    return ok(empresa, `Empresa ${id} · ${nombre} creada con el usuario ${usuario}`);
  }

  /* ------------------------------------------------------------ F02 catálogo */

  guardarCatalogo(empresaId: string, filas: FilaCatalogo[]): Result<void> {
    const cambios: { p: PresentacionId; peso: number; valor: number; activa: boolean }[] = [];
    for (const f of filas) {
      if (!presentacion(this.state, empresaId, f.presentacionId)) {
        return fail('Presentación desconocida');
      }
      const peso = parseKg(f.peso);
      if (peso.kind !== 'ok') return fail('Escribe el peso en kilos con máximo un decimal');
      if (peso.value <= 0) return fail('El peso debe ser mayor que cero');
      const valor = parsePesos(f.valor);
      if (valor.kind === 'invalid') return fail('Escribe un valor en pesos, sin decimales');
      if (valor.kind === 'ok' && valor.value <= 0) return fail('El valor unitario debe ser mayor que cero');
      cambios.push({ p: f.presentacionId, peso: peso.value, valor: valor.kind === 'ok' ? valor.value : 0, activa: f.activa });
    }
    for (const c of cambios) {
      const p = presentacion(this.state, empresaId, c.p);
      if (p) {
        p.pesoDecimasKg = c.peso;
        p.valorUnitario = c.valor;
        p.activa = c.activa;
      }
    }
    return ok(undefined, 'Catálogo guardado. Los cambios no modifican las cargas ya registradas');
  }

  /* ------------------------------------------------------------ F03 llave */

  guardarLlaveEmpresa(empresaId: string, tipo: TipoLlave, valor: string): Result<Llave> {
    const e = empresaById(this.state, empresaId);
    const v = valor.trim();
    if (!e) return fail('Empresa desconocida');
    if (!v) return fail('Escribe la llave de cobro de la empresa');
    if (!sinEspacios(v)) return fail('La llave no puede tener espacios');
    e.llave = { tipo, valor: v };
    return ok(e.llave, `Llave de cobro guardada: ${v}`);
  }

  /* ------------------------------------------------------------ F04 flota */

  crearVendedor(empresaId: string, input: NuevoVendedor): Result<Vendedor> {
    const nombre = input.nombre.trim();
    const contacto = input.contacto.trim();
    const llave = input.llave.trim();
    if (!nombre) return fail('Escribe el nombre del vendedor');
    if (this.state.vendedores.some((v) => v.empresaId === empresaId && normalizeText(v.nombre) === normalizeText(nombre))) {
      return fail('Ya existe un vendedor con ese nombre en tu empresa');
    }
    if (llave && !sinEspacios(llave)) return fail('La llave no puede tener espacios');
    const id = this.nextId(empresaId, 'VEN');
    const usuario = this.usuarioLibre(contacto || nombre);
    const u = this.crearUsuario(contacto || nombre, usuario, [{ perfil: 'vendedor', empresaId, vendedorId: id }]);
    const v: Vendedor = { id, empresaId, nombre, contacto, llave: llave ? { tipo: input.llaveTipo, valor: llave } : null, usuarioId: u.id };
    this.state.vendedores.push(v);
    return ok(v, `Vendedor ${id} · ${nombre} registrado con su usuario ${usuario}`);
  }

  crearVehiculo(empresaId: string, input: { placa: string; vendedorId: string }): Result<Vehiculo> {
    const placa = normalizePlaca(input.placa);
    if (!placa) return fail('Escribe la placa con el formato AAA 999');
    const dueno = vendedorById(this.state, input.vendedorId);
    if (!dueno || dueno.empresaId !== empresaId) return fail('Elige el dueño del camión');
    if (this.state.vehiculos.some((v) => v.empresaId === empresaId && v.placa === placa)) {
      return fail(`Ya existe un camión con la placa ${placa} en tu empresa`);
    }
    const v: Vehiculo = { id: this.nextId(empresaId, 'VEH'), empresaId, placa, vendedorId: dueno.id };
    this.state.vehiculos.push(v);
    return ok(v, `Camión ${placa} registrado para ${dueno.nombre}`);
  }

  crearConductor(empresaId: string, input: NuevoConductor): Result<Conductor> {
    const vendedor = vendedorById(this.state, input.vendedorId);
    if (!vendedor || vendedor.empresaId !== empresaId) return fail('Elige el vendedor para el que trabaja');
    const nombre = input.esElVendedor ? vendedor.contacto || vendedor.nombre : input.nombre.trim();
    if (input.esElVendedor && this.state.conductores.some((c) => c.vendedorId === vendedor.id && c.esElVendedor)) {
      return fail('Ese vendedor ya está registrado como su propio conductor');
    }
    if (!nombre) return fail('Escribe el nombre del conductor');
    const vehiculo = vehiculoById(this.state, input.vehiculoId);
    if (!vehiculo || vehiculo.empresaId !== empresaId) return fail('Elige el camión del conductor');
    if (vehiculo.vendedorId !== vendedor.id) return fail(`Ese camión no es de ${vendedor.nombre}`);

    const id = this.nextId(empresaId, 'CDT');
    const perfil: PerfilUsuario = { perfil: 'conductor', empresaId, vendedorId: vendedor.id, conductorId: id };
    let usuarioId: string;
    if (input.esElVendedor) {
      const u = usuarioById(this.state, vendedor.usuarioId);
      u?.perfiles.push(perfil);
      usuarioId = vendedor.usuarioId;
    } else {
      usuarioId = this.crearUsuario(nombre, this.usuarioLibre(nombre), [perfil]).id;
    }
    const c: Conductor = { id, empresaId, vendedorId: vendedor.id, nombre, esElVendedor: input.esElVendedor, vehiculoId: vehiculo.id, usuarioId };
    this.state.conductores.push(c);
    return ok(c, `Conductor ${id} · ${nombre} registrado con el camión ${vehiculo.placa}`);
  }

  /* ------------------------------------------------------------ F05 cargue */

  registrarCarga(empresaId: string, usuarioId: string, input: NuevaCarga): Result<Carga> {
    const vendedor = vendedorById(this.state, input.vendedorId);
    if (!vendedor || vendedor.empresaId !== empresaId) return fail('Elige el vendedor');
    const vehiculo = vehiculoById(this.state, input.vehiculoId);
    if (!vehiculo || vehiculo.empresaId !== empresaId) return fail('Elige el camión');
    if (vehiculo.vendedorId !== vendedor.id) return fail(`Ese camión no es de ${vendedor.nombre}`);
    const conductor = conductorById(this.state, input.conductorId);
    if (!conductor || conductor.empresaId !== empresaId) return fail('Elige el conductor');
    if (conductor.vendedorId !== vendedor.id) return fail(`Ese conductor no trabaja para ${vendedor.nombre}`);
    const cant = leerCantidades(input.cantidades);
    if (!cant.ok) return cant;
    if (PRESENTACIONES.every((p) => cant.value[p] === 0)) return fail('Escribe al menos un cilindro');

    const lineas = [];
    for (const p of PRESENTACIONES) {
      const n = cant.value[p];
      if (n === 0) continue;
      const pres = presentacion(this.state, empresaId, p);
      if (!pres || !pres.activa || pres.valorUnitario <= 0) {
        return fail('La presentación no tiene valor unitario en el catálogo');
      }
      lineas.push({ presentacionId: p, etiqueta: pres.etiqueta, unidades: n, pesoDecimasKg: pres.pesoDecimasKg, valorUnitario: pres.valorUnitario });
    }
    const carga: Carga = {
      id: this.nextId(empresaId, 'CAR'),
      empresaId,
      vendedorId: vendedor.id,
      vehiculoId: vehiculo.id,
      conductorId: conductor.id,
      fechaHora: this.stamp(),
      lineas,
      ...totalesCarga(lineas),
      registradaPor: usuarioId,
    };
    this.state.cargas.push(carga);
    return ok(carga, `Carga ${carga.id} registrada: ${formatMoney(carga.valorConsolidado)} · ${formatKg(carga.pesoTotalDecimasKg)}`);
  }

  /* ------------------------------------------------------------ F06 venta */

  registrarVenta(conductorId: string, input: NuevaVenta): Result<Venta> {
    const conductor = conductorById(this.state, conductorId);
    if (!conductor) return fail('Conductor desconocido');
    if (cargasDeCamion(this.state, conductor.vehiculoId).length === 0) {
      return fail('Tu camión no tiene cargas. Pídele a la empresa que registre el cargue');
    }
    const cant = leerCantidades(input.cantidades);
    if (!cant.ok) return cant;
    if (PRESENTACIONES.every((p) => cant.value[p] === 0)) return fail('Elige al menos un cilindro');
    const valor = parsePesos(input.valor);
    if (valor.kind === 'empty') return fail('Escribe el valor de la venta');
    if (valor.kind === 'invalid') return fail('Escribe un valor en pesos, sin decimales');
    if (valor.value <= 0) return fail('El valor de la venta debe ser mayor que cero');

    const origen = origenVenta(
      this.state,
      conductor.vehiculoId,
      PRESENTACIONES.map((p) => ({ presentacionId: p, unidades: cant.value[p] }))
    );
    if (!origen) {
      return fail('Tu camión no tiene cargas. Pídele a la empresa que registre el cargue');
    }
    const vehiculo = vehiculoById(this.state, conductor.vehiculoId) as Vehiculo;
    const venta: Venta = {
      id: this.nextId(conductor.empresaId, 'VTA'),
      empresaId: conductor.empresaId,
      vendedorId: vehiculo.vendedorId,
      vehiculoId: vehiculo.id,
      conductorId: conductor.id,
      fechaHora: this.stamp(),
      lineas: origen.lineas,
      valor: valor.value,
      qr: null,
      montoQrEmpresa: 0,
      montoQrVendedor: 0,
      avisoExistencias: origen.avisoExistencias,
    };
    this.state.ventas.push(venta);
    return ok(
      venta,
      `Venta ${venta.id} registrada por ${formatMoney(venta.valor)}${venta.avisoExistencias ? ' con aviso de existencias' : ''} · por cobrar`
    );
  }

  /** V07: guarda el QR mostrado y el reparto sugerido; no crea cobros. */
  registrarReparto(conductorId: string, ventaId: string, qr: QrElegido, montoEmpresa: number, montoVendedor: number): Result<Venta> {
    const venta = ventaById(this.state, ventaId);
    if (!venta || venta.conductorId !== conductorId) return fail('Esa venta no es tuya');
    if (montoEmpresa < 0 || montoVendedor < 0) return fail('Los montos no pueden ser negativos');
    venta.qr = qr;
    venta.montoQrEmpresa = qr === 'vendedor' ? 0 : montoEmpresa;
    venta.montoQrVendedor = qr === 'empresa' ? 0 : montoVendedor;
    return ok(venta);
  }

  /* ------------------------------------------------------------ F07 cobros */

  registrarCobros(conductorId: string, ventaId: string, lineas: LineaCobro[]): Result<Cobro[]> {
    const venta = ventaById(this.state, ventaId);
    if (!venta || venta.conductorId !== conductorId) return fail('Esa venta no es tuya');
    if (lineas.length === 0) return fail('Agrega al menos una línea de cobro');
    const empresa = empresaById(this.state, venta.empresaId) as Empresa;
    const vendedor = vendedorById(this.state, venta.vendedorId) as Vendedor;
    const leidas: { medio: MedioCobro; monto: number; referencia: string | null; llave: string | null }[] = [];
    for (const l of lineas) {
      const m = parsePesos(l.monto);
      if (m.kind !== 'ok' || m.value <= 0) return fail('El monto debe ser mayor que cero');
      const llave = l.medio === 'llave_empresa' ? empresa.llave?.valor : l.medio === 'llave_vendedor' ? vendedor.llave?.valor : null;
      if (l.medio === 'llave_empresa' && !llave) return fail('La empresa no tiene llave de cobro');
      if (l.medio === 'llave_vendedor' && !llave) return fail('El vendedor no tiene llave de cobro');
      const ref = l.medio === 'efectivo' ? null : (l.referencia ?? '').trim() || null;
      leidas.push({ medio: l.medio, monto: m.value, referencia: ref, llave: llave ?? null });
    }
    const creados: Cobro[] = leidas.map((l) => {
      const c: Cobro = {
        id: this.nextId(venta.empresaId, 'COB'),
        ventaId: venta.id,
        empresaId: venta.empresaId,
        vendedorId: venta.vendedorId,
        vehiculoId: venta.vehiculoId,
        conductorId: venta.conductorId,
        fechaHora: this.stamp(),
        medio: l.medio,
        llaveDestino: l.llave,
        monto: l.monto,
        referencia: l.referencia,
        conciliacion: l.medio === 'llave_empresa' ? 'por_confirmar' : 'no_aplica',
        confirmadoPor: null,
        confirmadoEn: null,
      };
      this.state.cobros.push(c);
      return c;
    });
    const r = resumenVenta(this.state, venta);
    const msg =
      r.estado === 'cobrada'
        ? `Venta ${venta.id} cobrada${r.excede > 0 ? ` · excede en ${formatMoney(r.excede)}` : ''}`
        : `Cobros registrados en ${venta.id} · falta ${formatMoney(r.porCobrar)}`;
    return ok(creados, msg);
  }

  /* ------------------------------------------------------------ F09 conciliación */

  marcarLlegada(empresaId: string, cobroId: string, llego: boolean, usuarioId: string): Result<Cobro> {
    const c = this.state.cobros.find((x) => x.id === cobroId);
    if (!c || c.empresaId !== empresaId) return fail('Ese cobro no existe en tu empresa');
    if (c.medio !== 'llave_empresa') return fail('Solo se concilian los cobros a la llave de la empresa');
    c.conciliacion = llego ? 'confirmado' : 'por_confirmar';
    c.confirmadoPor = llego ? usuarioId : null;
    c.confirmadoEn = llego ? this.clock.now().toISOString() : null;
    return ok(
      c,
      llego ? `Cobro ${c.id} confirmado: llegó a la llave de la empresa` : `Marca quitada: ${c.id} vuelve a «Por confirmar»`
    );
  }

  /* ------------------------------------------------------------ F10 pago del vendedor */

  registrarPago(empresaId: string, usuarioId: string, input: NuevoPago): Result<PagoVendedor> {
    const vendedor = vendedorById(this.state, input.vendedorId);
    if (!vendedor || vendedor.empresaId !== empresaId) return fail('Elige el vendedor');
    const m = parsePesos(input.monto);
    if (m.kind !== 'ok' || m.value <= 0) return fail('El monto debe ser mayor que cero');
    const saldo = cuentaVendedor(this.state, vendedor.id)?.saldoGeneral ?? 0;
    if (m.value > saldo) return fail(`El pago supera lo que debe el vendedor (${formatMoney(saldo)})`);
    const referencia = input.referencia.trim();
    const detalle = input.detalle.trim();
    if (input.forma === 'transferencia' && !referencia) return fail('Escribe la referencia de la transferencia');
    if (input.forma === 'acuerdo' && !detalle) return fail('Describe el acuerdo del pago');

    const pago: PagoVendedor = {
      id: this.nextId(empresaId, 'PAG'),
      empresaId,
      vendedorId: vendedor.id,
      fechaHora: this.stamp(),
      forma: input.forma,
      monto: m.value,
      referencia: input.forma === 'transferencia' ? referencia : null,
      detalle: input.forma === 'acuerdo' ? detalle : null,
      registradoPor: usuarioId,
    };
    this.state.pagos.push(pago);
    const aplicado = aplicarAbonos(this.state, vendedor.id)
      .aplicaciones.filter((a) => a.abonoId === pago.id)
      .map((a) => `${a.cargaId} ${formatMoney(a.monto)}`)
      .join(' · ');
    return ok(pago, `Pago ${pago.id} registrado por ${formatMoney(pago.monto)}. Aplicado: ${aplicado || '—'}`);
  }
}
