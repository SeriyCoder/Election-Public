import numericSource from '../../src/engine/numeric.ts?raw';
import { describe, expect, it } from 'vitest';
import {
  evenPercents,
  fractionToPercent,
  parseCount,
  percentRemainder,
  percentStops,
  percentToFraction,
  percentWithin,
  rebalance,
  REBALANCE_DIGITS,
  roundPercents,
  roundToPlaces,
  sumFractions,
  type RebalanceRow,
} from '../../src/engine/numeric';
import { parseDecimal, rational } from '../../src/engine/rational';

function rows(
  values: readonly (readonly [string, unknown, boolean?])[],
): RebalanceRow[] {
  return values.map(([key, value, locked]) => ({
    key,
    value,
    locked: locked === true,
  }));
}

function values(result: ReturnType<typeof rebalance>): Record<string, string> {
  if (result === null) {
    throw new Error('expected a rebalance');
  }
  return Object.fromEntries(result.map((item) => [item.key, item.value]));
}

describe('percentToFraction', () => {
  it.each([
    ['15', '0.15'],
    ['42.5', '0.425'],
    ['42,5', '0.425'],
    [' 7 ', '0.07'],
    ['0', '0'],
    ['0.0', '0'],
    ['007', '0.07'],
    ['100', '1'],
    ['150', '1.5'],
    ['-5', '-0.05'],
    ['42.6523301075268817', '0.426523301075268817'],
  ])('converts %j to %j exactly', (text, expected) => {
    expect(percentToFraction(text)).toBe(expected);
  });

  it.each([
    '',
    ' ',
    '12.',
    '.5',
    'abc',
    '1e5',
    '1,000.5',
    '5%',
    '42.65233010752688171',
    '\u0663',
    '--1',
  ])('refuses %j', (text) => {
    expect(percentToFraction(text)).toBeNull();
  });
});

describe('fractionToPercent', () => {
  it.each([
    ['0.15', '15'],
    ['0.425', '42.5'],
    ['1', '100'],
    ['0', '0'],
    ['0.40', '40'],
    ['-0.05', '-5'],
    ['0.426523301075268817', '42.6523301075268817'],
  ])('shows %j as %j', (value, expected) => {
    expect(fractionToPercent(value)).toBe(expected);
  });

  it.each([['x'], [0.5], [null], [undefined], ['']])(
    'gives no value for %j',
    (value) => {
      expect(fractionToPercent(value)).toBeNull();
    },
  );

  it('round-trips through percent text exactly', () => {
    for (const value of ['0.000000000000000001', '0.333333333333333334']) {
      expect(percentToFraction(fractionToPercent(value) ?? '')).toBe(value);
    }
  });
});

describe('sumFractions', () => {
  it('adds decimal strings exactly', () => {
    expect(sumFractions(['0.38', '0.42', '0.15', '0.05'])).toBe('1');
    expect(
      sumFractions([
        '0.333333333333333333',
        '0.333333333333333333',
        '0.333333333333333334',
      ]),
    ).toBe('1');
    expect(sumFractions(['0.1', '0.2'])).toBe('0.3');
  });

  it('is zero for an empty list', () => {
    expect(sumFractions([])).toBe('0');
  });

  it('gives no value when any entry is invalid', () => {
    expect(sumFractions(['0.1', 'x'])).toBeNull();
    expect(sumFractions(['0.1', 0.2])).toBeNull();
  });
});

describe('parseCount', () => {
  it.each([
    ['120', 120],
    ['1', 1],
    [' 61 ', 61],
    ['99999', 99999],
  ])('reads %j as %d', (text, expected) => {
    expect(parseCount(text)).toBe(expected);
  });

  it.each(['', '0', '00', '010', '100000', '12a', '-1', '1.0', '1e3'])(
    'refuses %j',
    (text) => {
      expect(parseCount(text)).toBeNull();
    },
  );
});

