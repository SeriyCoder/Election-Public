import votesSource from '../../src/engine/votes.ts?raw';
import { describe, expect, it } from 'vitest';
import {
  add,
  parseDecimal,
  sum,
  toFractionString,
  type Rational,
} from '../../src/engine/rational';
import { computeVotes, type VoteResult } from '../../src/engine/votes';
import {
  buildScenario,
  groupInput,
  partyInput,
  rulesInput,
  scenarioInput,
  section8Input,
  section8Scenario,
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

function shares(result: VoteResult): Record<string, string | null> {
  return Object.fromEntries(
    result.parties.map((party) => [party.partyId, f(party.voteShare)]),
  );
}

function breakdownInput(): Json {
  return scenarioInput({
    blocks: [
      { id: 'B1', name: 'Block 1', color: '#111111' },
      { id: 'B2', name: 'Block 2', color: '#222222' },
      { id: 'B4', name: 'Block 4', color: '#444444' },
    ],
    parties: [
      partyInput('P1', 'B1', 1),
      partyInput('P2', 'B2', 2),
      partyInput('P4', 'B4', 3),
      partyInput('P5', null, 4),
    ],
    groups: [
      groupInput(
        'Open',
        '0.4',
        { P1: '0.6', P2: '0.3', P4: '0.1' },
        {
          turnout: '0.75',
          validBallotRate: '0.9',
          participationFactor: '0.5',
        },
      ),
      groupInput(
        'Closed',
        '0.6',
        { P5: '1' },
        { votingMode: 'restricted', turnout: '0.5' },
      ),
    ],
  });
}

describe('group ballot breakdown', () => {
  const run = (): VoteResult => computeVotes(buildScenario(breakdownInput()));

  it('applies the Section 6.1 formulas exactly', () => {
    const open = run().groups[0];
    expect(open?.groupId).toBe('Open');
    expect(f(open?.population)).toBe('400000');
    expect(f(open?.available)).toBe('200000');
    expect(f(open?.unavailable)).toBe('200000');
    expect(f(open?.cast)).toBe('150000');
    expect(f(open?.abstaining)).toBe('50000');
    expect(f(open?.valid)).toBe('135000');
    expect(f(open?.invalid)).toBe('15000');
  });

  it('splits every group population exactly into its four outcomes', () => {
    const result = run();
    for (const group of result.groups) {
      const parts = sum([
        group.unavailable,
        group.abstaining,
        group.invalid,
        group.valid,
      ]);
      expect(f(parts)).toBe(f(group.population));
      expect(f(add(group.available, group.unavailable))).toBe(
        f(group.population),
      );
    }
  });

  it('sends exactly 60/30/10 of the valid votes to the selected parties', () => {
    const open = run().groups[0];
    expect(open?.contributions.map((entry) => entry.partyId)).toEqual([
      'P1',
      'P2',
      'P4',
    ]);
    expect(open?.contributions.map((entry) => f(entry.votes))).toEqual([
      '81000',
      '40500',
      '13500',
    ]);
  });

  it('reports totals over all groups', () => {
    const result = run();
    expect(f(result.totals.population)).toBe('1000000');
    expect(f(result.totals.available)).toBe('800000');
    expect(f(result.totals.unavailable)).toBe('200000');
    expect(f(result.totals.cast)).toBe('450000');
    expect(f(result.totals.abstaining)).toBe('350000');
    expect(f(result.totals.valid)).toBe('435000');
    expect(f(result.totals.invalid)).toBe('15000');
  });

  it('measures overall turnout against the full electorate', () => {
    const result = run();
    expect(f(result.turnout)).toBe('9/20');
  });
});

describe('party votes', () => {
  it('lists every party in persisted order with exact votes', () => {
    const result = computeVotes(buildScenario(breakdownInput()));
    expect(result.parties.map((party) => party.partyId)).toEqual([
      'P1',
      'P2',
      'P4',
      'P5',
    ]);
    expect(partyVotes(result)).toEqual({
      P1: '81000',
      P2: '40500',
      P4: '13500',
      P5: '300000',
    });
    expect(f(result.allValidVotes)).toBe('435000');
    expect(shares(result)).toEqual({
      P1: '27/145',
      P2: '27/290',
      P4: '9/290',
      P5: '20/29',
    });
  });

  it('gives zero votes to a party no group selects', () => {
    const input = breakdownInput();
    (input.parties as Json[]).push(partyInput('P9', null, 9));
    const result = computeVotes(buildScenario(input));
    expect(partyVotes(result).P9).toBe('0');
    expect(f(result.parties[4]?.voteShare)).toBe('0');
  });

  it('gives zero votes to an allowed party without a weight', () => {
    const input = breakdownInput();
    const open = (input.groups as Json[])[0] as Json;
    open.allowedPartyIds = ['P1', 'P2', 'P4', 'P5'];
    const result = computeVotes(buildScenario(input));
    const contributions = result.groups[0]?.contributions ?? [];
    expect(contributions.map((entry) => entry.partyId)).toEqual([
      'P1',
      'P2',
      'P4',
      'P5',
    ]);
    expect(f(contributions[3]?.votes)).toBe('0');
  });

  it('lets an open group split between opposing blocks', () => {
    const result = computeVotes(buildScenario(breakdownInput()));
    const open = result.groups[0]?.contributions ?? [];
    expect(open.filter((entry) => f(entry.votes) !== '0')).toHaveLength(3);
  });

  it('keeps a restricted group inside its allowed parties', () => {
    const result = computeVotes(buildScenario(breakdownInput()));
    const closed = result.groups[1]?.contributions ?? [];
    expect(closed.map((entry) => entry.partyId)).toEqual(['P5']);
    expect(f(closed[0]?.votes)).toBe(f(result.groups[1]?.valid));
  });
});

describe('editing preferences', () => {
  it('does not change turnout or total valid votes', () => {
    const before = computeVotes(buildScenario(breakdownInput()));
    const input = breakdownInput();
    ((input.groups as Json[])[0] as Json).voteWeights = {
      P1: '0.1',
      P2: '0.2',
      P4: '0.7',
    };
    const after = computeVotes(buildScenario(input));
    expect(f(after.turnout)).toBe(f(before.turnout));
    expect(f(after.totals.cast)).toBe(f(before.totals.cast));
    expect(f(after.totals.valid)).toBe(f(before.totals.valid));
    expect(f(after.allValidVotes)).toBe(f(before.allValidVotes));
    expect(f(after.groups[0]?.valid)).toBe(f(before.groups[0]?.valid));
    expect(partyVotes(after).P4).toBe('94500');
  });
});

describe('Section 8 presets', () => {
  it('reproduces the baseline vote shares exactly', () => {
    const result = computeVotes(section8Scenario());
    expect(shares(result)).toEqual({
      P1: '19/50',
      P2: '21/50',
      P3: '3/20',
      P4: '1/20',
    });
  });

  it('gives Group 3 exactly 3/37 of valid votes at 50% turnout', () => {
    const result = computeVotes(section8Scenario('0.5'));
    expect(f(result.parties[2]?.voteShare)).toBe('3/37');
  });

  it('gives Group 3 no votes at zero turnout and rescales the others', () => {
    const result = computeVotes(section8Scenario('0'));
    expect(shares(result)).toEqual({
      P1: '38/85',
      P2: '42/85',
      P3: '0',
      P4: '1/17',
    });
    expect(f(result.turnout)).toBe('17/20');
  });

  it('separates disabled participation from zero turnout', () => {
    const input = section8Input();
    const group3 = (input.groups as Json[])[2] as Json;
    group3.participationFactor = '0';
    const result = computeVotes(buildScenario(input));
    const g3 = result.groups[2];
    expect(f(g3?.unavailable)).toBe('150000');
    expect(f(g3?.abstaining)).toBe('0');
    expect(f(result.totals.population)).toBe('1000000');
    expect(f(result.turnout)).toBe('17/20');

    const zeroTurnout = computeVotes(section8Scenario('0')).groups[2];
    expect(f(zeroTurnout?.unavailable)).toBe('0');
    expect(f(zeroTurnout?.abstaining)).toBe('150000');
  });
});

describe('degenerate inputs', () => {
  it('reports no vote shares when nobody votes', () => {
    const input = section8Input();
    for (const group of input.groups as Json[]) {
      group.turnout = '0';
    }
    const result = computeVotes(buildScenario(input));
    expect(f(result.allValidVotes)).toBe('0');
    expect(f(result.turnout)).toBe('0');
    expect(result.parties.every((party) => party.voteShare === null)).toBe(
      true,
    );
  });

  it('keeps all ballots invalid when the valid-ballot rate is zero', () => {
    const input = section8Input();
    for (const group of input.groups as Json[]) {
      group.validBallotRate = '0';
    }
    const result = computeVotes(buildScenario(input));
    expect(f(result.totals.invalid)).toBe('1000000');
    expect(f(result.allValidVotes)).toBe('0');
  });

  it('scales with the population total without changing shares', () => {
    const small = section8Input();
    small.rules = rulesInput({ populationTotal: '1000' });
    const a = computeVotes(buildScenario(small));
    const b = computeVotes(section8Scenario());
    expect(f(a.totals.population)).toBe('1000');
    expect(shares(a)).toEqual(shares(b));
  });

  it('handles a fractional population total exactly', () => {
    const input = section8Input();
    input.rules = rulesInput({ populationTotal: '0.3' });
    const result = computeVotes(buildScenario(input));
    expect(f(result.groups[0]?.population)).toBe('57/500');
  });

  it('does not normalize shares within the tolerance', () => {
    const input = section8Input();
    ((input.groups as Json[])[3] as Json).populationShare = '0.049999999';
    const result = computeVotes(buildScenario(input));
    const expected = parseDecimal('999999.999');
    expect(f(result.totals.population)).toBe(f(expected));
    expect(f(result.allValidVotes)).toBe(f(expected));
  });

  it('reports all valid votes as the sum of party votes', () => {
    const input = breakdownInput();
    ((input.groups as Json[])[0] as Json).voteWeights = {
      P1: '0.6',
      P2: '0.3',
      P4: '0.099999999',
    };
    const result = computeVotes(buildScenario(input));
    expect(f(result.allValidVotes)).toBe(
      f(sum(result.parties.map((party) => party.votes))),
    );
    expect(f(result.allValidVotes)).not.toBe(f(result.totals.valid));
  });
});

describe('determinism', () => {
  it('returns identical fraction text on repeated runs', () => {
    const render = (): string =>
      JSON.stringify(computeVotes(section8Scenario('0.5')), (_key, value) =>
        typeof value === 'bigint' ? value.toString() : (value as unknown),
      );
    expect(render()).toBe(render());
  });

  it('does not use floating point or locale APIs', () => {
    for (const token of [
      'parseFloat',
      'Number(',
      'Math.',
      'toFixed',
      'toLocaleString',
      'localeCompare',
    ]) {
      expect(votesSource).not.toContain(token);
    }
  });
});
