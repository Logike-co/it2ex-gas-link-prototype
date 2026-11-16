import { FixedClock } from './clock';
import { Simulator, USUARIO_INACTIVO } from './engine';
import { DemoState, Usuario } from './model';
import { buildSeed } from './seed';
import {
  aplicarAbonos,
  conciliacion,
  cuentaVendedor,
  CuentaVendedor,
  estadoExistencias,
  existenciasCamion,
  faltaVendedor,
  perfilesDetalle,
  perfilesTexto,
  prerrequisitosCargue,
  puedeVender,
  quedanEnCamion,
  resumenVenta,
  subtotalSeleccion,
  usuariosDeEmpresa,
  vendedoresDe,
  vendedorListo,
} from './selectors';

/** Día de la demo de las pruebas: miércoles 18 de noviembre de 2026, 9:00 a. m. */
const DEMO_DAY = new Date(2026, 10, 18, 9, 0, 0);

const nuevo = (): { sim: Simulator; clock: FixedClock } => {
  const clock = new FixedClock(DEMO_DAY);
  return { sim: new Simulator(buildSeed(clock), clock), clock };
};

const cuenta = (s: DemoState, v: string): CuentaVendedor => cuentaVendedor(s, v) as CuentaVendedor;
const saldoCarga = (s: DemoState, v: string, c: string): number =>
  cuenta(s, v).cargas.find((x) => x.carga.id === c)?.saldo ?? NaN;

/** Invariantes de R-07 para todos los vendedores. */
const invariantes = (s: DemoState): void => {
  for (const v of s.vendedores) {
    const c = cuenta(s, v.id);
    const res = aplicarAbonos(s, v.id);
    expect(c.cargas.reduce((a, x) => a + x.saldo, 0)).toBe(c.saldoGeneral);
    expect(res.aplicaciones.reduce((a, x) => a + x.monto, 0) + res.saldoAFavor).toBe(c.totalAbonado);
    for (const x of c.cargas) {
      expect(x.saldo).toBeGreaterThanOrEqual(0);
      expect(x.saldo).toBeLessThanOrEqual(x.carga.valorConsolidado);
    }
    const last = c.movimientos[c.movimientos.length - 1];
    expect(last ? last.saldo : 0).toBe(c.saldoGeneral - c.saldoAFavor);
  }
};

const ok = <T>(r: { ok: true; value: T } | { ok: false; error: string }): T => {
  if (!r.ok) {
    throw new Error(r.error);
  }
  return r.value;
};

const errorDe = (r: { ok: boolean; error?: string }): string | undefined => (r.ok ? undefined : r.error);

describe('Semilla (flow-map §5.6)', () => {
  it('cuadra los valores de control por vendedor', () => {
    const { sim } = nuevo();
    const s = sim.state;
    const fila = (id: string) => {
      const c = cuenta(s, id);
      return [c.totalCargado, c.totalAbonado, c.saldoGeneral, c.enPoder.total, c.estado];
    };
    expect(fila('VEN-A1')).toEqual([0, 0, 0, 0, 'sin_cargas']);
    expect(fila('VEN-A2')).toEqual([1_000_000, 0, 1_000_000, 390_000, 'con_saldo']);
    expect(fila('VEN-A3')).toEqual([330_000, 330_000, 0, 160_000, 'al_dia']);
    expect(fila('VEN-B1')).toEqual([525_000, 175_000, 350_000, 245_000, 'con_saldo']);
    expect(fila('VEN-B2')).toEqual([670_000, 0, 670_000, 0, 'con_saldo']);

    const olga = cuenta(s, 'VEN-A3').cargas[0];
    expect(olga.estadoPago).toBe('saldada');
    expect(olga.aplicaciones.map((a) => [a.abonoId, a.monto, a.regla])).toEqual([
      ['COB-A-001', 200_000, 'origen'],
      ['PAG-A-001', 130_000, 'fifo'],
    ]);
    expect(cuenta(s, 'VEN-B1').cargas[0].estadoPago).toBe('abonada');
    invariantes(s);
  });

  it('E08: totales por empresa', () => {
    const { sim } = nuevo();
    const a = conciliacion(sim.state, 'EMP-A').totales;
    expect([a.vendido, a.pagado, a.pendiente, a.enPoder]).toEqual([1_330_000, 330_000, 1_000_000, 550_000]);
    const b = conciliacion(sim.state, 'EMP-B').totales;
    expect([b.vendido, b.pagado, b.pendiente, b.enPoder]).toEqual([1_195_000, 175_000, 1_020_000, 245_000]);
    expect(b.porConfirmar).toBe(175_000);
    expect(vendedoresDe(sim.state, 'EMP-B').map((v) => v.nombre)).toEqual(['Hernán Rojas', 'Distribuciones El Trébol']);
  });

  it('existencias por camión tras el reinicio', () => {
    const { sim } = nuevo();
    const q = (veh: string) => Object.fromEntries(existenciasCamion(sim.state, veh).map((e) => [e.etiqueta, e.quedan]));
    expect(q('VEH-A1')).toEqual({});
    expect(q('VEH-A2')).toEqual({ '100 lb': 1, '30 lb': 4 });
    expect(q('VEH-A3')).toEqual({ '100 lb': 1, '40 lb': 0, '30 lb': 1 });
    expect(q('VEH-A4')).toEqual({ '40 lb': 0 });
    expect(q('VEH-B1')).toEqual({ '100 lb': 1 });
    expect(q('VEH-B2')).toEqual({ '100 lb': 2, '40 lb': 4 });
  });

  it('próximos consecutivos', () => {
    const { sim } = nuevo();
    expect(sim.state.contadores['EMP-A']).toEqual({ CAR: 3, VTA: 3, COB: 4, PAG: 1, VEN: 3, VEH: 4, CDT: 4 });
    expect(sim.state.contadores['EMP-B']).toEqual({ CAR: 2, VTA: 1, COB: 3, PAG: 0, VEN: 2, VEH: 2, CDT: 2 });
    expect(sim.state.empresasCreadas).toBe(2);
  });
});

