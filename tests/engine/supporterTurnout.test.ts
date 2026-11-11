import { describe, expect, it } from 'vitest';
import {
  freezeSupporters,
  runSupporters,
  type SupporterBasis,
} from '../../src/engine/supporterTurnout';
import {
  rational,
  sum,
  toFractionString,
  pow,
  mul,
} from '../../src/engine/rational';
import { runSeats, serializeResult } from '../../src/engine/run';
import {
  LIMITS,
  validateScenario,
  type Scenario,
} from '../../src/engine/schema';
import { LOCALES, translator } from '../../src/i18n';
import { workspaceLinked } from './helpers/workspace';
import { section8Input, type Json } from './helpers/scenarios';

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
describe('M7-12 frozen party/group supporter experiment', () => {
  it('explicitly extends the projection horizon to fifty without changing legacy rates', () => {
    expect(LIMITS.projectionYears).toBe(50);
    const legacy = scenario(section8Input('0.5'));
    const projected = runSeats(legacy, 50);
    if ('kind' in projected) throw new Error(projected.reason);
    expect(projected.allocation).toEqual(runSeats(legacy).allocation);
    expect(() => runSeats(legacy, 51)).toThrow(RangeError);
  });
  it('freezes cohorts and only moves the requested raw party share before alignment', () => {
    const plan = basis();
    const before = JSON.stringify(plan.source);
    const result = runSupporters(plan, { P1: '100' });
    expect(result.rawShares[1]).toEqual(rational(1n, 2n));
    expect(toFractionString(result.rawShares[0]!)).toBe('5/6');
    expect(result.partyTurnouts[0]).toEqual(rational(1n));
    expect(JSON.stringify(plan.source)).toBe(before);
    expect(runSupporters(plan, { P1: '0' }).rawShares[0]).toEqual(rational(0n));
  });
  it('returns explicit unknown reasons and never invents cohort populations', () => {
    expect(freezeSupporters(scenario(workspaceLinked(false)))).toMatchObject({
      kind: 'unavailable',
      reason: 'unknown-party-composition',
    });
  });
  it('agrees exactly with existing engine votes and allocations for every old horizon year', () => {
    const input = workspaceLinked();
    (input.groups as Json[])[0]!.growthRate = '0.025';
    const plan = basis(input);
    for (let year = 0; year <= 20; year += 1) {
      const actual = runSupporters(plan, {}, year);
      const expected = runSeats(plan.source, year);
      if ('kind' in expected) throw new Error(expected.reason);
      expect(actual.result.votes.parties).toEqual(expected.votes.parties);
      expect(actual.result.allocation).toEqual(expected.allocation);
    }
  });
  it('compounds year fifty independently and retains cohort rather than party-average turnouts', () => {
    const input = workspaceLinked();
    (input.groups as Json[])[0]!.growthRate = '0.1';
    const plan = basis(input);
    const now = runSupporters(plan, { P1: '80' });
    const future = runSupporters(plan, { P1: '80' }, 50);
    const initialPopulation = sum(plan.cohorts.map((row) => row[0]!));
    expect(future.populations[0]).toEqual(
      mul(initialPopulation, pow(rational(11n, 10n), 50)),
    );
    expect(future.groupTurnouts).toEqual(now.groupTurnouts);
    expect(
      future.result.allocation.parties.reduce((n, party) => n + party.seats, 0),
    ).toBe(101);
  });
  it.each(LOCALES)('is deterministic after JSON round trip in %s', (locale) => {
    translator(locale);
    const original = workspaceLinked();
    const plan = basis(original);
    const expected = serializeResult(
      runSupporters(plan, { P1: '75' }, 17).result,
    );
    expect(serializeResult(runSupporters(plan, { P1: '75' }, 17).result)).toBe(
      expected,
    );
    expect(
      serializeResult(
        runSupporters(
          basis(JSON.parse(JSON.stringify(original))),
          { P1: '75' },
          17,
        ).result,
      ),
    ).toBe(expected);
  });
  it.each(['49.9999', '50', '50.0001'])(
    'uses exact threshold boundaries at %s percent',
    (target) => {
      const input = workspaceLinked();
      (input.rules as Json).threshold = '0.5';
      const result = runSupporters(basis(input), { P1: target, P2: '50' });
      const party = result.result.threshold.parties.find(
        (row) => row.partyId === 'P1',
      )!;
      expect(party.status === 'qualified').toBe(target !== '49.9999');
    },
  );
  it('uses persisted tie order then ID and allocates every odd seat', () => {
    const input = workspaceLinked();
    (input.parties as Json[])[0]!.tieBreakOrder = 20;
    (input.parties as Json[])[1]!.tieBreakOrder = 10;
    expect(
      runSupporters(basis(input), {}).result.allocation.parties.map(
        (row) => row.seats,
      ),
    ).toEqual([50, 51]);
    (input.parties as Json[])[0]!.tieBreakOrder = 10;
    expect(
      runSupporters(basis(input), {}).result.allocation.parties.map(
        (row) => row.seats,
      ),
    ).toEqual([51, 50]);
  });
  it('preserves exact seat sums across generated targets and every projection year', () => {
    const plan = basis();
    for (let n = 1; n <= 80; n += 1) {
      const result = runSupporters(
        plan,
        { P1: `${n}`, P2: `${100 - n}` },
        n % 51,
      ).result;
      expect(
        result.allocation.parties.every(
          (row) => Number.isInteger(row.seats) && row.seats >= 0,
        ),
      ).toBe(true);
      expect(
        result.allocation.parties.reduce((total, row) => total + row.seats, 0),
      ).toBe(plan.source.rules.seatCount);
    }
  });
  it('retains all competing parties and distinguishes no allocation from zero coalition seats', () => {
    const plan = basis();
    const result = runSupporters(plan, { P1: '0' });
    expect(
      result.result.allocation.parties.find((row) => row.partyId === 'P2')
        ?.seats,
    ).toBe(101);
    expect(
      runSupporters(plan, { P1: '0', P2: '0' }).result.allocation.noAllocation,
    ).not.toBeNull();
  });
});
