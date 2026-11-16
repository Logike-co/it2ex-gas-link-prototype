import { formatDateTime, formatKg, formatMoney, normalizeCompanyName, normalizePlaca, parseKg, parsePesos } from './format';

describe('Formatos (flow-map §0)', () => {
  it('pesos colombianos enteros con punto de miles', () => {
    expect(formatMoney(1_000_000)).toBe('$ 1.000.000');
    expect(formatMoney(0)).toBe('$ 0');
    expect(formatMoney(-50_000)).toBe('−$ 50.000');
  });

  it('kilos con un decimal y coma', () => {
    expect(formatKg(2356)).toBe('235,6 kg');
    expect(formatKg(454)).toBe('45,4 kg');
    expect(formatKg(12_000)).toBe('1.200,0 kg');
  });

  it('fecha corta en español', () => {
    expect(formatDateTime(new Date(2026, 10, 18, 9, 15).toISOString())).toBe('mié 18 nov · 9:15 a. m.');
    expect(formatDateTime(new Date(2026, 10, 19, 15, 5).toISOString())).toBe('jue 19 nov · 3:05 p. m.');
  });

  it('lee pesos escritos a mano y rechaza decimales', () => {
    expect(parsePesos('172.000')).toEqual({ kind: 'ok', value: 172_000 });
    expect(parsePesos('$ 750.000')).toEqual({ kind: 'ok', value: 750_000 });
    expect(parsePesos('-5000')).toEqual({ kind: 'ok', value: -5000 });
    expect(parsePesos('82.5x')).toEqual({ kind: 'invalid' });
    expect(parsePesos('82,5')).toEqual({ kind: 'invalid' });
    expect(parsePesos('')).toEqual({ kind: 'empty' });
    expect(parseKg('45,4')).toEqual({ kind: 'ok', value: 454 });
    expect(parseKg('45,45')).toEqual({ kind: 'invalid' });
  });

  it('normaliza nombres de empresa y placas', () => {
    expect(normalizeCompanyName('Gas Cóndor Demo S.A.S.')).toBe(normalizeCompanyName('gas condor demo'));
    expect(normalizePlaca('glk105')).toBe('GLK 105');
    expect(normalizePlaca('GLK 106')).toBe('GLK 106');
    expect(normalizePlaca('GL 10')).toBeNull();
  });
});
