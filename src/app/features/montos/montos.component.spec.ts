import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { FixedClock } from '../../core/simulation/clock';
import { DemoStore, SIM_CLOCK } from '../../core/state/demo.store';
import { MontosComponent } from './montos.component';

/** V35 · Registro de montos: medios sin llave (como V34) y texto del cobro de más (E28). */
describe('MontosComponent (V35)', () => {
  const setup = (ventaId: string, usuarioId: string, antes?: (store: DemoStore) => void) => {
    localStorage.clear();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [MontosComponent],
      providers: [provideRouter([]), { provide: SIM_CLOCK, useValue: new FixedClock(new Date(2026, 10, 18, 9, 0)) }],
    });
    const store = TestBed.inject(DemoStore);
    store.iniciarSesion(usuarioId);
    antes?.(store);
    const fixture = TestBed.createComponent(MontosComponent);
    fixture.componentRef.setInput('ventaId', ventaId);
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    const q = (id: string) => el.querySelector<HTMLElement>(`[data-testid="${id}"]`);
    const escribir = (id: string, valor: string) => {
      const input = q(id) as HTMLInputElement;
      input.value = valor;
      input.dispatchEvent(new Event('input'));
      fixture.detectChanges();
    };
    return { store, fixture, q, escribir };
  };

  it('«Llave del vendedor» se deshabilita con su explicación si el vendedor no tiene llave', () => {
    const { store, fixture, q } = setup('VTA-A-003', 'usr-yesid');
    expect((q('medio-0-llave_vendedor') as HTMLButtonElement).disabled).toBe(false);
    store.state.update((s) => ({ ...s, vendedores: s.vendedores.map((v) => (v.id === 'VEN-A2' ? { ...v, llave: null } : v)) }));
    fixture.detectChanges();
    const boton = q('medio-0-llave_vendedor') as HTMLButtonElement;
    expect(boton.disabled).toBe(true);
    expect(q('ayuda-medio-0-llave_vendedor')?.textContent?.trim()).toBe('El vendedor no tiene llave de cobro');
    expect((q('medio-0-llave_empresa') as HTMLButtonElement).disabled).toBe(false);
    expect((q('medio-0-efectivo') as HTMLButtonElement).disabled).toBe(false);
  });

  it('E28: sin cobros previos el exceso es frente al valor; con cobros, frente a lo que falta por cobrar', () => {
    // VTA-A-002 ($ 210.000) ya tiene su cobro en efectivo: lo que falta es $ 0.
    const previa = setup('VTA-A-002', 'usr-wilson');
    previa.escribir('monto-0', '5000');
    expect(previa.q('aviso-exceso')?.textContent?.trim()).toBe('Registraste $ 5.000 más de lo que falta por cobrar');

    // Una venta nueva de $ 75.000 no tiene cobros: el exceso es frente al valor de la venta.
    const nueva = setup('VTA-A-004', 'usr-yesid', (store) => store.exec((sim) => sim.registrarVenta('CDT-A3', { cantidades: { P30: 1 }, valor: 75_000 })));
    expect((nueva.q('monto-0') as HTMLInputElement).value).toBe('75000');
    nueva.escribir('monto-0', '80000');
    expect(nueva.q('aviso-exceso')?.textContent?.trim()).toBe('Registraste $ 5.000 más que el valor de la venta');
  });
});
