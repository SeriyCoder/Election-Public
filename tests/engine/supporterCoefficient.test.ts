import { describe, expect, it } from 'vitest';
import {
  COEFFICIENT_PREFIX,
  coefficientEntry,
  freezeSupporters,
  parseCoefficient,
  populationTimeline,
  populationTrend,
  runSupporters,
  stepCoefficient,
  supporterRows,
  turnoutAt,
  type SupporterBasis,
} from '../../src/engine/supporterTurnout';
import { buildCoalitionFuture } from '../../src/engine/future';
import { rational, toFractionString } from '../../src/engine/rational';
import { runSeats, serializeResult } from '../../src/engine/run';
import { validateScenario, type Scenario } from '../../src/engine/schema';
import { workspaceLinked, workspaceParties } from './helpers/workspace';
import { createPrng, randomInt } from './helpers/prng';
import type { Json } from './helpers/scenarios';

function scenario(input: unknown = workspaceLinked()): Scenario {
  const result = validateScenario(input);
  if (!result.ok) throw new Error(JSON.stringify(result.issues));
  return result.scenario;
}
function basis(input: unknown = workspaceLinked()): SupporterBasis {
  const result = freezeSupporters(scenario(input));
  if ('kind' in result) throw new Error(result.reason);
  return result;
}
const seatSum = (result: {
  allocation: { parties: readonly { seats: number }[] };
}) =>
  result.allocation.parties.reduce((total, party) => total + party.seats, 0);

describe('M7-17 exact supporter coefficient', () => {
  it.each([
    ['3/5', '0', '3/5'],
    ['3/5', '1', '1'],
    ['3/5', '-1', '0'],
    ['3/5', '1/2', '4/5'],
    ['3/5', '-1/2', '3/10'],
    ['1/3', '1/4', '1/2'],
    ['1/3', '-1/4', '1/4'],
    ['0', '1/2', '1/2'],
    ['1', '-1/2', '1/2'],
  ])('maps turnout %s with coefficient %s to %s exactly', (t, c, expected) => {
    const parse = (text: string) => {
      const [n, d = '1'] = text.split('/');
      return rational(BigInt(n!), BigInt(d));
    };
    expect(toFractionString(turnoutAt(parse(t), parse(c)))).toBe(expected);
  });

  it('refuses coefficients and turnouts outside their ranges', () => {
    expect(() => turnoutAt(rational(1n, 2n), rational(11n, 10n))).toThrow(
      RangeError,
    );
    expect(() => turnoutAt(rational(1n, 2n), rational(-11n, 10n))).toThrow(
      RangeError,
    );
    expect(() => turnoutAt(rational(3n, 2n), rational(0n))).toThrow(RangeError);
  });

  it.each([
    ['0', '0'],
    ['+0.25', '1/4'],
    ['0,5', '1/2'],
    ['-1', '-1'],
    ['1', '1'],
    [' -0.05 ', '-1/20'],
    ['0.333', '333/1000'],
  ])('parses the coefficient text %j exactly', (text, expected) => {
    const value = parseCoefficient(text);
    expect(value === null ? null : toFractionString(value)).toBe(expected);
  });

  it.each(['', 'abc', '1.01', '-1.5', '2', '0.5%', '1e-2', '--1'])(
    'refuses the coefficient text %j',
    (text) => {
      expect(parseCoefficient(text)).toBeNull();
      expect(coefficientEntry(text)).toBeNull();
    },
  );

  it('marks a coefficient entry with the fixed prefix', () => {
    expect(COEFFICIENT_PREFIX).toBe('coef:');
    expect(coefficientEntry('0,25')).toBe('coef:0.25');
    expect(coefficientEntry('+0.5')).toBe('coef:0.5');
  });

  it.each([
    ['0.00', 1, '0.05'],
    ['0.00', -1, '-0.05'],
    ['0.25', 1, '0.30'],
    ['0.333', 1, '0.383'],
    ['0.98', 1, '1.00'],
    ['1', 1, '1.00'],
    ['-0.97', -1, '-1.00'],
    ['-1', -1, '-1.00'],
    ['-0.05', 1, '0.00'],
  ] as const)(
    'steps %s by %i twentieth to %s, clamped to −1..+1',
    (text, direction, expected) => {
      expect(stepCoefficient(text, direction)).toBe(expected);
    },
  );

  it('refuses to step an invalid coefficient text', () => {
    expect(stepCoefficient('abc', 1)).toBeNull();
    expect(stepCoefficient('1.5', -1)).toBeNull();
  });

  it('gives the same exact seats as the equivalent target percent', () => {
    const plan = basis();
    const byCoefficient = runSupporters(plan, {
      P1: coefficientEntry('0.5')!,
      P2: coefficientEntry('-0.5')!,
    });
    const byTarget = runSupporters(plan, { P1: '80', P2: '30' });
    expect(serializeResult(byCoefficient.result)).toEqual(
      serializeResult(byTarget.result),
    );
    expect(byCoefficient.partyTurnouts[0]).toEqual(rational(4n, 5n));
    expect(byCoefficient.partyTurnouts[1]).toEqual(rational(3n, 10n));
  });

  it('keeps coefficient 0 equal to the base and ±1 as everyone or no one', () => {
    const plan = basis();
    const base = runSupporters(plan, {});
    const zero = runSupporters(plan, { P1: coefficientEntry('0')! });
    expect(serializeResult(zero.result)).toEqual(serializeResult(base.result));
    expect(
      runSupporters(plan, { P1: coefficientEntry('1')! }).partyTurnouts[0],
    ).toEqual(rational(1n));
    expect(
      runSupporters(plan, { P1: coefficientEntry('-1')! }).rawShares[0],
    ).toEqual(rational(0n));
  });

  it('refuses a malformed coefficient entry', () => {
    const plan = basis();
    expect(() =>
      runSupporters(plan, { P1: `${COEFFICIENT_PREFIX}1.5` }),
    ).toThrow(RangeError);
    expect(() => runSupporters(plan, { P1: `${COEFFICIENT_PREFIX}x` })).toThrow(
      RangeError,
    );
  });

  it('allocates exactly seatCount and repeats for generated coefficients', () => {
    const next = createPrng(1717);
    const plan = basis();
    for (let run = 0; run < 40; run += 1) {
      const pick = () =>
        `${randomInt(next, 0, 1) === 0 ? '-' : ''}0.${String(randomInt(next, 0, 99)).padStart(2, '0')}`;
      const targets = {
        P1: coefficientEntry(pick())!,
        P2: coefficientEntry(pick())!,
      };
      const year = randomInt(next, 0, 50);
      const first = runSupporters(plan, targets, year);
      const second = runSupporters(plan, targets, year);
      if (first.result.allocation.noAllocation === null)
        expect(seatSum(first.result)).toBe(plan.source.rules.seatCount);
      expect(serializeResult(second.result)).toEqual(
        serializeResult(first.result),
      );
    }
  });

  it('builds per-party rows: field, two-decimal coefficient, rounded turnouts', () => {
    const plan = basis();
    const rows = supporterRows(plan, {
      P1: coefficientEntry('0.5')!,
      P2: '30',
    });
    expect(rows.map((row) => row.partyId)).toEqual(['P1', 'P2']);
    expect(rows[0]).toMatchObject({
      field: '0.5',
      coefficient: '+0.50',
      turnout: '80.0',
      base: '60.0',
      exact: '80',
    });
    expect(rows[1]).toMatchObject({
      field: '-0.50',
      coefficient: '-0.50',
      turnout: '30.0',
      base: '60.0',
    });
    expect(supporterRows(plan, {})[0]).toMatchObject({
      field: '0.00',
      coefficient: '0.00',
      turnout: '60.0',
    });
  });
});