describe('rebalance', () => {
  it('scales unlocked rows to fill what the locked rows leave', () => {
    const result = rebalance(
      rows([
        ['A', '0.2', true],
        ['B', '0.3'],
        ['C', '0.1'],
      ]),
    );
    expect(result).toEqual([
      { key: 'A', value: '0.2' },
      { key: 'B', value: '0.6' },
      { key: 'C', value: '0.2' },
    ]);
  });

  it('rounds to 18 places by largest remainder, ties to the earlier row', () => {
    expect(REBALANCE_DIGITS).toBe(18);
    const result = values(
      rebalance(
        rows([
          ['A', '0.1'],
          ['B', '0.1'],
          ['C', '0.1'],
        ]),
      ),
    );
    expect(result).toEqual({
      A: '0.333333333333333334',
      B: '0.333333333333333333',
      C: '0.333333333333333333',
    });
  });

  it('gives the rounding unit to the largest remainder first', () => {
    const result = values(
      rebalance(
        rows([
          ['A', '1'],
          ['B', '2'],
        ]),
      ),
    );
    expect(result).toEqual({
      A: '0.333333333333333333',
      B: '0.666666666666666667',
    });
  });

  it('splits equally when every unlocked row is zero', () => {
    expect(
      values(
        rebalance(
          rows([
            ['A', '0.4', true],
            ['B', '0'],
            ['C', '0'],
          ]),
        ),
      ),
    ).toEqual({ A: '0.4', B: '0.3', C: '0.3' });
  });

  it('sets unlocked rows to zero when locked rows already fill the target', () => {
    expect(
      values(
        rebalance(
          rows([
            ['A', '1', true],
            ['B', '0.2'],
          ]),
        ),
      ),
    ).toEqual({ A: '1', B: '0' });
  });

  it('keeps locked values exactly as written', () => {
    expect(
      values(
        rebalance(
          rows([
            ['A', '0.40', true],
            ['B', '0.5'],
          ]),
        ),
      ).A,
    ).toBe('0.40');
  });

  it.each([
    [
      'locked rows exceed the target',
      [
        ['A', '0.7', true],
        ['B', '0.4', true],
        ['C', '0.1'],
      ],
    ],
    ['no row is unlocked', [['A', '0.5', true]]],
    ['there are no rows', []],
    [
      'a value is invalid',
      [
        ['A', 'x'],
        ['B', '0.5'],
      ],
    ],
    [
      'a value is negative',
      [
        ['A', '-0.1'],
        ['B', '0.5'],
      ],
    ],
  ] as const)('refuses when %s', (_, input) => {
    expect(rebalance(rows(input))).toBeNull();
  });

  it('always sums to exactly 100%', () => {
    let seed = 7;
    const next = (): number => {
      seed = (seed * 48271) % 2147483647;
      return seed;
    };
    for (let run = 0; run < 200; run += 1) {
      const count = (next() % 7) + 1;
      const input = Array.from(
        { length: count },
        (_, index) =>
          [
            `R${index}`,
            `0.${String(next() % 1000).padStart(3, '0')}`,
            index > 0 && next() % 4 === 0,
          ] as const,
      );
      const lockedTotal = sumFractions(
        input.filter((row) => row[2]).map((row) => row[1]),
      );
      const result = rebalance(rows(input));
      if (result === null) {
        continue;
      }
      expect(lockedTotal).not.toBeNull();
      expect(sumFractions(result.map((item) => item.value))).toBe('1');
      expect(result.map((item) => item.key)).toEqual(input.map((r) => r[0]));
    }
  });

  it('is deterministic', () => {
    const input = rows([
      ['A', '0.123'],
      ['B', '0.456', true],
      ['C', '0.789'],
    ]);
    expect(rebalance(input)).toEqual(rebalance(input));
  });
});

describe('roundToPlaces', () => {
  it.each([
    ['1/3', 2, '0.33'],
    ['2/3', 2, '0.67'],
    ['0.125', 2, '0.13'],
    ['-0.125', 2, '-0.13'],
    ['2.5', 0, '3'],
    ['-2.5', 0, '-3'],
    ['0', 2, '0.00'],
    ['120', 0, '120'],
    ['0.125', 4, '0.1250'],
    ['0.9995', 3, '1.000'],
    ['45.6', 4, '45.6000'],
    ['3.249', 2, '3.25'],
    ['-0.001', 2, '0.00'],
  ])('rounds %s to %i places as %s', (value, places, expected) => {
    const [num, den] = value.split('/');
    const exact =
      den === undefined
        ? parseDecimal(value)
        : rational(BigInt(num ?? '0'), BigInt(den));
    expect(roundToPlaces(exact, places)).toBe(expected);
  });

  it('rounds large values without losing digits', () => {
    expect(roundToPlaces(parseDecimal('12345678901234567890.125'), 2)).toBe(
      '12345678901234567890.13',
    );
  });

  it.each([-1, 1.5, Number.NaN])('rejects %s places', (places) => {
    expect(() => roundToPlaces(rational(1n), places)).toThrow(RangeError);
  });
});

describe('percentWithin', () => {
  it.each([
    ['0', '0', '100', '0'],
    ['100', '0', '100', '1'],
    ['70', '0', '100', '0.7'],
    [' 33,5 ', '0', '100', '0.335'],
    ['3.25', '0', '100', '0.0325'],
    ['-100', '-100', '100', '-1'],
    ['-2.5', '-100', '100', '-0.025'],
    ['0.0000000000000001', '0', '100', '0.000000000000000001'],
  ])('accepts %s within %s..%s as %s', (text, min, max, expected) => {
    expect(percentWithin(text, min, max)).toBe(expected);
  });

  it.each([
    ['100.0000000000000001', '0', '100'],
    ['-0.0000000000000001', '0', '100'],
    ['101', '0', '100'],
    ['-101', '-100', '100'],
    ['', '0', '100'],
    ['abc', '0', '100'],
    ['1e2', '0', '100'],
    ['50%', '0', '100'],
    ['1.2.3', '0', '100'],
  ])('refuses %s within %s..%s', (text, min, max) => {
    expect(percentWithin(text, min, max)).toBeNull();
  });
});

