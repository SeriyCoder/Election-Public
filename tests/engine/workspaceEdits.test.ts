import { describe, expect, it } from 'vitest';
import { editCompositionShare } from '../../src/engine/compositionEdit';
import type { Draft } from '../../src/engine/edit';
import {
  buildLinkedBasis,
  editLinkedGroupTurnout,
  editLinkedPartyShare,
  editOverallTurnoutWithAvailableBasis,
  editPartyShareWithAvailableBasis,
  type LinkedEditResult,
} from '../../src/engine/linkedTurnout';
import { runScenario, runSeats, serializeResult } from '../../src/engine/run';
import {
  parseScenarioJson,
  serializeScenario,
  validateScenario,
  type PartyScenario,
} from '../../src/engine/schema';
import { LOCALES, translator } from '../../src/i18n';
import { createPrng, randomInt, randomParts } from './helpers/prng';
import { partyModeInput, section8Input, type Json } from './helpers/scenarios';
import { workspaceLinked, workspaceParties } from './helpers/workspace';

const fraction = (numerator: string, denominator: string) => ({
  numerator,
  denominator,
});

function success(result: LinkedEditResult): Draft {
  if (!result.ok) throw new Error(`Unexpected refusal: ${result.reason}`);
  return result.draft;
}

function partyScenario(input: unknown): PartyScenario {
  const checked = validateScenario(input);
  if (!checked.ok || checked.scenario.inputMode !== 'parties') {
    throw new Error('Expected a valid party scenario');
  }
  return checked.scenario;
}

function seats(input: unknown): number[] {
  return runSeats(partyScenario(input)).allocation.parties.map(
    (party) => party.seats,
  );
}