describe('ESC-01 · de la carga a la cuenta en ceros (§3.1, §6.2)', () => {
  it('cuadra cada paso con los valores de control', () => {
    const { sim } = nuevo();
    // Paso 2 · cargue (R-01, E15).
    const carga = ok(
      sim.registrarCarga('EMP-A', 'usr-paula', { vendedorId: 'VEN-A1', vehiculoId: 'VEH-A1', conductorId: 'CDT-A1', cantidades: { P100: 2, P40: 8 } })
    );
    expect(carga.id).toBe('CAR-A-004');
    expect(carga.valorConsolidado).toBe(1_000_000);
    expect(carga.pesoTotalDecimasKg).toBe(2356);
    let c = cuenta(sim.state, 'VEN-A1');
    expect([c.totalCargado, c.saldoGeneral, c.cargas[0].estadoPago]).toEqual([1_000_000, 1_000_000, 'pendiente']);
    expect(quedanEnCamion(sim.state, 'VEH-A1', 'P100')).toBe(2);
    expect(quedanEnCamion(sim.state, 'VEH-A1', 'P40')).toBe(8);

    // Paso 3 · venta con precio libre (E18).
    const venta = ok(sim.registrarVenta('CDT-A1', { cantidades: { P100: 1, P40: 6 }, valor: '750.000' }));
    expect(venta.id).toBe('VTA-A-004');
    expect(venta.avisoExistencias).toBe(false);
    expect(venta.lineas.map((l) => l.origen)).toEqual([[{ cargaId: 'CAR-A-004', unidades: 1 }], [{ cargaId: 'CAR-A-004', unidades: 6 }]]);
    expect(resumenVenta(sim.state, venta).estado).toBe('por_cobrar');
    expect(quedanEnCamion(sim.state, 'VEH-A1', 'P100')).toBe(1);
    expect(quedanEnCamion(sim.state, 'VEH-A1', 'P40')).toBe(2);
    expect(cuenta(sim.state, 'VEN-A1').saldoGeneral).toBe(1_000_000);

    // Pasos 4 y 5 · reparto y registro de montos (E22, E25).
    ok(sim.registrarReparto('CDT-A1', 'VTA-A-004', 'ambos', 300_000, 150_000));
    const cobros = ok(
      sim.registrarCobros('CDT-A1', 'VTA-A-004', [
        { medio: 'llave_empresa', monto: 300_000, referencia: 'BRB-DEMO-1001' },
        { medio: 'llave_vendedor', monto: 150_000, referencia: 'BRB-DEMO-1002' },
        { medio: 'efectivo', monto: 300_000, referencia: null },
      ])
    );
    expect(cobros.map((x) => x.id)).toEqual(['COB-A-005', 'COB-A-006', 'COB-A-007']);
    expect(cobros.map((x) => x.llaveDestino)).toEqual(['@gascondor.demo', '@ramiro.demo', null]);
    expect(resumenVenta(sim.state, venta).estado).toBe('cobrada');

    // Paso 6 · cuenta del vendedor (E29).
    c = cuenta(sim.state, 'VEN-A1');
    expect([c.totalCargado, c.totalAbonado, c.saldoGeneral]).toEqual([1_000_000, 300_000, 700_000]);
    expect(c.enPoder).toEqual({ efectivo: 300_000, llaveVendedor: 150_000, total: 450_000 });
    expect([c.cargas[0].aplicado, c.cargas[0].saldo, c.cargas[0].estadoPago]).toEqual([300_000, 700_000, 'abonada']);
    expect(c.cargas[0].aplicaciones.map((a) => a.regla)).toEqual(['origen']);

    // Paso 7a · conciliación y «Llegó» (E38, E39).
    let fila = conciliacion(sim.state, 'EMP-A').filas.find((f) => f.vendedor.id === 'VEN-A1');
    expect([fila?.vendido, fila?.pagado, fila?.porConfirmar, fila?.pendiente, fila?.enPoder]).toEqual([
      1_000_000, 300_000, 300_000, 700_000, 450_000,
    ]);
    ok(sim.marcarLlegada('EMP-A', 'COB-A-005', true, 'usr-paula'));
    fila = conciliacion(sim.state, 'EMP-A').filas.find((f) => f.vendedor.id === 'VEN-A1');
    expect([fila?.confirmado, fila?.porConfirmar, fila?.pendiente]).toEqual([300_000, 0, 700_000]);

    // Paso 7b · pago por transferencia (E40).
    const r1 = sim.registrarPago('EMP-A', 'usr-paula', { vendedorId: 'VEN-A1', forma: 'transferencia', monto: '500000', referencia: 'TRF-DEMO-1001', detalle: '' });
    expect(r1.ok && r1.value.id).toBe('PAG-A-002');
    expect(r1.ok && r1.message).toContain('Aplicado: CAR-A-004 $ 500.000');
    expect(cuenta(sim.state, 'VEN-A1').saldoGeneral).toBe(200_000);

    // Paso 7c · pagar el saldo (E42).
    const r2 = sim.registrarPago('EMP-A', 'usr-paula', {
      vendedorId: 'VEN-A1',
      forma: 'acuerdo',
      monto: 200_000,
      referencia: '',
      detalle: 'Efectivo entregado en la bodega',
    });
    expect(r2.ok && r2.value.id).toBe('PAG-A-003');
    c = cuenta(sim.state, 'VEN-A1');
    expect([c.saldoGeneral, c.cargas[0].estadoPago, c.estado, c.enPoder.total]).toEqual([0, 'saldada', 'al_dia', 450_000]);
    expect(c.movimientos.map((m) => m.saldo)).toEqual([1_000_000, 700_000, 200_000, 0]);
    const t = conciliacion(sim.state, 'EMP-A').totales;
    expect([t.vendido, t.pagado, t.pendiente]).toEqual([2_330_000, 1_330_000, 1_000_000]);
    invariantes(sim.state);
  });
});

