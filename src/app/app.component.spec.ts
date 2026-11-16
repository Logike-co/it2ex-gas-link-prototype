import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AppComponent } from './app.component';
import { routes } from './app.routes';
import { DISCLAIMER } from './brand';
import { DemoStore } from './core/state/demo.store';
import { VIEWS } from './views';

describe('AppComponent (shell)', () => {
  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({ imports: [AppComponent], providers: [provideRouter(routes)] }).compileComponents();
  });

  it('E03: la leyenda obligatoria y el logo de GasLink siempre están visibles; sin sesión no hay menú', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('[data-testid="leyenda-demo"]')?.textContent?.trim()).toBe(DISCLAIMER);
    expect(DISCLAIMER).toBe('DEMO CON DATOS FICTICIOS · SIN PAGOS REALES');
    expect(el.querySelector('[data-testid="logo-img"]')?.getAttribute('src')).toBe('gaslink-logo.png');
    expect(el.querySelector('[data-testid="logo-img"]')?.getAttribute('alt')).toContain('GasLink');
    expect(el.querySelector('[data-testid="menu"]')).toBeNull();
    expect(el.querySelector('[data-testid="btn-reiniciar"]')).not.toBeNull();
    expect(el.querySelector('[data-testid="btn-guia"]')).not.toBeNull();
  });

  it('ALC-01: con sesión, el menú muestra solo las vistas del perfil activo', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const store = TestBed.inject(DemoStore);
    const menu = () => [...fixture.nativeElement.querySelectorAll('[data-testid^="nav-"]')].map((a: Element) => a.textContent?.trim());
    store.iniciarSesion('usr-paula');
    fixture.detectChanges();
    expect(menu()).toEqual(['Cargue', 'Cuentas', 'Conciliación', 'Flota', 'Catálogo y llave']);
    expect(fixture.nativeElement.querySelector('[data-testid="empresa-sesion"]')?.textContent).toContain('Gas Cóndor Demo');
    store.iniciarSesion('usr-ramiro', 'conductor');
    fixture.detectChanges();
    expect(menu()).toEqual(['Nueva venta', 'Cobro con QR', 'Registro de montos']);
    expect(fixture.nativeElement.querySelector('[data-testid="perfil-sesion"]')?.textContent).toBe('conductor');
  });

  it('el cambio rápido de perfil lista cada usuario con cada uno de sus perfiles', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const options = [...fixture.nativeElement.querySelectorAll('[data-testid="cambio-perfil"] option')].map((o: Element) => o.textContent?.trim());
    expect(options).toContain('Ramiro Cárdenas · vendedor');
    expect(options).toContain('Ramiro Cárdenas · conductor');
    expect(options).toContain('Andrea Ríos · administrador');
    expect(options.filter((o) => o?.includes(' · ')).length).toBe(14);
  });

  it('cada vista tiene una ruta registrada', () => {
    const paths = routes.map((r) => r.path);
    for (const v of VIEWS) {
      expect(paths).toContain(v.path);
    }
  });
});
