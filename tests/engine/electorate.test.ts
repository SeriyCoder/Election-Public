import electorateSource from '../../src/engine/electorate.ts?raw';
import { describe, expect, it } from 'vitest';
import {
  deriveOverallTurnout,
  deriveElectorate,
  describeElectorate,
} from '../../src/engine/electorate';
import { percentRemainder } from '../../src/engine/numeric';
import { toFractionString } from '../../src/engine/rational';
import { createPrng, randomInt, randomParts } from './helpers/prng';

/** The Section 14.4 group shares (CBS 2022), group order secular … other. */
const CBS = ['33.6', '24.5', '7.9', '11', '17', '6'];

/** Section 14.4 vote weights per group, party order Likud … Ra'am. */
const WEIGHTS = [
  ['25', '45', '20', '5', '5', '0'],
  ['45', '20', '5', '15', '15', '0'],
  ['20', '5', '0', '55', '20', '0'],
  ['10', '5', '0', '15', '70', '0'],
  ['10', '10', '5', '0', '0', '75'],
  ['30', '35', '15', '10', '5', '5'],
];

const T70 = ['70', '70', '70', '70', '70', '70'];

/** The example described by party: two-decimal shares, one-decimal rows. */
const SHARES = ['25.61', '24.77', '9.69', '11.95', '14.93', '13.05'];
const COMPOSITIONS = [
  ['32.8', '43.1', '6.2', '4.3', '6.6', '7'],
  ['61', '19.8', '1.6', '2.2', '6.9', '8.5'],
  ['69.3', '12.6', '0', '0', '8.8', '9.3'],
  ['14.1', '30.7', '36.4', '13.8', '0', '5'],
  ['11.2', '24.6', '10.6', '51.6', '0', '2'],
  ['0', '0', '0', '0', '97.7', '2.3'],
];

/** Exact derivation of the described example at 70% turnout. */
const DERIVED_POPULATION = [
  '33.5821',
  '24.5047',
  '7.9165',
  '10.9991',
  '17.002',
  '5.9956',
];
const DERIVED_WEIGHTS = [
  ['25.0136', '44.9934', '19.9963', '5.0174', '4.9793', '0'],
  ['45.044', '20.0143', '4.9825', '14.9712', '14.988', '0'],
  ['20.057', '5.0062', '0', '54.9459', '19.9909', '0'],
  ['10.0119', '4.9544', '0', '14.993', '70.0407', '0'],
  ['9.9416', '10.0525', '5.0154', '0', '0', '74.9905'],
  ['29.9004', '35.1168', '15.0306', '9.9657', '4.9803', '5.0062'],
];

/** A canonical percent with at most four decimals: no sign, no trailing zero. */
const CANONICAL = /^(0|[1-9]\d*)(\.\d{0,3}[1-9])?$/;

function derived(
  shares: readonly string[],
  compositions: readonly (readonly string[])[],
  turnouts: readonly string[],
) {
  const result = deriveElectorate(shares, compositions, turnouts);
  if (result === null) {
    throw new Error('expected a derivation');
  }
  return result;
}