describe('ESC-02 · cuenta corriente y aplicación de pagos (§3.2, opción C)', () => {
  it('pago a la más antigua, cobro a la carga de origen, pago partido entre dos cargas', () => {
    const { sim } = nuevo();
    const s = () => sim.state;
    expect(subtotalSeleccion(cuenta(s(), 'VEN-A2'), ['CAR-A-003'])).toEqual({ valor: 400_000, aplicado: 0, saldo: 400_000 });

    // E30: el pago va a la carga más antigua.
    const p1 = sim.registrarPago('EMP-A', 'usr-paula', { vendedorId: 'VEN-A2', forma: 'transferencia', monto: 500_000, referencia: 'TRF-DEMO-2001', detalle: '' });
    expect(p1.ok && p1.message).toContain('Aplicado: CAR-A-002 $ 500.000');
    expect([saldoCarga(s(), 'VEN-A2', 'CAR-A-002'), saldoCarga(s(), 'VEN-A2', 'CAR-A-003')]).toEqual([100_000, 400_000]);
    expect(cuenta(s(), 'VEN-A2').saldoGeneral).toBe(500_000);

    // E31: lo cobrado a la llave de la empresa va a la carga de origen (CAR-A-003), no a la más antigua.
    const v = ok(sim.registrarVenta('CDT-A3', { cantidades: { P30: 1 }, valor: 75_000 }));
    expect(v.id).toBe('VTA-A-004');
    expect(v.lineas[0].origen).toEqual([{ cargaId: 'CAR-A-003', unidades: 1 }]);
    ok(sim.registrarCobros('CDT-A3', v.id, [{ medio: 'llave_empresa', monto: 75_000, referencia: 'BRB-DEMO-3001' }]));
    expect(quedanEnCamion(s(), 'VEH-A3', 'P30')).toBe(0);
    expect([saldoCarga(s(), 'VEN-A2', 'CAR-A-002'), saldoCarga(s(), 'VEN-A2', 'CAR-A-003')]).toEqual([100_000, 325_000]);
    const cob = cuenta(s(), 'VEN-A2').cargas.find((x) => x.carga.id === 'CAR-A-003')?.aplicaciones[0];
    expect([cob?.abonoId, cob?.monto, cob?.regla]).toEqual(['COB-A-005', 75_000, 'origen']);
    expect(cuenta(s(), 'VEN-A2').saldoGeneral).toBe(425_000);

    // E32: un pago se parte entre dos cargas.
    const p2 = sim.registrarPago('EMP-A', 'usr-paula', { vendedorId: 'VEN-A2', forma: 'transferencia', monto: 250_000, referencia: 'TRF-DEMO-2002', detalle: '' });
    expect(p2.ok && p2.value.id).toBe('PAG-A-003');
    expect(p2.ok && p2.message).toContain('Aplicado: CAR-A-002 $ 100.000 · CAR-A-003 $ 150.000');
    const c = cuenta(s(), 'VEN-A2');
    expect(c.cargas.map((x) => [x.carga.id, x.saldo, x.estadoPago])).toEqual([
      ['CAR-A-002', 0, 'saldada'],
      ['CAR-A-003', 175_000, 'abonada'],
    ]);

    // Paso 6: pagar el saldo.
    ok(sim.registrarPago('EMP-A', 'usr-paula', { vendedorId: 'VEN-A2', forma: 'transferencia', monto: 175_000, referencia: 'TRF-DEMO-2003', detalle: '' }));
    expect([cuenta(s(), 'VEN-A2').saldoGeneral, cuenta(s(), 'VEN-A2').estado]).toEqual([0, 'al_dia']);
    invariantes(s());
  });
});

