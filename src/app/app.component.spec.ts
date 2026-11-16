import { TestBed } from '@angular/core/testing';
import { provideRouter, Route } from '@angular/router';
import { AppComponent } from './app.component';
import { routes } from './app.routes';
import { DISCLAIMER } from './brand';
import { DemoStore } from './core/state/demo.store';
import { DemoModeStore } from './demo/demo-mode.store';
import { VIEWS } from './views';

/** Rutas completas (`empresa/cargues/:cargaId`) de la configuración anidada por rol. */
const rutas = (rs: Route[], base = ''): string[] =>
  rs.flatMap((r) => {
    const p = [base, r.path].filter(Boolean).join('/');
    return r.children ? rutas(r.children, p) : [p];
  });

describe('AppComponent (shell)', () => {
  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({ imports: [AppComponent], providers: [provideRouter(routes)] }).compileComponents();
  });

  const texts = (el: HTMLElement, sel: string) => [...el.querySelectorAll(sel)].map((a) => a.textContent?.trim());

  it('E03: la leyenda obligatoria y el logo de GasLink siempre están visibles; sin sesión no hay ☰ ni menú', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('[data-testid="leyenda-demo"]')?.textContent?.trim()).toBe(DISCLAIMER);
    expect(DISCLAIMER).toBe('DEMO CON DATOS FICTICIOS · SIN PAGOS REALES');
    expect(el.querySelector('[data-testid="logo-img"]')?.getAttribute('src')).toBe('gaslink-logo.png');
    expect(el.querySelector('[data-testid="logo-img"]')?.getAttribute('alt')).toContain('GasLink');
    expect(el.querySelector('[data-testid="menu"]')).toBeNull();
    expect(el.querySelector('[data-testid="btn-menu"]')).toBeNull();
    expect(el.querySelector('[data-testid="btn-salir"]')).toBeNull();
    expect(el.querySelector('[data-testid="btn-guia"]')).not.toBeNull();
  });

  it('E66: la barra superior solo tiene ☰, logo, empresa y usuario, «Guía» y «Salir»; los controles del demo están en la guía', () => {
    const fixture = TestBed.createComponent(AppComponent);
    TestBed.inject(DemoStore).iniciarSesion('usr-paula');
    fixture.detectChanges();
    const barra: HTMLElement = fixture.nativeElement.querySelector('[data-testid="barra-superior"]');
    expect(texts(barra, 'button')).toEqual(['☰', 'Guía', 'Salir']);
    expect(barra.querySelectorAll('select, input')).toHaveLength(0);
    expect(barra.textContent).not.toContain('Reiniciar');
    expect(barra.querySelector('[data-testid="empresa-sesion"]')?.textContent).toContain('Gas Cóndor Demo');
    expect(barra.querySelector('[data-testid="perfiles-sesion"]')?.textContent).toBe('empresa');

    TestBed.inject(DemoModeStore).hudOpen.set(true);
    fixture.detectChanges();
    const guia: HTMLElement = fixture.nativeElement.querySelector('[data-testid="guia-demo"]');
    expect(guia.querySelector('[data-testid="guia-cambiar-usuario"]')).not.toBeNull();
    expect(guia.querySelector('[data-testid="guia-reiniciar"]')).not.toBeNull();
    expect(guia.querySelector('[data-testid="btn-trazabilidad"]')).not.toBeNull();
    expect(guia.querySelector('[data-testid="guia-escenarios"]')).not.toBeNull();
  });

  it('E50 y SUP-11: el menú ☰ tiene las secciones del usuario; Ramiro ve las dos en una sola sesión', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const store = TestBed.inject(DemoStore);
    const el: HTMLElement = fixture.nativeElement;
    store.iniciarSesion('usr-paula');
    fixture.detectChanges();
    expect(texts(el, '[data-testid="menu-seccion-titulo"]')).toEqual(['Operación', 'Cartera', 'Flota', 'Configuración']);
    expect(texts(el, '[data-testid^="nav-"]')).toEqual([
      'Cargues',
      'Cuentas de vendedores',
      'Conciliación',
      'Pagos de vendedores',
      'Vendedores',
      'Camiones',
      'Conductores',
      'Catálogo de cilindros',
      'Llave de cobro',
    ]);
    store.iniciarSesion('usr-ramiro');
    fixture.detectChanges();
    expect(texts(el, '[data-testid="menu-seccion-titulo"]')).toEqual(['Mi cuenta', 'Venta en calle']);
    expect(texts(el, '[data-testid^="nav-"]')).toEqual(['Resumen', 'Movimientos', 'Informe', 'Mi camión', 'Nueva venta', 'Mis ventas']);
    expect(el.querySelector('[data-testid="perfiles-sesion"]')?.textContent).toBe('vendedor y conductor');
  });

  it('el ☰ pliega y despliega el menú; Esc solo lo cierra cuando es un overlay de celular', () => {
    const fixture = TestBed.createComponent(AppComponent);
    TestBed.inject(DemoStore).iniciarSesion('usr-doris');
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    const btn = el.querySelector('[data-testid="btn-menu"]') as HTMLButtonElement;
    expect(btn.getAttribute('aria-expanded')).toBe('true');
    btn.click();
    fixture.detectChanges();
    expect(btn.getAttribute('aria-expanded')).toBe('false');
    expect(el.querySelector('[data-testid="menu"]')).toBeNull();
    btn.click();
    fixture.detectChanges();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();
    expect(el.querySelector('[data-testid="menu"]')).not.toBeNull();
  });

  it('las 35 pantallas tienen su ruta, con las literales antes de las de parámetro (§1.4)', () => {
    const paths = rutas(routes);
    for (const v of VIEWS) {
      expect(paths).toContain(v.path);
    }
    for (const [literal, param] of [
      ['admin/empresas/nueva', 'admin/empresas/:empresaId'],
      ['empresa/flota/vendedores/nuevo', 'empresa/flota/vendedores/:vendedorId'],
      ['empresa/cargues/nuevo', 'empresa/cargues/:cargaId'],
      ['conductor/ventas/nueva', 'conductor/ventas/:ventaId'],
    ]) {
      expect(paths.indexOf(literal)).toBeLessThan(paths.indexOf(param));
    }
  });
});
