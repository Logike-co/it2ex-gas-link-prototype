/**
 * Trazabilidad de la demo (flow-map §10). Perfil T0: sin historias de usuario ni Tech Specs;
 * cada vista se traza a los ítems de la matriz de alcance (F/D), a las reglas de la Fase D
 * (RN/RV) y a los escenarios Gherkin del flow-map (Exx). Si cambia el flow-map, se cambia aquí.
 */
import { ViewId } from '../core/access/access';

export type Level = 'P1' | 'P2';

export interface ItemTrace {
  id: string;
  name: string;
  level: Level;
}

/** Ítems de `scope-matrix.md` §1. */
export const ITEMS: Record<string, ItemTrace> = {
  D01: { id: 'D01', name: 'Acceso por perfil con usuarios precargados', level: 'P1' },
  D02: { id: 'D02', name: 'Guía del presentador, escenarios precargados y reinicio en un clic', level: 'P1' },
  D03: { id: 'D03', name: 'Marca GasLink: logo y colores de la interfaz', level: 'P1' },
  F01: { id: 'F01', name: 'Alta de empresas y su usuario', level: 'P1' },
  F02: { id: 'F02', name: 'Catálogo de cilindros: presentación, peso y valor unitario', level: 'P1' },
  F03: { id: 'F03', name: 'Llave de cobro de la empresa', level: 'P1' },
  F04: { id: 'F04', name: 'Vendedores con su llave, vehículos y conductores', level: 'P1' },
  F05: { id: 'F05', name: 'Cargue de cilindros con peso y valor consolidado', level: 'P1' },
  F06: { id: 'F06', name: 'Venta en calle con precio libre y selección de QR', level: 'P1' },
  F06b: { id: 'F06b', name: 'Código QR de la llave mostrado al cliente', level: 'P2' },
  F07: { id: 'F07', name: 'Registro de cobros por medio, con referencia', level: 'P1' },
  F08: { id: 'F08', name: 'Cuenta del vendedor: saldo total y por carga, dinero en su poder', level: 'P1' },
  F08b: { id: 'F08b', name: 'Informe del cruce (vista imprimible)', level: 'P2' },
  F09: { id: 'F09', name: 'Conciliación por vendedor, con referencias y marca de conciliado', level: 'P1' },
  F10: { id: 'F10', name: 'Pago del vendedor a la empresa, incluida la diferencia', level: 'P1' },
};

export interface ViewTrace {
  view: ViewId;
  items: string[];
  rules: string[];
  scenarios: string[];
}

/** Insignias por vista (§10) y escenarios Gherkin que la cubren (§4.3). */
export const VIEW_TRACE: Record<ViewId, ViewTrace> = {
  V01: { view: 'V01', items: ['D01', 'D02', 'D03'], rules: [], scenarios: ['E01', 'E02', 'E03', 'E04', 'E05', 'E44', 'E45', 'E46'] },
  V02: { view: 'V02', items: ['F01'], rules: ['RN-01'], scenarios: ['E06', 'E07'] },
  V03: { view: 'V03', items: ['F02', 'F03'], rules: ['RN-03', 'RN-04', 'RN-07'], scenarios: ['E10', 'E11', 'E12'] },
  V04: { view: 'V04', items: ['F04'], rules: ['RN-12', 'RV-04'], scenarios: ['E13', 'E14'] },
  V05: { view: 'V05', items: ['F05'], rules: ['RN-02', 'RN-03', 'RN-12'], scenarios: ['E15', 'E16', 'E17'] },
  V06: { view: 'V06', items: ['F06'], rules: ['RN-05', 'RN-06', 'RN-12', 'RV-01'], scenarios: ['E18', 'E19', 'E20', 'E21', 'E47'] },
  V07: { view: 'V07', items: ['F06', 'F06b'], rules: ['RN-07'], scenarios: ['E22', 'E23', 'E24', 'E47', 'E48'] },
  V08: { view: 'V08', items: ['F07'], rules: ['RN-08', 'RV-02'], scenarios: ['E25', 'E26', 'E27', 'E28', 'E47'] },
  V09: {
    view: 'V09',
    items: ['F08', 'F08b'],
    rules: ['RN-09', 'RN-11', 'RN-13'],
    scenarios: ['E09', 'E29', 'E30', 'E31', 'E32', 'E33', 'E34', 'E35', 'E36', 'E37'],
  },
  V10: { view: 'V10', items: ['F09', 'F10'], rules: ['RN-11', 'RN-13', 'RN-14'], scenarios: ['E38', 'E39', 'E40', 'E41', 'E42', 'E43'] },
};