describe('ESC-03 · excepciones', () => {
  it('E19 y E27: vender de más avisa, el cobro sin referencia se aplica a la carga de origen', () => {
    const { sim } = nuevo();
    const v = ok(sim.registrarVenta('CDT-A2', { cantidades: { P100: 2 }, valor: 400_000 }));
    expect(v.id).toBe('VTA-A-004');
    expect(v.avisoExistencias).toBe(true);
    expect(v.lineas[0].origen).toEqual([{ cargaId: 'CAR-A-002', unidades: 2 }]);
    expect(quedanEnCamion(sim.state, 'VEH-A2', 'P100')).toBe(-1);
    expect(estadoExistencias(sim.state, sim.state.cargas.find((c) => c.id === 'CAR-A-002')!)).toBe('sobrevendida');

    expect(errorDe(sim.registrarCobros('CDT-A2', v.id, [{ medio: 'llave_empresa', monto: '0', referencia: '' }]))).toBe(
      'El monto debe ser mayor que cero'
    );
    const [cobro] = ok(sim.registrarCobros('CDT-A2', v.id, [{ medio: 'llave_empresa', monto: 400_000, referencia: '' }]));
    expect([cobro.id, cobro.referencia, cobro.conciliacion]).toEqual(['COB-A-005', null, 'por_confirmar']);
    expect(saldoCarga(sim.state, 'VEN-A2', 'CAR-A-002')).toBe(200_000);
    expect(cuenta(sim.state, 'VEN-A2').saldoGeneral).toBe(600_000);
    expect(conciliacion(sim.state, 'EMP-A').filas.find((f) => f.vendedor.id === 'VEN-A2')?.sinReferencia).toBe(1);

    expect(errorDe(sim.registrarPago('EMP-A', 'usr-paula', { vendedorId: 'VEN-A2', forma: 'transferencia', monto: 700_000, referencia: 'X', detalle: '' }))).toBe(
      'El pago supera lo que debe el vendedor ($ 600.000)'
    );
    expect(errorDe(sim.registrarPago('EMP-A', 'usr-paula', { vendedorId: 'VEN-A2', forma: 'transferencia', monto: 100_000, referencia: ' ', detalle: '' }))).toBe(
      'Escribe la referencia de la transferencia'
    );
    invariantes(sim.state);
  });

  it('E28: cobrar más que la venta avisa sin bloquear', () => {
    const { sim } = nuevo();
    const v = ok(sim.registrarVenta('CDT-A3', { cantidades: { P30: 1 }, valor: 75_000 }));
    const r = sim.registrarCobros('CDT-A3', v.id, [{ medio: 'efectivo', monto: 80_000, referencia: null }]);
    expect(r.ok && r.message).toBe('Venta VTA-A-004 cobrada · excede en $ 5.000');
    expect(resumenVenta(sim.state, v).excede).toBe(5_000);
  });
});

describe('Reglas de aplicación con casos de borde', () => {
  /** Empresa nueva con un vendedor y un camión listos para cargar. */
  const preparar = () => {
    const { sim } = nuevo();
    ok(sim.guardarCatalogo('EMP-A', [{ presentacionId: 'P100', peso: '45,4', valor: '170000', activa: true }]));
    ok(sim.crearVendedor('EMP-A', { nombre: 'Gases La Loma', contacto: '', llaveTipo: 'alfanumerica', llave: '@laloma.demo' }));
    ok(sim.crearVehiculo('EMP-A', { placa: 'glk105', vendedorId: 'VEN-A4' }));
    ok(sim.crearConductor('EMP-A', { vendedorId: 'VEN-A4', esElVendedor: false, nombre: 'Iván Mora', vehiculoId: 'VEH-A5' }));
    return sim;
  };

  it('E33 (SUP-04, SUP-05): una venta que sale de dos cargas reparte el cobro en proporción', () => {
    const sim = preparar();
    const carga = (n: number) =>
      ok(sim.registrarCarga('EMP-A', 'usr-paula', { vendedorId: 'VEN-A4', vehiculoId: 'VEH-A5', conductorId: 'CDT-A5', cantidades: { P100: n } }));
    const c1 = carga(4); // 680.000
    ok(sim.registrarVenta('CDT-A5', { cantidades: { P100: 3 }, valor: 1 }));
    ok(sim.registrarPago('EMP-A', 'usr-paula', { vendedorId: 'VEN-A4', forma: 'transferencia', monto: 80_000, referencia: 'R', detalle: '' }));
    const c2 = carga(2); // 340.000
    expect([saldoCarga(sim.state, 'VEN-A4', c1.id), saldoCarga(sim.state, 'VEN-A4', c2.id)]).toEqual([600_000, 340_000]);

    const v = ok(sim.registrarVenta('CDT-A5', { cantidades: { P100: 2 }, valor: 400_000 }));
    expect(v.lineas[0].origen).toEqual([
      { cargaId: c1.id, unidades: 1 },
      { cargaId: c2.id, unidades: 1 },
    ]);
    ok(sim.registrarCobros('CDT-A5', v.id, [{ medio: 'llave_empresa', monto: 400_000, referencia: 'R2' }]));
    expect([saldoCarga(sim.state, 'VEN-A4', c1.id), saldoCarga(sim.state, 'VEN-A4', c2.id)]).toEqual([400_000, 140_000]);
    invariantes(sim.state);
  });

  it('E34 (SUP-06): cobros mayores que la deuda dejan saldo a favor, que se aplica a la siguiente carga', () => {
    const sim = preparar();
    ok(sim.guardarCatalogo('EMP-A', [{ presentacionId: 'P40', peso: '18,1', valor: '100000', activa: true }]));
    ok(sim.registrarCarga('EMP-A', 'usr-paula', { vendedorId: 'VEN-A4', vehiculoId: 'VEH-A5', conductorId: 'CDT-A5', cantidades: { P40: 1 } }));
    const v = ok(sim.registrarVenta('CDT-A5', { cantidades: { P40: 1 }, valor: 130_000 }));
    ok(sim.registrarCobros('CDT-A5', v.id, [{ medio: 'llave_empresa', monto: 130_000, referencia: 'R' }]));
    let c = cuenta(sim.state, 'VEN-A4');
    expect([c.cargas[0].estadoPago, c.estado, c.saldoAFavor, c.saldoGeneral]).toEqual(['saldada', 'a_favor', 30_000, 0]);

    ok(sim.guardarCatalogo('EMP-A', [{ presentacionId: 'P30', peso: '13,6', valor: '165000', activa: true }]));
    const nueva = ok(
      sim.registrarCarga('EMP-A', 'usr-paula', { vendedorId: 'VEN-A4', vehiculoId: 'VEH-A5', conductorId: 'CDT-A5', cantidades: { P30: 1 } })
    );
    c = cuenta(sim.state, 'VEN-A4');
    const x = c.cargas.find((y) => y.carga.id === nueva.id);
    expect([x?.aplicado, x?.saldo, c.saldoGeneral, c.saldoAFavor]).toEqual([30_000, 135_000, 135_000, 0]);
    invariantes(sim.state);
  });

  it('E21: un camión sin cargas no vende', () => {
    const sim = preparar();
    expect(errorDe(sim.registrarVenta('CDT-A5', { cantidades: { P100: 1 }, valor: 1000 }))).toBe(
      'Tu camión no tiene cargas. Pídele a la empresa que registre el cargue'
    );
  });

  it('R-08: el dinero en poder no se descuenta con los pagos del vendedor (SUP-10)', () => {
    const { sim } = nuevo();
    ok(sim.registrarPago('EMP-A', 'usr-paula', { vendedorId: 'VEN-A2', forma: 'acuerdo', monto: 390_000, referencia: '', detalle: 'Efectivo en bodega' }));
    const c = cuenta(sim.state, 'VEN-A2');
    expect([c.enPoder.total, c.pagosVendedor, c.saldoGeneral]).toEqual([390_000, 390_000, 610_000]);
  });
});

