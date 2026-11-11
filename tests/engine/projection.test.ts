import { describe, expect, it } from 'vitest';
import {
  div,
  toFractionString,
  type Rational,
} from '../../src/engine/rational';
import { runSeats, serializeResult } from '../../src/engine/run';
import {
  LIMITS,
  serializeScenario,
  parseScenarioJson,
} from '../../src/engine/schema';
import {
  computeVotes,
  groupTurnout,
  type VoteResult,
} from '../../src/engine/votes';
import { createPrng, millionths, randomInt, randomParts } from './helpers/prng';
import {
  buildScenario,
  groupInput,
  partyInput,
  rulesInput,
  scenarioInput,
  section8Input,
  type Json,
} from './helpers/scenarios';

function f(value: Rational | null | undefined): string | null {
  return value === null || value === undefined ? null : toFractionString(value);
}

function partyVotes(result: VoteResult): Record<string, string | null> {
  return Object.fromEntries(
    result.parties.map((party) => [party.partyId, f(party.votes)]),
  );
}

function group(result: VoteResult, id: string) {
  const found = result.groups.find((entry) => entry.groupId === id);
  if (found === undefined) {
    throw new Error(`no group ${id}`);
  }
  return found;
}

/** Section 14.2 fixture: A = 600 at 50% turnout, B = 400 at 100%. */
function twoGroupInput(growthA = '0', turnoutChangeA = '0'): Json {
  return scenarioInput({
    rules: rulesInput({ populationTotal: '1000', seatCount: 10 }),
    parties: [partyInput('X', null, 1), partyInput('Y', null, 2)],
    groups: [
      groupInput(
        'A',
        '0.6',
        { X: '0.8', Y: '0.2' },
        { turnout: '0.5', growthRate: growthA, turnoutChange: turnoutChangeA },
      ),
      groupInput('B', '0.4', { X: '0.2', Y: '0.8' }, { turnout: '1' }),
    ],
  });
}

/** `units` hundredths as a decimal string with a random sign, e.g. '-0.07'. */
function signed(next: () => number, units: number, places: number): string {
  const text = `0.${String(units).padStart(places, '0')}`;
  return units !== 0 && next() < 0.5 ? `-${text}` : text;
}

function oneGroupInput(fields: {
  turnout: string;
  turnoutChange?: string;
  growthRate?: string;
}): Json {
  return scenarioInput({
    rules: rulesInput({ populationTotal: '1000', seatCount: 10 }),
    parties: [partyInput('X', null, 1)],
    groups: [groupInput('A', '1', { X: '1' }, fields)],
  });
}

describe('Section 14.2 acceptance fixtures', () => {
  it('reproduces the base year: X 320, Y 380, turnout 70%', () => {
    const votes = computeVotes(buildScenario(twoGroupInput()));
    expect(partyVotes(votes)).toEqual({ X: '320', Y: '380' });
    expect(f(votes.turnout)).toBe('7/10');
  });

  it('grows group A by 10% in year 1: X 344, Y 386, 1060 voters, 730 ballots', () => {
    const votes = computeVotes(buildScenario(twoGroupInput('0.1')), 1);
    expect(partyVotes(votes)).toEqual({ X: '344', Y: '386' });
    expect(f(votes.totals.population)).toBe('1060');
    expect(f(votes.totals.cast)).toBe('730');
    expect(f(votes.turnout)).toBe('73/106');
    expect(f(group(votes, 'A').population)).toBe('660');
    expect(f(group(votes, 'B').population)).toBe('400');
  });

  it('compounds growth exactly over several years', () => {
    const votes = computeVotes(buildScenario(twoGroupInput('0.1')), 3);
    // 600 · 1.1^3 = 798.6
    expect(f(group(votes, 'A').population)).toBe('3993/5');
  });
});