describe('deriveElectorate', () => {
  it('derives the group shares and vote weights of the described example exactly', () => {
    expect(derived(SHARES, COMPOSITIONS, T70)).toEqual({
      populationShares: DERIVED_POPULATION,
      voteWeights: DERIVED_WEIGHTS,
    });
  });

  it('makes a group with lower turnout larger and keeps the weights', () => {
    const turnouts = ['70', '70', '70', '70', '50', '70'];
    expect(derived(SHARES, COMPOSITIONS, turnouts)).toEqual({
      populationShares: [
        '31.4436',
        '22.9443',
        '7.4124',
        '10.2988',
        '22.2871',
        '5.6138',
      ],
      voteWeights: DERIVED_WEIGHTS,
    });
  });

  it('divides each group’s votes by its turnout', () => {
    expect(
      derived(
        ['60', '40'],
        [
          ['50', '50'],
          ['0', '100'],
        ],
        ['50', '100'],
      ),
    ).toEqual({
      populationShares: ['46.1538', '53.8462'],
      voteWeights: [
        ['100', '0'],
        ['42.8571', '57.1429'],
      ],
    });
  });

  it('accepts a comma as the decimal separator', () => {
    expect(
      derived(
        ['50', '30,5', '19,5'],
        [
          ['50', '50'],
          ['0', '100'],
          ['10,5', '89,5'],
        ],
        ['80', '55,5'],
      ),
    ).toEqual(
      derived(
        ['50', '30.5', '19.5'],
        [
          ['50', '50'],
          ['0', '100'],
          ['10.5', '89.5'],
        ],
        ['80', '55.5'],
      ),
    );
  });

  it('gives a group no party draws from a zero share and even weights', () => {
    expect(
      derived(
        ['50', '50'],
        [
          ['100', '0', '0'],
          ['0', '100', '0'],
        ],
        ['70', '70', '70'],
      ),
    ).toEqual({
      populationShares: ['50', '50', '0'],
      voteWeights: [
        ['100', '0'],
        ['0', '100'],
        ['50', '50'],
      ],
    });
    expect(
      derived(
        ['50', '25', '25'],
        [
          ['100', '0'],
          ['100', '0'],
          ['100', '0'],
        ],
        ['70', '0'],
      ),
    ).toEqual({
      populationShares: ['100', '0'],
      voteWeights: [
        ['50', '25', '25'],
        ['33.3334', '33.3333', '33.3333'],
      ],
    });
  });

  it('gives back the group shares when every party has the same composition and turnout is even', () => {
    expect(
      derived(['25', '25', '25', '25'], [CBS, CBS, CBS, CBS], T70),
    ).toEqual({
      populationShares: CBS,
      voteWeights: CBS.map(() => ['25', '25', '25', '25']),
    });
  });

  it.each([
    ['no parties', [], [], T70],
    ['no groups', ['100'], [[]], []],
    ['fewer composition rows than parties', ['50', '50'], [['100']], ['70']],
    ['a row shorter than the groups', ['100'], [['100']], ['70', '70']],
    ['an invalid share', ['abc', '100'], [['100'], ['100']], ['70']],
    ['a negative share', ['-10', '110'], [['100'], ['100']], ['70']],
    ['a share above 100', ['100.5', '0'], [['100'], ['100']], ['70']],
    ['shares not summing to 100', ['60', '30'], [['100'], ['100']], ['70']],
    ['a row not summing to 100', ['100'], [['60', '30']], ['70', '70']],
    ['a negative composition', ['100'], [['-10', '110']], ['70', '70']],
    ['an invalid turnout', ['100'], [['100']], ['x']],
    ['a turnout above 100', ['100'], [['100']], ['100.5']],
    ['a negative turnout', ['100'], [['100']], ['-1']],
    ['no turnout in a group that votes', ['100'], [['50', '50']], ['70', '0']],
  ])('gives no result for %s', (_, shares, compositions, turnouts) => {
    expect(deriveElectorate(shares, compositions, turnouts)).toBeNull();
  });

  it('is pure and gives identical strings on every call', () => {
    const shares = [...SHARES];
    const compositions = COMPOSITIONS.map((row) => [...row]);
    const first = deriveElectorate(shares, compositions, T70);
    expect(deriveElectorate(shares, compositions, T70)).toEqual(first);
    expect(shares).toEqual(SHARES);
    expect(compositions).toEqual(COMPOSITIONS);
  });

  it('sums every result to exactly 100 in canonical four-decimal percents', () => {
    const next = createPrng(2027);
    const percent = (units: number) =>
      units % 100 === 0
        ? `${units / 100}`
        : `${Math.floor(units / 100)}.${`${units % 100}`.padStart(2, '0')}`;
    for (let round = 0; round < 200; round += 1) {
      const parties = randomInt(next, 2, 10);
      const groups = randomInt(next, 1, 8);
      const shares = randomParts(next, parties, 10000).map(percent);
      const compositions = shares.map(() =>
        randomParts(next, groups, 10000).map(percent),
      );
      const turnouts = Array.from({ length: groups }, () =>
        percent(randomInt(next, 100, 10000)),
      );
      const result = derived(shares, compositions, turnouts);
      expect(result.populationShares).toHaveLength(groups);
      expect(percentRemainder(result.populationShares)).toBe('0');
      expect(result.voteWeights).toHaveLength(groups);
      for (const row of result.voteWeights) {
        expect(row).toHaveLength(parties);
        expect(percentRemainder(row)).toBe('0');
      }
      for (const value of [
        ...result.populationShares,
        ...result.voteWeights.flat(),
      ]) {
        expect(value).toMatch(CANONICAL);
      }
    }
  });
});