describe('M7-17 population trend for the prototype chart', () => {
  it('adds the change in percentage points and the population scale to each year', () => {
    const input = workspaceLinked();
    (input.groups as Json[])[0]!.growthRate = '0.1';
    const rows = populationTimeline(scenario(input));
    expect(rows[0]!.delta).toEqual(['0', '0']);
    expect(rows[0]!.scale).toBe('100');
    const first = rows[1]!;
    // G1 grows 10%: 500 → 550 of 1050 people.
    expect(first.scale).toBe('105');
    expect(first.shares[0]).toBe('52.380952380952381');
    expect(first.delta[0]).toBe('2.380952380952381');
    expect(first.delta[1]).toBe('-2.380952380952381');
  });

  it('scales the chart to at least 40% and rounds the top up to the next 10', () => {
    const flat = populationTrend(populationTimeline(scenario()));
    expect(flat.max).toBe(50);
    expect(flat.grid.map((line) => [line.value, line.y])).toEqual([
      [0, '100'],
      [25, '55'],
      [50, '10'],
    ]);
    expect(flat.years.map((tick) => [tick.year, tick.x])).toEqual([
      [0, '27'],
      [10, '103'],
      [20, '179'],
      [30, '255'],
      [40, '331'],
      [50, '407'],
    ]);
    expect(flat.x(7)).toBe('80.2');
    expect(flat.paths[0]!.startsWith('M27,10 L34.6,10')).toBe(true);
    const small = workspaceParties();
    expect(populationTrend(populationTimeline(scenario(small))).max).toBe(40);
  });
});

describe('M7-17 coalition years carry the shortfall and the national vote share', () => {
  it('reports seats missing to the majority and the rounded national share', () => {
    const plan = scenario(workspaceParties());
    const base = runSeats(plan);
    const future = buildCoalitionFuture(plan, base, base, ['P1']);
    // P1 holds 1/5 of the votes: 20 of 101 seats against a majority of 51.
    expect(future.base.seats).toBe(20);
    expect(future.base.missing).toBe(31);
    expect(future.base.voteShare).toBe('20.0');
    const winning = buildCoalitionFuture(plan, base, base, ['P2', 'P3']);
    expect(winning.projected.missing).toBe(0);
    expect(winning.projected.voteShare).toBe('80.0');
  });
});