describe('turnout change', () => {
  it('adds the annual change in percentage points', () => {
    const scenario = buildScenario(
      oneGroupInput({ turnout: '0.7', turnoutChange: '0.01' }),
    );
    expect(f(group(computeVotes(scenario, 1), 'A').cast)).toBe('710');
    expect(f(group(computeVotes(scenario, 5), 'A').cast)).toBe('750');
    expect(f(group(computeVotes(scenario, 20), 'A').cast)).toBe('900');
  });

  it('clamps turnout at 100%', () => {
    const scenario = buildScenario(
      oneGroupInput({ turnout: '0.7', turnoutChange: '0.05' }),
    );
    expect(f(group(computeVotes(scenario, 10), 'A').cast)).toBe('1000');
    expect(f(group(computeVotes(scenario, 10), 'A').abstaining)).toBe('0');
  });

  it('clamps turnout at zero', () => {
    const scenario = buildScenario(
      oneGroupInput({ turnout: '0.7', turnoutChange: '-0.1' }),
    );
    const votes = computeVotes(scenario, 10);
    expect(f(group(votes, 'A').cast)).toBe('0');
    expect(f(group(votes, 'A').population)).toBe('1000');
  });

  it('does not change the population', () => {
    const scenario = buildScenario(
      oneGroupInput({ turnout: '0.5', turnoutChange: '0.02' }),
    );
    expect(f(computeVotes(scenario, 7).totals.population)).toBe('1000');
  });
});

describe('turnout of a year', () => {
  function turnoutOf(
    fields: { turnout: string; turnoutChange?: string },
    year?: number,
  ): string | null {
    const scenario = buildScenario(oneGroupInput(fields));
    const only = scenario.groups[0];
    if (only === undefined) {
      throw new Error('no group');
    }
    return f(
      year === undefined ? groupTurnout(only) : groupTurnout(only, year),
    );
  }

  it('is the stored turnout in year 0 and by default', () => {
    expect(turnoutOf({ turnout: '0.7', turnoutChange: '0.01' })).toBe('7/10');
    expect(turnoutOf({ turnout: '0.7', turnoutChange: '0.01' }, 0)).toBe(
      '7/10',
    );
  });

  it('adds the change once per year', () => {
    expect(turnoutOf({ turnout: '0.7', turnoutChange: '0.01' }, 5)).toBe('3/4');
    expect(turnoutOf({ turnout: '0.7', turnoutChange: '-0.01' }, 5)).toBe(
      '13/20',
    );
  });

  it('clamps to [0, 1] like the votes', () => {
    expect(turnoutOf({ turnout: '0.9', turnoutChange: '0.05' }, 4)).toBe('1');
    expect(turnoutOf({ turnout: '0.1', turnoutChange: '-0.05' }, 3)).toBe('0');
  });

  it('matches the cast share of the computed votes in every year', () => {
    const scenario = buildScenario(
      oneGroupInput({ turnout: '0.63', turnoutChange: '0.017' }),
    );
    const only = scenario.groups[0];
    if (only === undefined) {
      throw new Error('no group');
    }
    for (let year = 0; year <= LIMITS.projectionYears; year += 1) {
      const votes = group(computeVotes(scenario, year), 'A');
      expect(f(groupTurnout(only, year)), `year ${year}`).toBe(
        f(div(votes.cast, votes.population)),
      );
    }
  });

  it.each([-1, 51, 1.5, Number.NaN])('refuses the year %s', (year) => {
    const scenario = buildScenario(oneGroupInput({ turnout: '0.5' }));
    const only = scenario.groups[0];
    if (only === undefined) {
      throw new Error('no group');
    }
    expect(() => groupTurnout(only, year)).toThrow(RangeError);
  });
});

describe('growth', () => {
  it('empties a group at -100% growth from year 1 on', () => {
    const scenario = buildScenario(twoGroupInput('-1'));
    expect(f(group(computeVotes(scenario, 0), 'A').population)).toBe('600');
    expect(f(group(computeVotes(scenario, 1), 'A').population)).toBe('0');
    expect(partyVotes(computeVotes(scenario, 1))).toEqual({
      X: '80',
      Y: '320',
    });
  });

  it('shrinks a group by a negative rate', () => {
    const votes = computeVotes(buildScenario(twoGroupInput('-0.5')), 2);
    expect(f(group(votes, 'A').population)).toBe('150');
  });

  it('keeps preferences: the split of a group stays the same', () => {
    const scenario = buildScenario(twoGroupInput('0.1'));
    const base = group(computeVotes(scenario, 0), 'A').contributions;
    const later = group(computeVotes(scenario, 4), 'A').contributions;
    expect(base.map((entry) => f(entry.votes))).toEqual(['240', '60']);
    // 600 · 1.1^4 · 0.5 = 439.23 ballots, still split 80 : 20.
    expect(later.map((entry) => f(entry.votes))).toEqual([
      '43923/125',
      '43923/500',
    ]);
  });
});