describe('deriveOverallTurnout', () => {
  it('derives the exact overall turnout from group turnouts', () => {
    expect(
      toFractionString(deriveOverallTurnout(SHARES, COMPOSITIONS, T70)!),
    ).toBe('7/10');
  });

  it('leaves turnout underdetermined when a group has zero turnout', () => {
    expect(
      deriveOverallTurnout(SHARES, COMPOSITIONS, [
        '70',
        '70',
        '70',
        '70',
        '0',
        '70',
      ]),
    ).toBeNull();
  });
});

describe('describeElectorate', () => {
  it('describes the Section 14.4 example by party', () => {
    expect(describeElectorate(CBS, T70, WEIGHTS, 2, 1)).toEqual({
      partyShares: SHARES,
      compositions: COMPOSITIONS,
    });
  });

  it('derives back to the group shares it was described from', () => {
    const described = describeElectorate(CBS, T70, WEIGHTS, 6, 6);
    if (described === null) {
      throw new Error('expected a description');
    }
    expect(
      derived(described.partyShares, described.compositions, T70)
        .populationShares,
    ).toEqual(CBS);
  });

  it('gives a party without votes an even composition', () => {
    expect(
      describeElectorate(
        ['50', '50'],
        ['70', '70'],
        [
          ['100', '0'],
          ['100', '0'],
        ],
        2,
        1,
      ),
    ).toEqual({
      partyShares: ['100', '0'],
      compositions: [
        ['50', '50'],
        ['50', '50'],
      ],
    });
  });

  it('weighs each group by its turnout', () => {
    expect(
      describeElectorate(
        ['50', '50'],
        ['100', '50'],
        [
          ['100', '0'],
          ['0', '100'],
        ],
        2,
        2,
      ),
    ).toEqual({
      partyShares: ['66.67', '33.33'],
      compositions: [
        ['100', '0'],
        ['0', '100'],
      ],
    });
  });

  it.each([
    ['no groups', [], [], []],
    ['fewer turnouts than groups', ['50', '50'], ['70'], [['100'], ['100']]],
    ['rows of different lengths', ['100'], ['70'], [['50', '50'], ['100']]],
    [
      'shares not summing to 100',
      ['50', '40'],
      ['70', '70'],
      [['100'], ['100']],
    ],
    ['a weight row not summing to 100', ['100'], ['70'], [['60', '30']]],
    ['an invalid weight', ['100'], ['70'], [['x', '100']]],
    ['a turnout above 100', ['100'], ['101'], [['100']]],
    ['no votes at all', ['50', '50'], ['0', '0'], [['100'], ['100']]],
  ])('gives no result for %s', (_, shares, turnouts, weights) => {
    expect(describeElectorate(shares, turnouts, weights, 2, 1)).toBeNull();
  });

  it('rounds to the requested places with sums of exactly 100', () => {
    const result = describeElectorate(CBS, T70, WEIGHTS, 0, 0);
    if (result === null) {
      throw new Error('expected a description');
    }
    expect(percentRemainder(result.partyShares)).toBe('0');
    for (const row of result.compositions) {
      expect(percentRemainder(row)).toBe('0');
      for (const value of row) {
        expect(value).toMatch(/^(0|[1-9]\d*)$/);
      }
    }
  });
});

describe('electorate source', () => {
  it('uses exact arithmetic only', () => {
    expect(electorateSource).not.toMatch(
      /\b(parseFloat|parseInt|toFixed|toPrecision|Math)\b|\bNumber\(/,
    );
  });
});