describe('Validaciones de los formularios', () => {
  it('E06 y E07: alta de empresa', () => {
    const { sim } = nuevo();
    const base = { nombre: 'Gas Páramo Demo', ciudad: 'Sogamoso', nombreUsuario: 'Lina Torres', usuario: 'lina.paramo' };
    expect(errorDe(sim.crearEmpresa({ ...base, nombre: '' }))).toBe('Escribe el nombre de la empresa');
    expect(errorDe(sim.crearEmpresa({ ...base, nombre: 'gas condor demo' }))).toBe('Ya existe una empresa con ese nombre');
    expect(errorDe(sim.crearEmpresa({ ...base, usuario: '' }))).toBe('Escribe el usuario de la empresa');
    expect(errorDe(sim.crearEmpresa({ ...base, usuario: 'paula.condor' }))).toBe('Ese usuario ya existe');
    expect(sim.state.empresas).toHaveLength(2);

    const e = ok(sim.crearEmpresa(base));
    expect(e.id).toBe('EMP-C');
    expect(sim.state.presentaciones.filter((p) => p.empresaId === 'EMP-C').map((p) => p.valorUnitario)).toEqual([0, 0, 0]);
    expect(sim.state.usuarios.find((u) => u.usuario === 'lina.paramo')?.perfiles).toEqual([{ perfil: 'empresa', empresaId: 'EMP-C' }]);
    expect(conciliacion(sim.state, 'EMP-C').filas).toEqual([]);
  });

  it('E10 y E11: catálogo; cambiar el valor no altera las cargas registradas', () => {
    const { sim } = nuevo();
    const fila = (valor: string) => [{ presentacionId: 'P40' as const, peso: '18,1', valor, activa: true }];
    expect(errorDe(sim.guardarCatalogo('EMP-A', fila('0')))).toBe('El valor unitario debe ser mayor que cero');
    expect(errorDe(sim.guardarCatalogo('EMP-A', fila('-5000')))).toBe('El valor unitario debe ser mayor que cero');
    expect(errorDe(sim.guardarCatalogo('EMP-A', fila('82.5x')))).toBe('Escribe un valor en pesos, sin decimales');
    ok(sim.guardarCatalogo('EMP-A', [{ presentacionId: 'P100', peso: '45,4', valor: '172.000', activa: true }]));
    expect(sim.state.cargas.find((c) => c.id === 'CAR-A-002')?.valorConsolidado).toBe(600_000);
    expect(sim.state.presentaciones.find((p) => p.empresaId === 'EMP-A' && p.id === 'P100')?.valorUnitario).toBe(172_000);
  });

  it('E12: llave de la empresa; los cobros ya registrados conservan la anterior', () => {
    const { sim } = nuevo();
    expect(errorDe(sim.guardarLlaveEmpresa('EMP-A', 'alfanumerica', '  '))).toBe('Escribe la llave de cobro de la empresa');
    ok(sim.guardarLlaveEmpresa('EMP-A', 'alfanumerica', '@condor.cobros.demo'));
    expect(sim.state.cobros.find((c) => c.id === 'COB-A-001')?.llaveDestino).toBe('@gascondor.demo');
  });

  it('E13 y E14: flota; la placa es única dentro de la empresa, no entre empresas', () => {
    const { sim } = nuevo();
    ok(sim.crearVendedor('EMP-A', { nombre: 'Gases La Loma', contacto: '', llaveTipo: 'alfanumerica', llave: '@laloma.demo' }));
    expect(ok(sim.crearVehiculo('EMP-A', { placa: 'glk105', vendedorId: 'VEN-A4' })).placa).toBe('GLK 105');
    ok(sim.crearVehiculo('EMP-A', { placa: 'GLK 106', vendedorId: 'VEN-A4' }));
    const c = ok(sim.crearConductor('EMP-A', { vendedorId: 'VEN-A4', esElVendedor: false, nombre: 'Iván Mora', vehiculoId: 'VEH-A5' }));
    expect(c.id).toBe('CDT-A5');
    expect(sim.state.usuarios.map((u) => u.nombre)).toEqual(expect.arrayContaining(['Gases La Loma', 'Iván Mora']));
    expect(errorDe(sim.crearConductor('EMP-A', { vendedorId: 'VEN-A4', esElVendedor: false, nombre: 'X', vehiculoId: 'VEH-A1' }))).toBe(
      'Ese camión no es de Gases La Loma'
    );

    expect(errorDe(sim.crearVehiculo('EMP-A', { placa: 'GLK 101', vendedorId: 'VEN-A3' }))).toBe('Ya existe un camión con la placa GLK 101 en tu empresa');
    expect(errorDe(sim.crearVehiculo('EMP-A', { placa: 'GL 10', vendedorId: 'VEN-A3' }))).toBe('Escribe la placa con el formato AAA 999');
    ok(sim.crearVehiculo('EMP-B', { placa: 'GLK 101', vendedorId: 'VEN-B1' }));
    expect(sim.state.vehiculos.filter((v) => v.empresaId === 'EMP-A' && v.placa === 'GLK 101').map((v) => v.vendedorId)).toEqual(['VEN-A1']);
  });

  it('un vendedor que es su propio conductor suma el perfil a su usuario (SUP-11)', () => {
    const { sim } = nuevo();
    ok(sim.crearVehiculo('EMP-A', { placa: 'GLK 107', vendedorId: 'VEN-A3' }));
    ok(sim.crearConductor('EMP-A', { vendedorId: 'VEN-A3', esElVendedor: true, nombre: '', vehiculoId: 'VEH-A5' }));
    expect(sim.state.usuarios.find((u) => u.id === 'usr-olga')?.perfiles.map((p) => p.perfil)).toEqual(['vendedor', 'conductor']);
  });

  it('E17: cargue', () => {
    const { sim } = nuevo();
    const carga = (cantidades: Record<string, unknown>, vehiculoId = 'VEH-A1') =>
      errorDe(sim.registrarCarga('EMP-A', 'usr-paula', { vendedorId: 'VEN-A1', vehiculoId, conductorId: 'CDT-A1', cantidades: cantidades as never }));
    expect(carga({ P100: 0, P40: '', P30: null })).toBe('Escribe al menos un cilindro');
    expect(carga({ P40: '2,5' })).toBe('Las cantidades son números enteros');
    expect(carga({ P40: 1 }, 'VEH-A2')).toBe('Ese camión no es de Ramiro Cárdenas');
    ok(sim.guardarCatalogo('EMP-A', [{ presentacionId: 'P30', peso: '13,6', valor: '', activa: true }]));
    expect(carga({ P30: 1 })).toBe('La presentación no tiene valor unitario en el catálogo');
    expect(sim.state.cargas).toHaveLength(5);
  });

  it('E20 y E26: venta y montos', () => {
    const { sim } = nuevo();
    expect(errorDe(sim.registrarVenta('CDT-A2', { cantidades: {}, valor: 1000 }))).toBe('Elige al menos un cilindro');
    expect(errorDe(sim.registrarVenta('CDT-A2', { cantidades: { P30: 1 }, valor: '0' }))).toBe('El valor de la venta debe ser mayor que cero');
    expect(errorDe(sim.registrarVenta('CDT-A2', { cantidades: { P30: 1 }, valor: '' }))).toBe('Escribe el valor de la venta');
    const v = ok(sim.registrarVenta('CDT-A2', { cantidades: { P30: 1 }, valor: 70_000 }));
    for (const monto of ['0', '-1000', '']) {
      expect(
        errorDe(
          sim.registrarCobros('CDT-A2', v.id, [
            { medio: 'efectivo', monto: 1000, referencia: null },
            { medio: 'efectivo', monto, referencia: null },
          ])
        )
      ).toBe('El monto debe ser mayor que cero');
    }
    expect(sim.state.cobros.filter((c) => c.ventaId === v.id)).toHaveLength(0);
    expect(errorDe(sim.registrarCobros('CDT-A3', v.id, [{ medio: 'efectivo', monto: 1000, referencia: null }]))).toBe('Esa venta no es tuya');
  });

  it('E41: pago del vendedor', () => {
    const { sim } = nuevo();
    ok(sim.registrarCarga('EMP-A', 'usr-paula', { vendedorId: 'VEN-A1', vehiculoId: 'VEH-A1', conductorId: 'CDT-A1', cantidades: { P40: 1 } }));
    ok(sim.registrarPago('EMP-A', 'usr-paula', { vendedorId: 'VEN-A1', forma: 'acuerdo', monto: 2_500, referencia: '', detalle: 'Abono' }));
    expect(cuenta(sim.state, 'VEN-A1').saldoGeneral).toBe(80_000);
    const pago = (forma: 'transferencia' | 'acuerdo', monto: string, texto: string) =>
      errorDe(sim.registrarPago('EMP-A', 'usr-paula', { vendedorId: 'VEN-A1', forma, monto, referencia: texto, detalle: texto }));
    expect(pago('transferencia', '0', 'TRF-DEMO-9')).toBe('El monto debe ser mayor que cero');
    expect(pago('transferencia', '250.000', 'TRF-DEMO-9')).toBe('El pago supera lo que debe el vendedor ($ 80.000)');
    expect(pago('transferencia', '10.000', '')).toBe('Escribe la referencia de la transferencia');
    expect(pago('acuerdo', '10.000', '')).toBe('Describe el acuerdo del pago');
    expect(sim.state.pagos).toHaveLength(2);
  });

  it('el reloj nunca deja dos eventos con la misma hora', () => {
    const { sim } = nuevo();
    const v1 = ok(sim.registrarVenta('CDT-A2', { cantidades: { P30: 1 }, valor: 70_000 }));
    const v2 = ok(sim.registrarVenta('CDT-A2', { cantidades: { P30: 1 }, valor: 70_000 }));
    expect(Date.parse(v2.fechaHora) - Date.parse(v1.fechaHora)).toBe(1000);
  });

  it('R-15: sesión por usuario, sin elegir perfil; un usuario inactivo no entra (SUP-23)', () => {
    const { sim } = nuevo();
    expect(ok(sim.iniciarSesion('usr-ramiro')).perfiles.map((p) => p.perfil)).toEqual(['vendedor', 'conductor']);
    expect(sim.state.sesion).toEqual({ usuarioId: 'usr-ramiro' });
    expect(errorDe(sim.iniciarSesion('usr-nadie'))).toBe('Ese usuario no existe en la demo');
    ok(sim.cambiarEstadoUsuario('usr-wilson', false));
    expect(errorDe(sim.iniciarSesion('usr-wilson'))).toBe(USUARIO_INACTIVO);
    expect(sim.state.sesion).toEqual({ usuarioId: 'usr-ramiro' });
    sim.cerrarSesion();
    expect(sim.state.sesion.usuarioId).toBeNull();
  });
});