describe('year 0', () => {
  it('is the default year', () => {
    const scenario = buildScenario(twoGroupInput('0.1', '0.02'));
    expect(serializeResult(runSeats(scenario))).toBe(
      serializeResult(runSeats(scenario, 0)),
    );
  });

  it('ignores growth and turnout change', () => {
    const changing = buildScenario(twoGroupInput('0.3', '-0.04'));
    const still = buildScenario(twoGroupInput());
    expect(serializeResult(runSeats(changing, 0))).toBe(
      serializeResult(runSeats(still, 0)),
    );
  });

  it.each(['1', '0.5', '0.37', '0'])(
    'keeps the Section 8 result at Group 3 turnout %s',
    (turnout) => {
      const scenario = buildScenario(section8Input(turnout));
      expect(serializeResult(runSeats(scenario, 0))).toBe(
        serializeResult(runSeats(scenario)),
      );
    },
  );
});

describe('year bounds', () => {
  it('allows years 0 to 50', () => {
    expect(LIMITS.projectionYears).toBe(50);
    const scenario = buildScenario(twoGroupInput('0.02'));
    expect(() => computeVotes(scenario, 50)).not.toThrow();
  });

  it.each([-1, 51, 1.5, Number.NaN, Number.POSITIVE_INFINITY])(
    'refuses year %s',
    (year) => {
      const scenario = buildScenario(twoGroupInput());
      expect(() => computeVotes(scenario, year)).toThrow(RangeError);
      expect(() => runSeats(scenario, year)).toThrow(RangeError);
    },
  );
});

describe('future seats', () => {
  it('sums every year-k allocation exactly to the seat count', () => {
    const next = createPrng(2030);
    for (let trial = 0; trial < 60; trial += 1) {
      const partyCount = randomInt(next, 1, 6);
      const groupCount = randomInt(next, 1, 5);
      const seatCount = randomInt(next, 1, 151);
      const parties = Array.from({ length: partyCount }, (_, index) =>
        partyInput(`P${index + 1}`, null, randomInt(next, 1, 3)),
      );
      const shares = randomParts(next, groupCount, 1_000_000);
      const groups = shares.map((share, index) => {
        const weights = randomParts(next, partyCount, 1_000_000);
        return groupInput(
          `G${index + 1}`,
          millionths(share),
          Object.fromEntries(
            weights.map((weight, p) => [`P${p + 1}`, millionths(weight)]),
          ),
          {
            turnout: millionths(randomInt(next, 0, 1_000_000)),
            growthRate: signed(next, randomInt(next, 0, 99), 2),
            turnoutChange: signed(next, randomInt(next, 0, 9), 2),
          },
        );
      });
      const scenario = buildScenario(
        scenarioInput({
          rules: rulesInput({ seatCount, threshold: '0.02' }),
          parties,
          groups,
        }),
      );
      const year = randomInt(next, 0, 20);
      const { allocation } = runSeats(scenario, year);
      if (allocation.noAllocation === null) {
        const total = allocation.parties.reduce(
          (sum, party) => sum + party.seats,
          0,
        );
        expect(total).toBe(seatCount);
      }
    }
  });

  it('is identical across runs and after a version 2 file round trip', () => {
    const scenario = buildScenario(twoGroupInput('0.1', '0.01'));
    const imported = parseScenarioJson(serializeScenario(scenario));
    if (!imported.ok) {
      throw new Error('round trip failed');
    }
    if (imported.scenario.inputMode !== 'groups') {
      throw new Error('expected a group-mode round trip');
    }
    const first = serializeResult(runSeats(scenario, 6));
    expect(serializeResult(runSeats(scenario, 6))).toBe(first);
    expect(serializeResult(runSeats(imported.scenario, 6))).toBe(first);
  });
});
