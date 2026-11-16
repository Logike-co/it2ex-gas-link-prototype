/**
 * Formatos de pantalla (flow-map §0): pesos colombianos enteros con punto de miles y espacio
 * tras el signo (`$ 1.000.000`), kilos con un decimal y coma (`235,6 kg`) y fechas cortas en
 * español de Colombia (`mié 18 nov · 9:15 a. m.`). Se arman a mano, sin `Intl`, para que el
 * resultado sea idéntico en cualquier navegador y en las pruebas (sin espacios duros).
 */

const groupThousands = (n: number): string => String(Math.round(Math.abs(n))).replace(/\B(?=(\d{3})+(?!\d))/g, '.');

/** `$ 1.000.000`; negativo: `−$ 50.000`. */
export const formatMoney = (n: number): string => `${n < 0 ? '−' : ''}$ ${groupThousands(n)}`;

/** `1.000.000` (sin signo de pesos), para campos y tablas compactas. */
export const formatNumber = (n: number): string => `${n < 0 ? '−' : ''}${groupThousands(n)}`;

/** Décimas de kilo → `235,6 kg`. */
export const formatKg = (decimas: number): string => {
  const sign = decimas < 0 ? '−' : '';
  const abs = Math.abs(Math.round(decimas));
  return `${sign}${groupThousands(Math.floor(abs / 10))},${abs % 10} kg`;
};

const DIAS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/** `9:15 a. m.` */
export const formatHour = (iso: string): string => {
  const d = new Date(iso);
  const h = d.getHours();
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(d.getMinutes()).padStart(2, '0')} ${h < 12 ? 'a. m.' : 'p. m.'}`;
};

/** `mié 18 nov` */
export const formatDay = (iso: string): string => {
  const d = new Date(iso);
  return `${DIAS[d.getDay()]} ${d.getDate()} ${MESES[d.getMonth()]}`;
};

/** `mié 18 nov · 9:15 a. m.` */
export const formatDateTime = (iso: string | null | undefined): string =>
  iso ? `${formatDay(iso)} · ${formatHour(iso)}` : '—';

/** Resultado de leer un número escrito por el usuario. */
export type Parsed = { kind: 'ok'; value: number } | { kind: 'empty' } | { kind: 'invalid' };

/**
 * Lee un valor en pesos escrito a mano: `172000`, `172.000`, `$ 172.000` o `-5000`.
 * Rechaza decimales y letras (`82.5x`, `82,5`).
 */
export const parsePesos = (text: string | number | null | undefined): Parsed => {
  if (typeof text === 'number') {
    return Number.isInteger(text) ? { kind: 'ok', value: text } : { kind: 'invalid' };
  }
  const t = String(text ?? '')
    .replace(/\$/g, '')
    .replace(/\s+/g, '');
  if (t === '') {
    return { kind: 'empty' };
  }
  if (/^-?\d+$/.test(t) || /^-?\d{1,3}(\.\d{3})+$/.test(t)) {
    return { kind: 'ok', value: Number(t.replace(/\./g, '')) };
  }
  return { kind: 'invalid' };
};

/** Lee un peso en kilos con máximo un decimal (`45,4` o `45.4`) y lo devuelve en décimas. */
export const parseKg = (text: string | number | null | undefined): Parsed => {
  const t = String(text ?? '').trim().replace(',', '.');
  if (t === '') {
    return { kind: 'empty' };
  }
  if (!/^-?\d+(\.\d)?$/.test(t)) {
    return { kind: 'invalid' };
  }
  return { kind: 'ok', value: Math.round(Number(t) * 10) };
};

/** Décimas de kilo → texto editable `45,4`. */
export const kgInput = (decimas: number): string => `${Math.floor(decimas / 10)},${decimas % 10}`;

/** Texto sin tildes, en minúsculas y con espacios simples: para comparar nombres. */
export const normalizeText = (s: string): string =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

/** Nombre de empresa comparable: sin tildes, mayúsculas ni la razón social («S.A.S.»). */
export const normalizeCompanyName = (s: string): string => normalizeText(s).replace(/\s*\bs\s?a\s?s\b\s*$/, '').trim();

/** Placa `glk105` → `GLK 105`; null si no tiene el formato `AAA 999` (SUP-16). */
export const normalizePlaca = (s: string): string | null => {
  const m = /^([A-Za-z]{3})\s*-?\s*(\d{3})$/.exec(s.trim());
  return m ? `${m[1].toUpperCase()} ${m[2]}` : null;
};