describe('Usuarios de una empresa (R-14, F01 ampliado por D-T2)', () => {
  const nombres = (s: DemoState, e: string) => usuariosDeEmpresa(s, e).map((u) => u.nombre);

  it('E53: usuarios de la empresa en el orden empresa, vendedor, conductor; Ramiro una sola vez', () => {
    const { sim } = nuevo();
    expect(nombres(sim.state, 'EMP-A')).toEqual(['Paula Méndez', 'Doris Lucero', 'Olga Pineda', 'Ramiro Cárdenas', 'Edna Quiroga', 'Wilson Ortega', 'Yesid Navarro']);
    expect(nombres(sim.state, 'EMP-B')).toEqual(['Jorge Salas', 'Hernán Rojas', 'Marta Gil', 'Nelson Pardo']);
    expect(sim.state.usuarios.every((u) => u.activo)).toBe(true);
    const ramiro = sim.state.usuarios.find((u) => u.id === 'usr-ramiro');
    const doris = sim.state.usuarios.find((u) => u.id === 'usr-doris');
    expect(perfilesDetalle(sim.state, ramiro as Usuario)).toEqual(['vendedor', 'conductor de GLK 101']);
    expect(perfilesDetalle(sim.state, doris as Usuario)).toEqual(['vendedor de Transportes Lucero']);
    expect(perfilesTexto(ramiro as Usuario)).toBe('vendedor y conductor');
  });

  it('E54: alta de un usuario empresa, activo, que entra con el menú de la empresa', () => {
    const { sim } = nuevo();
    const u = sim.crearUsuarioEmpresa('EMP-A', { nombre: 'Camilo Ruiz', usuario: ' Camilo.Condor ' });
    expect(u.ok && u.message).toBe('Usuario camilo.condor creado en Gas Cóndor Demo');
    const camilo = ok(u);
    expect(camilo).toMatchObject({ nombre: 'Camilo Ruiz', usuario: 'camilo.condor', activo: true, perfiles: [{ perfil: 'empresa', empresaId: 'EMP-A' }] });
    expect(nombres(sim.state, 'EMP-A')).toHaveLength(8);
    expect(nombres(sim.state, 'EMP-A').slice(0, 2)).toEqual(['Camilo Ruiz', 'Paula Méndez']);
    ok(sim.iniciarSesion(camilo.id));
    expect(conciliacion(sim.state, 'EMP-A').totales).toMatchObject({ vendido: 1_330_000, pagado: 330_000, pendiente: 1_000_000 });
  });

  it('E55: datos inválidos al crear un usuario empresa', () => {
    const { sim } = nuevo();
    const antes = sim.state.usuarios.length;
    const err = (nombre: string, usuario: string) => errorDe(sim.crearUsuarioEmpresa('EMP-A', { nombre, usuario }));
    expect(err('', 'camilo.condor')).toBe('Escribe el nombre de la persona');
    expect(err('Camilo Ruiz', '')).toBe('Escribe el usuario');
    expect(err('Camilo Ruiz', 'camilo condor')).toBe('El usuario no puede tener espacios ni tildes');
    expect(err('Camilo Ruiz', 'doris.lucero')).toBe('Ese usuario ya existe');
    expect(errorDe(sim.crearUsuarioEmpresa('EMP-Z', { nombre: 'X', usuario: 'x' }))).toBe('Esa empresa no existe');
    expect(sim.state.usuarios).toHaveLength(antes);
  });

  it('E56 (SUP-25): desactivar solo impide el ingreso; el conductor sigue en la flota y en el cargue', () => {
    const { sim } = nuevo();
    expect(ok(sim.cambiarEstadoUsuario('usr-wilson', false)).activo).toBe(false);
    expect(sim.cambiarEstadoUsuario('usr-wilson', false).ok && 'Wilson Ortega desactivado').toBeTruthy();
    expect(sim.state.conductores.find((c) => c.id === 'CDT-A2')?.vehiculoId).toBe('VEH-A2');
    const carga = ok(sim.registrarCarga('EMP-A', 'usr-paula', { vendedorId: 'VEN-A2', vehiculoId: 'VEH-A2', conductorId: 'CDT-A2', cantidades: { P30: 1 } }));
    expect(carga.conductorId).toBe('CDT-A2');
    const r = sim.cambiarEstadoUsuario('usr-wilson', true);
    expect(r.ok && r.message).toBe('Wilson Ortega activado');
    expect(ok(sim.iniciarSesion('usr-wilson')).id).toBe('usr-wilson');
  });

  it('E57 (SUP-22): no se desactiva el último usuario empresa activo', () => {
    const { sim } = nuevo();
    expect(errorDe(sim.cambiarEstadoUsuario('usr-paula', false))).toBe('Gas Cóndor Demo debe tener al menos un usuario empresa activo');
    expect(sim.state.usuarios.find((u) => u.id === 'usr-paula')?.activo).toBe(true);
    ok(sim.crearUsuarioEmpresa('EMP-A', { nombre: 'Camilo Ruiz', usuario: 'camilo.condor' }));
    expect(ok(sim.cambiarEstadoUsuario('usr-paula', false)).activo).toBe(false);
    expect(errorDe(sim.cambiarEstadoUsuario('usr-camilo-condor', false))).toBe('Gas Cóndor Demo debe tener al menos un usuario empresa activo');
    // Los vendedores y conductores sí se desactivan aunque sean los últimos de su perfil.
    expect(ok(sim.cambiarEstadoUsuario('usr-marta', false)).activo).toBe(false);
  });

  it('SUP-12: los usuarios creados en vivo (empresa, vendedor, conductor) nacen activos', () => {
    const { sim } = nuevo();
    ok(sim.crearEmpresa({ nombre: 'Gas Páramo Demo', ciudad: 'Sogamoso', nombreUsuario: 'Lina Torres', usuario: 'lina.paramo' }));
    const v = ok(sim.crearVendedor('EMP-A', { nombre: 'Gases La Loma', contacto: '', llaveTipo: 'alfanumerica', llave: '@laloma.demo' }));
    const cam = ok(sim.crearVehiculo('EMP-A', { placa: 'glk105', vendedorId: v.id }));
    ok(sim.crearConductor('EMP-A', { vendedorId: v.id, esElVendedor: false, nombre: 'Iván Mora', vehiculoId: cam.id }));
    expect(sim.state.usuarios.slice(-3).map((u) => [u.usuario, u.activo])).toEqual([
      ['lina.paramo', true],
      ['gases.la.loma', true],
      ['ivan.mora', true],
    ]);
    expect(nombres(sim.state, 'EMP-C')).toEqual(['Lina Torres']);
  });
});