describe('coalition workspace exact edits', () => {
  it('checks the linked fixture independently against existing exact edits', () => {
    const linked = success(buildLinkedBasis(workspaceLinked()));
    const changed = success(editLinkedPartyShare(linked, 'P1', '60', []));
    expect(partyScenario(changed).parties[0]!.composition).toEqual({
      G1: fraction('7', '10'),
      G2: fraction('3', '10'),
    });
    const turnout = success(editLinkedGroupTurnout(changed, 'G1', '80'));
    expect(partyScenario(turnout).parties[0]!.voteShare).toEqual(
      fraction('111', '175'),
    );
    expect(seats(turnout)).toEqual([64, 37]);
  });

  it('creates a consistent basis atomically with a direct share edit', () => {
    const input = workspaceLinked();
    const before = JSON.stringify(input);
    const changed = success(
      editPartyShareWithAvailableBasis(input, 'P1', '60', []),
    );
    const scenario = partyScenario(changed);

    expect(JSON.stringify(input)).toBe(before);
    expect(changed.extraDraftData).toEqual({ retained: 'yes' });
    expect(changed.parties[0]!.extraPartyData).toBe('keep');
    expect(scenario.parties.map((party) => party.voteShare)).toEqual([
      fraction('3', '5'),
      fraction('2', '5'),
    ]);
    expect(scenario.parties[0]!.composition).toEqual({
      G1: fraction('7', '10'),
      G2: fraction('3', '10'),
    });
    expect(scenario.linkedModel?.state).toBe('current');
    expect(scenario.linkedModel?.groups.G1?.populationShare).toEqual(
      fraction('1', '2'),
    );
    expect(scenario.linkedModel?.groups.G2?.populationShare).toEqual(
      fraction('1', '2'),
    );
    expect(seats(changed)).toEqual([61, 40]);

    const turnout = success(editLinkedGroupTurnout(changed, 'G1', '80'));
    expect(partyScenario(turnout).parties[0]!.voteShare).toEqual(
      fraction('111', '175'),
    );
    expect(seats(turnout)).toEqual([64, 37]);
  });

  it('scales a newly available basis on overall turnout without changing seats', () => {
    const input = workspaceLinked();
    const changed = success(editOverallTurnoutWithAvailableBasis(input, '50'));
    const scenario = partyScenario(changed);
    expect(scenario.linkedModel?.state).toBe('current');
    expect(scenario.rules.overallTurnout).toEqual(fraction('1', '2'));
    expect(scenario.groups.map((group) => group.turnout)).toEqual([
      fraction('1', '2'),
      fraction('1', '2'),
    ]);
    expect(scenario.parties.map((party) => party.voteShare)).toEqual([
      fraction('1', '2'),
      fraction('1', '2'),
    ]);
    expect(seats(changed)).toEqual([51, 50]);

    const zero = success(editOverallTurnoutWithAvailableBasis(changed, '0'));
    expect(runSeats(partyScenario(zero)).allocation.noAllocation).toBe(
      'no-valid-votes',
    );
    const restored = success(editOverallTurnoutWithAvailableBasis(zero, '60'));
    expect(
      partyScenario(restored).groups.map((group) => group.turnout),
    ).toEqual([fraction('3', '5'), fraction('3', '5')]);
    expect(seats(restored)).toEqual([51, 50]);
  });

  it('keeps party and overall-turnout edits available without known compositions', () => {
    const input = workspaceLinked(false);
    const changed = success(
      editPartyShareWithAvailableBasis(input, 'P1', '40', []),
    );
    expect(partyScenario(changed).linkedModel).toBeUndefined();
    expect(
      partyScenario(changed).parties.map((party) => party.voteShare),
    ).toEqual([fraction('2', '5'), fraction('3', '5')]);
    const turnout = success(
      editOverallTurnoutWithAvailableBasis(changed, '50'),
    );
    expect(partyScenario(turnout).linkedModel).toBeUndefined();
    expect(seats(turnout)).toEqual(seats(changed));
  });

  it('honors locks and keeps exact extension fields on the original draft', () => {
    const input = workspaceParties();
    const changed = success(
      editPartyShareWithAvailableBasis(input, 'P1', '40', ['P2']),
    );
    expect(
      partyScenario(changed).parties.map((party) => party.voteShare),
    ).toEqual([fraction('2', '5'), fraction('3', '10'), fraction('3', '10')]);
    expect(changed.extraDraftData).toEqual({ retained: 'yes' });
    expect(changed.parties[0]!.extraPartyData).toBe('keep');
    expect(seats(changed)).toEqual([41, 30, 30]);
  });

  it('refuses a locked change without creating or mutating a basis', () => {
    const input = workspaceLinked();
    const before = JSON.stringify(input);
    const result = editPartyShareWithAvailableBasis(input, 'P1', '60', ['P2']);
    expect(result).toMatchObject({
      ok: false,
      reason: 'locked-total-exceeded',
    });
    expect(JSON.stringify(input)).toBe(before);
    expect(partyScenario(input).linkedModel).toBeUndefined();
  });

  it('preserves destination restrictions and refuses impossible group transfers', () => {
    const input = workspaceLinked();
    const parties = input.parties as Json[];
    parties[0]!.composition = {
      G1: fraction('1', '1'),
      G2: fraction('0', '1'),
    };
    parties[1]!.composition = {
      G1: fraction('0', '1'),
      G2: fraction('1', '1'),
    };
    const linked = success(buildLinkedBasis(input));
    const model = linked.linkedModel as Json;
    const groups = model.groups as Json;
    (groups.G1 as Json).allowedPartyIds = ['P1'];
    (groups.G2 as Json).allowedPartyIds = ['P2'];
    const before = JSON.stringify(linked);
    const result = editPartyShareWithAvailableBasis(linked, 'P1', '60', []);
    expect(result).toMatchObject({ ok: false, reason: 'forbidden-transfer' });
    expect(JSON.stringify(linked)).toBe(before);
  });

  it('refuses an overall turnout that would push a group over 100 percent', () => {
    const linked = success(
      editLinkedGroupTurnout(workspaceLinked(), 'G1', '90'),
    );
    const before = JSON.stringify(linked);
    expect(editOverallTurnoutWithAvailableBasis(linked, '90')).toMatchObject({
      ok: false,
      reason: 'turnout-overflow',
    });
    expect(JSON.stringify(linked)).toBe(before);
  });

  it('preserves a single party at 100 percent and refuses an impossible decrease', () => {
    const input = partyModeInput([['1', '1']], { threshold: '0' });
    const same = success(
      editPartyShareWithAvailableBasis(input, 'P1', '100', []),
    );
    expect(partyScenario(same).parties[0]!.voteShare).toEqual(
      fraction('1', '1'),
    );
    expect(
      editPartyShareWithAvailableBasis(input, 'P1', '99', []),
    ).toMatchObject({
      ok: false,
      reason: 'no-unlocked-recipient',
    });
  });

  it('does not silently rebuild suspended assumptions during a party edit', () => {
    const linked = success(buildLinkedBasis(workspaceLinked()));
    const changedComposition = editCompositionShare(linked, 'P1', 'G1', '70');
    if (!changedComposition.ok) {
      throw new Error(
        `Unexpected composition refusal: ${changedComposition.reason}`,
      );
    }
    const suspended = changedComposition.draft;
    expect(partyScenario(suspended).linkedModel?.state).toBe('suspended');
    const basis = structuredClone(partyScenario(suspended).linkedModel);
    const changed = success(
      editPartyShareWithAvailableBasis(suspended, 'P1', '40', []),
    );
    expect(partyScenario(changed).linkedModel).toEqual(basis);
    expect(partyScenario(changed).parties[0]!.voteShare).toEqual(
      fraction('2', '5'),
    );
  });

  it('rejects party edits on legacy group-mode inputs without changing them', () => {
    const input = section8Input();
    const before = JSON.stringify(input);
    expect(
      editPartyShareWithAvailableBasis(input, 'P1', '40', []),
    ).toMatchObject({ ok: false, reason: 'party-mode-required' });
    expect(editOverallTurnoutWithAvailableBasis(input, '50')).toMatchObject({
      ok: false,
      reason: 'party-mode-required',
    });
    expect(JSON.stringify(input)).toBe(before);
  });

  it('refuses invalid or empty input explicitly without mutating it', () => {
    const empty = partyModeInput([]);
    const before = JSON.stringify(empty);
    expect(
      editPartyShareWithAvailableBasis(empty, 'P1', '50', []),
    ).toMatchObject({
      ok: false,
      reason: 'invalid-scenario',
    });
    expect(editOverallTurnoutWithAvailableBasis(empty, '50')).toMatchObject({
      ok: false,
      reason: 'invalid-scenario',
    });
    expect(JSON.stringify(empty)).toBe(before);
  });

  it.each([
    ['9.9999', 'below-threshold'],
    ['10', 'qualified'],
    ['10.0001', 'qualified'],
  ] as const)(
    'classifies an exact %s percent edit at the 10 percent barrier',
    (text, status) => {
      const input = partyModeInput(
        [
          ['1', '10'],
          ['9', '10'],
        ],
        { threshold: '0.1', seatCount: 101 },
      );
      const changed = success(
        editPartyShareWithAvailableBasis(input, 'P1', text, []),
      );
      const result = runSeats(partyScenario(changed));
      expect(result.threshold.parties[0]!.status).toBe(status);
      expect(
        result.allocation.parties.reduce((sum, party) => sum + party.seats, 0),
      ).toBe(101);
    },
  );

  it('resolves exact remainder ties by stored order and then party ID', () => {
    const input = workspaceLinked(false);
    const parties = input.parties as Json[];
    parties[0]!.tieBreakOrder = 2;
    parties[1]!.tieBreakOrder = 1;
    const reversed = success(
      editPartyShareWithAvailableBasis(input, 'P1', '50', []),
    );
    expect(seats(reversed)).toEqual([50, 51]);
    parties[0]!.tieBreakOrder = 1;
    const equal = success(
      editPartyShareWithAvailableBasis(input, 'P1', '50', []),
    );
    expect(seats(equal)).toEqual([51, 50]);
  });

  it('gives identical exact results across repeats, round trips and locales', () => {
    const changed = success(
      editPartyShareWithAvailableBasis(workspaceLinked(), 'P1', '60', []),
    );
    const scenario = partyScenario(changed);
    const expected = serializeResult(runScenario(scenario));
    const imported = parseScenarioJson(serializeScenario(scenario));
    expect(imported.ok).toBe(true);
    if (!imported.ok) throw new Error('Round trip unexpectedly failed');
    for (const locale of LOCALES) {
      expect(translator(locale)('app.title')).not.toBe('');
      expect(serializeResult(runScenario(scenario))).toBe(expected);
      expect(serializeResult(runScenario(imported.scenario))).toBe(expected);
    }
  });

  it('keeps nonnegative integer seats summing to an odd total for generated edits', () => {
    const next = createPrng(70358);
    for (let iteration = 0; iteration < 60; iteration += 1) {
      const count = randomInt(next, 2, 8);
      const parts = randomParts(next, count, 100);
      const input = partyModeInput(
        parts.map((part) => [String(part), '100'] as const),
        { threshold: '0', seatCount: 101 },
      );
      const percent = String(randomInt(next, 0, 100));
      const changed = success(
        editPartyShareWithAvailableBasis(input, 'P1', percent, []),
      );
      const result = runSeats(partyScenario(changed));
      expect(result.allocation.noAllocation).toBeNull();
      const counts = result.allocation.parties.map((party) => party.seats);
      expect(
        counts.every((count) => Number.isInteger(count) && count >= 0),
      ).toBe(true);
      expect(counts.reduce((sum, count) => sum + count, 0)).toBe(101);
    }
  });

  it('handles 20 groups, 30 parties and 10 blocks without requiring composition', () => {
    const input = partyModeInput(
      Array.from({ length: 30 }, () => ['1', '30'] as const),
      { threshold: '0', seatCount: 101, turnout: '0.6' },
    );
    input.groups = Array.from({ length: 20 }, (_, index) => ({
      id: `G${index + 1}`,
      name: `Group ${index + 1}`,
      notes: '',
      turnout: '0.6',
      growthRate: '0',
      turnoutChange: '0',
    }));
    input.blocks = Array.from({ length: 10 }, (_, index) => ({
      id: `B${index + 1}`,
      name: `Block ${index + 1}`,
      color: '#224466',
    }));
    const changed = success(
      editPartyShareWithAvailableBasis(input, 'P1', '20', []),
    );
    expect(partyScenario(changed).parties).toHaveLength(30);
    expect(seats(changed).reduce((sum, count) => sum + count, 0)).toBe(101);
  });
});
