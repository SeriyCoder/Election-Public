import thresholdSource from '../../src/engine/threshold.ts?raw';
import { describe, expect, it } from 'vitest';
import { toFractionString, type Rational } from '../../src/engine/rational';
import {
  applyThreshold,
  type ThresholdResult,
} from '../../src/engine/threshold';
import { computeVotes } from '../../src/engine/votes';
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

function run(input: Json): ThresholdResult {
  const scenario = buildScenario(input);
  return applyThreshold(scenario, computeVotes(scenario));
}

function statuses(result: ThresholdResult): Record<string, string> {
  return Object.fromEntries(
    result.parties.map((party) => [party.partyId, party.status]),
  );
}

function allocationShares(
  result: ThresholdResult,
): Record<string, string | null> {
  return Object.fromEntries(
    result.parties.map((party) => [party.partyId, f(party.allocationShare)]),
  );
}

function singleGroup(
  weights: Record<string, string>,
  threshold: string,
  options: { turnout?: string; extraParties?: Json[] } = {},
): Json {
  const ids = Object.keys(weights);
  return scenarioInput({
    rules: rulesInput({ threshold }),
    blocks: [
      { id: 'B1', name: 'Block 1', color: '#111111' },
      { id: 'B2', name: 'Block 2', color: '#222222' },
    ],
    parties: [
      ...ids.map((id, index) => partyInput(id, index < 2 ? 'B1' : 'B2', index)),
      ...(options.extraParties ?? []),
    ],
    groups: [
      groupInput('G', '1', weights, {
        turnout: options.turnout ?? '1',
      }),
    ],
  });
}

describe('threshold boundary', () => {
  it('qualifies a party exactly at the threshold', () => {
    const result = run(singleGroup({ P1: '0.0325', P2: '0.9675' }, '0.0325'));
    expect(statuses(result)).toEqual({ P1: 'qualified', P2: 'qualified' });
  });

  it('rejects a party just below the threshold', () => {
    const result = run(
      singleGroup(
        { P1: '0.032499999999999999', P2: '0.967500000000000001' },
        '0.0325',
      ),
    );
    expect(statuses(result)).toEqual({
      P1: 'below-threshold',
      P2: 'qualified',
    });
  });

  it('qualifies a party just above the threshold', () => {
    const result = run(
      singleGroup(
        { P1: '0.032500000000000001', P2: '0.967499999999999999' },
        '0.0325',
      ),
    );
    expect(statuses(result).P1).toBe('qualified');
  });

  it('reports the parsed threshold exactly', () => {
    const result = run(singleGroup({ P1: '1' }, '0.0325'));
    expect(f(result.threshold)).toBe('13/400');
  });
});

describe('qualification totals', () => {
  const blockInput = (): Json =>
    singleGroup({ P1: '0.5', P2: '0.46', P3: '0.02', P4: '0.02' }, '0.0325');

  it('never lets a block total rescue its members', () => {
    expect(statuses(run(blockInput()))).toEqual({
      P1: 'qualified',
      P2: 'qualified',
      P3: 'below-threshold',
      P4: 'below-threshold',
    });
  });

  it('keeps below-threshold votes out of the qualifying denominator', () => {
    const result = run(blockInput());
    expect(f(result.qualifyingVotes)).toBe('960000');
    expect(f(result.belowThresholdVotes)).toBe('40000');
  });

  it('computes allocation shares over qualifying votes only', () => {
    expect(allocationShares(run(blockInput()))).toEqual({
      P1: '25/48',
      P2: '23/48',
      P3: '0',
      P4: '0',
    });
  });

  it('keeps persisted party order', () => {
    const result = run(blockInput());
    expect(result.parties.map((party) => party.partyId)).toEqual([
      'P1',
      'P2',
      'P3',
      'P4',
    ]);
    expect(f(result.parties[2]?.votes)).toBe('20000');
  });

  it('reports an allocation when at least one party qualifies', () => {
    expect(run(blockInput()).noAllocation).toBeNull();
  });
});

describe('zero-vote parties', () => {
  it('marks a zero-vote party as no votes even at a zero threshold', () => {
    const result = run(
      singleGroup({ P1: '1' }, '0', {
        extraParties: [partyInput('P9', null, 9)],
      }),
    );
    expect(statuses(result)).toEqual({ P1: 'qualified', P9: 'no-votes' });
    expect(allocationShares(result)).toEqual({ P1: '1', P9: '0' });
  });

  it('marks a zero-weight destination as no votes', () => {
    const result = run(singleGroup({ P1: '1', P2: '0' }, '0'));
    expect(statuses(result).P2).toBe('no-votes');
  });

  it('distinguishes zero turnout from threshold failure', () => {
    const zeroTurnout = run(section8Input('0'));
    expect(statuses(zeroTurnout).P3).toBe('no-votes');

    const failing = section8Input();
    failing.rules = rulesInput({ threshold: '0.2' });
    expect(statuses(run(failing)).P3).toBe('below-threshold');
  });

  it('qualifies every voting party at a zero threshold', () => {
    const result = run(section8Input());
    expect(Object.values(statuses(result))).toEqual([
      'qualified',
      'qualified',
      'qualified',
      'qualified',
    ]);
    expect(f(result.belowThresholdVotes)).toBe('0');
  });
});

describe('no-allocation states', () => {
  it('reports no valid votes when turnout is zero everywhere', () => {
    const result = run(
      singleGroup({ P1: '0.5', P2: '0.5' }, '0', { turnout: '0' }),
    );
    expect(result.noAllocation).toBe('no-valid-votes');
    expect(f(result.qualifyingVotes)).toBe('0');
    expect(Object.values(statuses(result))).toEqual(['no-votes', 'no-votes']);
    expect(Object.values(allocationShares(result))).toEqual([null, null]);
  });

  it('reports that no party qualifies when all are below threshold', () => {
    const result = run(singleGroup({ P1: '0.5', P2: '0.5' }, '0.6'));
    expect(result.noAllocation).toBe('no-party-qualifies');
    expect(f(result.qualifyingVotes)).toBe('0');
    expect(f(result.belowThresholdVotes)).toBe('1000000');
    expect(Object.values(allocationShares(result))).toEqual([null, null]);
  });

  it('qualifies a party holding every vote at a threshold of one', () => {
    const result = run(singleGroup({ P1: '1', P2: '0' }, '1'));
    expect(statuses(result)).toEqual({ P1: 'qualified', P2: 'no-votes' });
    expect(result.noAllocation).toBeNull();
  });
});

describe('determinism', () => {
  it('returns identical output on repeated runs', () => {
    const render = (): string =>
      JSON.stringify(run(section8Input('0.5')), (_key, value) =>
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
      expect(thresholdSource).not.toContain(token);
    }
  });
});
