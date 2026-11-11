import { describe, expect, it } from 'vitest';
import { percentRemainder, scalePercents } from '../../src/engine/numeric';

describe('M7-15 exact proportional alignment to 100%', () => {
  it('scales an exact proportion to 100', () => {
    expect(scalePercents(['20', '20', '10'], 2)).toEqual(['40', '40', '20']);
    expect(scalePercents(['50', '100'], 2)).toEqual(['33.33', '66.67']);
  });

  it('keeps the sum at exactly 100 by largest remainder, ties to the lower index', () => {
    const aligned = scalePercents(['1', '1', '1'], 2);
    expect(aligned).toEqual(['33.34', '33.33', '33.33']);
    expect(percentRemainder(aligned!)).toBe('0');
    const seven = scalePercents(['1', '1', '1', '1', '1', '1', '1'], 2);
    expect(seven).toEqual([
      '14.29',
      '14.29',
      '14.29',
      '14.29',
      '14.28',
      '14.28',
      '14.28',
    ]);
    expect(percentRemainder(seven!)).toBe('0');
  });

  it('leaves zeros at zero and an exact 100 unchanged', () => {
    expect(scalePercents(['0', '30', '0', '10'], 2)).toEqual([
      '0',
      '75',
      '0',
      '25',
    ]);
    expect(scalePercents(['12.5', '87.5'], 2)).toEqual(['12.5', '87.5']);
  });

  it('reads the comma notation exactly', () => {
    expect(scalePercents(['0,5', '1,5'], 2)).toEqual(['25', '75']);
  });

  it('refuses invalid, negative, empty or all-zero input', () => {
    expect(scalePercents(['abc', '10'], 2)).toBeNull();
    expect(scalePercents(['-1', '10'], 2)).toBeNull();
    expect(scalePercents([], 2)).toBeNull();
    expect(scalePercents(['0', '0'], 2)).toBeNull();
  });

  it('keeps locked values exactly and scales only the others to the rest', () => {
    expect(scalePercents(['40', '20', '10', '10'], 2, [0])).toEqual([
      '40',
      '30',
      '15',
      '15',
    ]);
    expect(scalePercents(['25.5', '1', '2'], 2, [0])).toEqual([
      '25.5',
      '24.83',
      '49.67',
    ]);
    expect(scalePercents(['100', '5'], 2, [0])).toEqual(['100', '0']);
    expect(scalePercents(['60', '50', '1'], 2, [0, 1])).toBeNull();
    expect(scalePercents(['40', '0', '0'], 2, [0])).toBeNull();
    expect(scalePercents(['33.333', '1'], 2, [0])).toBeNull();
  });

  it('is deterministic over repeated runs and sums to 100 for random inputs', () => {
    let seed = 7;
    const next = () => {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      return seed;
    };
    for (let run = 0; run < 200; run += 1) {
      const count = 1 + (next() % 8);
      const texts = Array.from(
        { length: count },
        () => `${next() % 100}.${next() % 100}`,
      );
      if (texts.every((text) => /^0\.0?0?$/.test(text))) continue;
      const first = scalePercents(texts, 2);
      expect(first).not.toBeNull();
      expect(percentRemainder(first!)).toBe('0');
      expect(scalePercents([...texts], 2)).toEqual(first);
    }
  });
});
