import { splitCodes } from './code-text.component';

describe('splitCodes (códigos que no se parten entre líneas)', () => {
  it('marca como código cada identificador de la demo y deja el resto como texto', () => {
    expect(splitCodes('Carga CAR-A-004 · venta VTA-A-004')).toEqual([
      { text: 'Carga ', code: false },
      { text: 'CAR-A-004', code: true },
      { text: ' · venta ', code: false },
      { text: 'VTA-A-004', code: true },
    ]);
    expect(splitCodes('ref. BRB-DEMO-1001').filter((p) => p.code).map((p) => p.text)).toEqual(['BRB-DEMO-1001']);
  });

  it('deja intacto un texto sin códigos', () => {
    expect(splitCodes('Dinero en tu poder')).toEqual([{ text: 'Dinero en tu poder', code: false }]);
    expect(splitCodes('')).toEqual([]);
  });
});