describe('Prerrequisitos guiados (R-16)', () => {
  it('E59: una empresa nueva ve qué le falta para cargar; la llave avisa sin bloquear (SUP-26)', () => {
    const { sim } = nuevo();
    const e = ok(sim.crearEmpresa({ nombre: 'Gas Páramo Demo', ciudad: 'Sogamoso', nombreUsuario: 'Lina Torres', usuario: 'lina.paramo' }));
    expect(prerrequisitosCargue(sim.state, e.id)).toEqual({ catalogo: false, flota: false, llave: false, puedeCargar: false });
    ok(
      sim.guardarCatalogo(e.id, [
        { presentacionId: 'P100', peso: '45,4', valor: '170000', activa: true },
        { presentacionId: 'P40', peso: '18,1', valor: '82500', activa: true },
        { presentacionId: 'P30', peso: '13,6', valor: '65000', activa: true },
      ])
    );
    const v = ok(sim.crearVendedor(e.id, { nombre: 'Gases Sogamoso', contacto: '', llaveTipo: 'alfanumerica', llave: '' }));
    expect(prerrequisitosCargue(sim.state, e.id)).toMatchObject({ catalogo: true, flota: false, puedeCargar: false });
    const cam = ok(sim.crearVehiculo(e.id, { placa: 'PRM 101', vendedorId: v.id }));
    ok(sim.crearConductor(e.id, { vendedorId: v.id, esElVendedor: true, nombre: '', vehiculoId: cam.id }));
    expect(prerrequisitosCargue(sim.state, e.id)).toEqual({ catalogo: true, flota: true, llave: false, puedeCargar: true });
    expect(ok(sim.registrarCarga(e.id, 'usr-lina-paramo', { vendedorId: v.id, vehiculoId: cam.id, conductorId: 'CDT-C1', cantidades: { P100: 1 } })).id).toBe('CAR-C-001');
  });

  it('E60: un vendedor sin camión o sin conductor no está listo; los de la semilla sí', () => {
    const { sim } = nuevo();
    const v = ok(sim.crearVendedor('EMP-A', { nombre: 'Gases La Loma', contacto: '', llaveTipo: 'alfanumerica', llave: '' }));
    expect(faltaVendedor(sim.state, v.id)).toEqual({ camion: true, conductor: true });
    expect(['VEN-A1', 'VEN-A2', 'VEN-A3'].every((id) => vendedorListo(sim.state, id))).toBe(true);
    const cam = ok(sim.crearVehiculo('EMP-A', { placa: 'GLK 105', vendedorId: v.id }));
    expect(faltaVendedor(sim.state, v.id)).toEqual({ camion: false, conductor: true });
    ok(sim.crearConductor('EMP-A', { vendedorId: v.id, esElVendedor: false, nombre: 'Iván Mora', vehiculoId: cam.id }));
    expect(vendedorListo(sim.state, v.id)).toBe(true);
    expect(prerrequisitosCargue(sim.state, 'EMP-A')).toEqual({ catalogo: true, flota: true, llave: true, puedeCargar: true });
  });

  it('E21: el camión sin cargas no puede vender (puedeVender)', () => {
    const { sim } = nuevo();
    expect(puedeVender(sim.state, 'CDT-A1')).toBe(false);
    expect(puedeVender(sim.state, 'CDT-A2')).toBe(true);
    expect(puedeVender(sim.state, null)).toBe(false);
  });
});
