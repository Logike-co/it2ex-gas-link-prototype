/**
 * Trazabilidad de la demo (flow-map §10). Perfil T0: sin historias de usuario ni Tech Specs;
 * cada pantalla se traza a los ítems de la matriz de alcance (F/D), a las reglas de la Fase D
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
  D01: { id: 'D01', name: 'Acceso por usuario con usuarios precargados', level: 'P1' },
  D02: { id: 'D02', name: 'Guía del presentador, escenarios precargados y reinicio en un clic', level: 'P1' },
  D03: { id: 'D03', name: 'Marca GasLink: logo y colores de la interfaz', level: 'P1' },
  F01: { id: 'F01', name: 'Empresas y sus usuarios (alta, activar y desactivar)', level: 'P1' },
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

/** Insignias por pantalla (§10) y escenarios Gherkin que la cubren (§4.3). */
export const VIEW_TRACE: Record<ViewId, ViewTrace> = {
  V01: { view: 'V01', items: ['D01', 'D02', 'D03'], rules: [], scenarios: ['E01', 'E02', 'E03', 'E05', 'E44', 'E45', 'E46', 'E58', 'E65', 'E66'] },
  V02: { view: 'V02', items: ['F01'], rules: ['RN-01'], scenarios: ['E06', 'E50', 'E52'] },
  V03: { view: 'V03', items: ['F01'], rules: [], scenarios: ['E06', 'E07', 'E52'] },
  V04: { view: 'V04', items: ['F01'], rules: ['RN-01'], scenarios: ['E06', 'E52', 'E53', 'E64'] },
  V05: { view: 'V05', items: ['F01'], rules: ['R-14'], scenarios: ['E51', 'E53', 'E56', 'E57'] },
  V06: { view: 'V06', items: ['F01'], rules: ['R-14'], scenarios: ['E54', 'E55'] },
  V07: { view: 'V07', items: ['F02'], rules: ['RN-03', 'RN-04'], scenarios: ['E10', 'E11', 'E59'] },
  V08: { view: 'V08', items: ['F03'], rules: ['RN-07'], scenarios: ['E12', 'E59'] },
  V09: { view: 'V09', items: ['F04'], rules: ['RN-12'], scenarios: ['E08', 'E13'] },
  V10: { view: 'V10', items: ['F04'], rules: [], scenarios: ['E13'] },
  V11: { view: 'V11', items: ['F04'], rules: ['RN-12', 'RV-04'], scenarios: ['E13', 'E51', 'E61', 'E64'] },
  V12: { view: 'V12', items: ['F04'], rules: ['RV-04'], scenarios: ['E08', 'E13', 'E14'] },
  V13: { view: 'V13', items: ['F04'], rules: ['RV-04'], scenarios: ['E14', 'E61'] },
  V14: { view: 'V14', items: ['F04'], rules: ['RN-12'], scenarios: ['E13'] },
  V15: { view: 'V15', items: ['F04'], rules: ['RN-12'], scenarios: ['E13', 'E61'] },
  V16: { view: 'V16', items: ['F05'], rules: ['RN-02'], scenarios: ['E15', 'E52', 'E59'] },
  V17: { view: 'V17', items: ['F05'], rules: ['RN-02', 'RN-03', 'RN-12', 'R-16'], scenarios: ['E15', 'E17', 'E59', 'E60'] },
  V18: { view: 'V18', items: ['F05'], rules: ['RN-03', 'RN-13'], scenarios: ['E15', 'E16', 'E64'] },
  V19: { view: 'V19', items: ['F08'], rules: ['RN-09'], scenarios: ['E52'] },
  V20: { view: 'V20', items: ['F08'], rules: ['RN-09', 'RN-11', 'RN-13'], scenarios: ['E09', 'E35', 'E36', 'E51', 'E62'] },
  V21: { view: 'V21', items: ['F08b'], rules: ['RN-09'], scenarios: ['E37'] },
  V22: { view: 'V22', items: ['F09'], rules: ['RN-11'], scenarios: ['E08', 'E38', 'E42', 'E43'] },
  V23: { view: 'V23', items: ['F09'], rules: ['RN-11', 'RN-14'], scenarios: ['E38', 'E39', 'E40', 'E43', 'E62', 'E64'] },
  V24: { view: 'V24', items: ['F10'], rules: ['RN-14'], scenarios: ['E62'] },
  V25: { view: 'V25', items: ['F10'], rules: ['RN-13', 'RN-14'], scenarios: ['E40', 'E41', 'E42', 'E62', 'E64'] },
  V26: { view: 'V26', items: ['F08'], rules: ['RN-09', 'RN-11'], scenarios: ['E29', 'E36'] },
  V27: { view: 'V27', items: ['F08'], rules: ['RN-13'], scenarios: ['E30', 'E31', 'E32', 'E51', 'E64'] },
  V28: { view: 'V28', items: ['F08'], rules: ['RN-09'], scenarios: ['E29'] },
  V29: { view: 'V29', items: ['F08b'], rules: ['RN-09'], scenarios: ['E37'] },
  V30: { view: 'V30', items: ['F06'], rules: ['RV-01'], scenarios: ['E02', 'E16', 'E47'] },
  V31: { view: 'V31', items: ['F06'], rules: ['RN-05', 'RN-06', 'RN-12', 'RV-01'], scenarios: ['E18', 'E19', 'E20', 'E21', 'E47'] },
  V32: { view: 'V32', items: ['F06'], rules: [], scenarios: ['E47', 'E63'] },
  V33: { view: 'V33', items: ['F06'], rules: ['RN-10', 'RN-12'], scenarios: ['E18', 'E47', 'E63', 'E64'] },
  V34: { view: 'V34', items: ['F06', 'F06b'], rules: ['RN-07'], scenarios: ['E22', 'E23', 'E24', 'E47', 'E48', 'E63'] },
  V35: { view: 'V35', items: ['F07'], rules: ['RN-08', 'RV-02'], scenarios: ['E25', 'E26', 'E27', 'E28', 'E47', 'E63'] },
};