describe('percentRemainder', () => {
  it.each([
    [['25', '25', '25', '25'], '0'],
    [['40', '35'], '25'],
    [['60', '50'], '-10'],
    [['33.3', '33.3', '33.3'], '0.1'],
    [['33,5', '66,5'], '0'],
    [['0.0000000000000001'], '99.9999999999999999'],
    [[], '100'],
  ])('gives 100 minus %j as %s', (texts, expected) => {
    expect(percentRemainder(texts)).toBe(expected);
  });

  it.each([[['25', 'x']], [['']], [['1e1']]])(
    'is null when %j holds an invalid percent',
    (texts) => {
      expect(percentRemainder(texts)).toBeNull();
    },
  );
});

describe('evenPercents', () => {
  it.each([
    [1, ['100']],
    [2, ['50', '50']],
    [3, ['34', '33', '33']],
    [4, ['25', '25', '25', '25']],
    [6, ['17', '17', '17', '17', '16', '16']],
    [7, ['15', '15', '14', '14', '14', '14', '14']],
    [8, ['13', '13', '13', '13', '12', '12', '12', '12']],
    [10, ['10', '10', '10', '10', '10', '10', '10', '10', '10', '10']],
  ])('splits 100 over %i as %j', (count, expected) => {
    expect(evenPercents(count)).toEqual(expected);
    expect(percentRemainder(evenPercents(count))).toBe('0');
  });

  it.each([0, -1, 1.5, Number.NaN, 101])('rejects %s parts', (count) => {
    expect(() => evenPercents(count)).toThrow(RangeError);
  });
});
describe('roundPercents', () => {
  it.each([
    [['33.35', '33.35', '33.3'], 1, ['33.4', '33.3', '33.3']],
    [['25', '25', '25', '25'], 0, ['25', '25', '25', '25']],
    [['33,5', '66,5'], 0, ['34', '66']],
    [['50.00', '50'], 2, ['50', '50']],
    [['100'], 0, ['100']],
    [['0', '100'], 3, ['0', '100']],
    [
      ['33.5821', '24.5047', '7.9165', '10.9991', '17.002', '5.9956'],
      1,
      ['33.6', '24.5', '7.9', '11', '17', '6'],
    ],
    [
      ['31.4436', '22.9443', '7.4124', '10.2988', '22.2871', '5.6138'],
      1,
      ['31.4', '23', '7.4', '10.3', '22.3', '5.6'],
    ],
    [
      ['33.3333333333333334', '33.3333333333333333', '33.3333333333333333'],
      4,
      ['33.3334', '33.3333', '33.3333'],
    ],
  ])('rounds %j to %i places as %j', (texts, places, expected) => {
    expect(roundPercents(texts, places)).toEqual(expected);
    expect(percentRemainder(expected)).toBe('0');
  });

  it('gives the larger remainder the unit, ties to the lower index', () => {
    expect(roundPercents(['10.04', '10.06', '79.9'], 1)).toEqual([
      '10',
      '10.1',
      '79.9',
    ]);
    expect(roundPercents(['12.5', '12.5', '75'], 0)).toEqual([
      '13',
      '12',
      '75',
    ]);
  });

  it.each([
    [['60', '30']],
    [['60', '50']],
    [['abc', '100']],
    [['-10', '110']],
    [['']],
    [[]],
  ])('is null for %j', (texts) => {
    expect(roundPercents(texts, 1)).toBeNull();
  });

  it.each([-1, 1.5, Number.NaN])('rejects %s places', (places) => {
    expect(() => roundPercents(['100'], places)).toThrow(RangeError);
  });
});

describe('percentStops', () => {
  it.each([
    [
      ['25', '25', '50'],
      ['25', '50', '100'],
    ],
    [
      ['10', '20'],
      ['10', '30'],
    ],
    [
      ['60', '60'],
      ['50', '100'],
    ],
    [
      ['abc', '50'],
      ['0', '50'],
    ],
    [
      ['-20', '50'],
      ['0', '50'],
    ],
    [
      ['', '33,5'],
      ['0', '33.5'],
    ],
    [[], []],
    [
      ['33.333', '33.333', '33.334'],
      ['33.33', '66.67', '100'],
    ],
    [
      ['0.004', '0.004'],
      ['0', '0.01'],
    ],
    [
      ['200', '0', '100'],
      ['66.67', '66.67', '100'],
    ],
  ])('gives the cumulative ends of %j as %j', (texts, expected) => {
    expect(percentStops(texts)).toEqual(expected);
  });
});

describe('numeric source', () => {
  it('uses exact arithmetic only', () => {
    expect(numericSource).not.toMatch(
      /\b(parseFloat|parseInt|toFixed|toPrecision|Math)\b|\bNumber\(/,
    );
  });
});
