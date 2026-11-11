import { describe, expect, it } from 'vitest';
import { editCompositionShare } from '../../src/engine/compositionEdit';
import {
  addEntity,
  deleteEntity,
  duplicateEntity,
  EditError,
  setGroupFraction,
  type Draft,
} from '../../src/engine/edit';
import {
  buildLinkedBasis,
  editLinkedGroupTurnout,
  editLinkedOverallTurnout,
  editLinkedPartyShare,
} from '../../src/engine/linkedTurnout';
import { rational, toFractionString } from '../../src/engine/rational';
import { runScenario, runSeats, serializeResult } from '../../src/engine/run';
import {
  parseScenarioJson,
  serializeScenario,
  validateScenario,
  type PartyScenario,
} from '../../src/engine/schema';
import { createStore } from '../../src/ui/store';
import { LOCALES } from '../../src/i18n';
import { partyModeInput, section8Input, type Json } from './helpers/scenarios';

const fraction = (numerator: string, denominator: string) => ({
  numerator,
  denominator,
});

function fixture(): Json {
  const input = partyModeInput(
    [
      ['1', '2'],
      ['1', '2'],
    ],
    {
      populationTotal: '1000',
      turnout: '0.6',
      validBallotRate: '0.999',
      threshold: '0',
      seatCount: 101,
    },
  );
  input.groups = ['G1', 'G2'].map((id) => ({
    id,
    name: id,
    notes: '',
    turnout: '0.6',
    growthRate: '0',
    turnoutChange: '0',
  }));
  const parties = input.parties as Json[];
  parties[0]!.composition = {
    G1: fraction('4', '5'),
    G2: fraction('1', '5'),
  };
  parties[1]!.composition = {
    G1: fraction('1', '5'),
    G2: fraction('4', '5'),
  };
  input.extraDraftData = { retained: 'yes' };
  parties[0]!.extraPartyData = 'keep';
  return input;
}

function record(value: unknown): Json {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('Expected an object');
  }
  return value as Json;
}

function scenario(input: unknown): PartyScenario {
  const checked = validateScenario(input);
  if (!checked.ok || checked.scenario.inputMode !== 'parties') {
    throw new Error(
      `Invalid party scenario: ${checked.ok ? 'wrong mode' : checked.issues.map((issue) => `${issue.path}:${issue.code}`).join(', ')}`,
    );
  }
  return checked.scenario;
}

function success(
  result:
    | { readonly ok: true; readonly draft: Draft }
    | { readonly ok: false; readonly reason: string },
): Draft {
  if (!result.ok) {
    throw new Error(`Unexpected refusal: ${result.reason}`);
  }
  return result.draft;
}

function fractionText(value: unknown): string {
  const parts = record(value);
  return toFractionString(
    rational(
      BigInt(String(parts.numerator)),
      BigInt(String(parts.denominator)),
    ),
  );
}

function shares(input: unknown): string[] {
  return scenario(input).parties.map((party) => fractionText(party.voteShare));
}

function modelGroup(input: unknown, id: string): Json {
  const model = record(record(input).linkedModel);
  return record(record(model.groups)[id]);
}

function seats(input: unknown): number[] {
  return runSeats(scenario(input)).allocation.parties.map(
    (party) => party.seats,
  );
}

function restrict(input: Draft, groupId: string, parties: string[]): Draft {
  const copy = structuredClone(input);
  modelGroup(copy, groupId).allowedPartyIds = parties;
  return copy;
}

describe('versioned linked turnout', () => {
  it.each([1, 2, 3, 4])(
    'migrates version %i group scenarios without changing results',
    (version) => {
      const old = section8Input('0.37');
      old.schemaVersion = version;
      if (version < 4) delete old.inputMode;
      const migrated = validateScenario(old);
      const baseline = validateScenario(section8Input('0.37'));
      if (!migrated.ok || !baseline.ok)
        throw new Error('Invalid group fixture');
      expect(migrated.scenario.schemaVersion).toBe(5);
      expect(migrated.scenario.inputMode).toBe('groups');
      expect(
        migrated.scenario.groups.every(
          (group) => typeof group.turnout === 'string',
        ),
      ).toBe(true);
      expect(serializeResult(runScenario(migrated.scenario))).toBe(
        serializeResult(runScenario(baseline.scenario)),
      );
    },
  );

  it('migrates version 4 party turnout exactly without changing its mode or seats', () => {
    const old = fixture();
    const originalSeats = seats(old);
    const migrated = scenario(old);
    expect(migrated.schemaVersion).toBe(5);
    expect(migrated.inputMode).toBe('parties');
    expect(migrated.groups[0]!.turnout).toEqual(fraction('3', '5'));
    expect(seats(migrated)).toEqual(originalSeats);
    expect(shares(migrated)).toEqual(['1/2', '1/2']);
    const exported = record(JSON.parse(serializeScenario(migrated)));
    expect(exported.linkedModel ?? null).toBeNull();
  });

  it('does not interpret an unrelated version-4 field as a version-5 linked model', () => {
    const old = fixture();
    old.linkedModel = {
      note: 'legacy draft metadata',
      groups: {
        G1: {
          preferences: {
            P1: fraction('1', '9'.repeat(257)),
          },
        },
      },
    };
    const migrated = scenario(old);
    expect(migrated.linkedModel).toBeUndefined();
    expect(shares(migrated)).toEqual(['1/2', '1/2']);
    expect(seats(migrated)).toEqual(seats(fixture()));
    const turnout = success(editLinkedOverallTurnout(old, '50'));
    expect(record(turnout).legacyV4LinkedModel).toEqual(old.linkedModel);
    expect(seats(turnout)).toEqual(seats(old));
    const linked = success(editLinkedGroupTurnout(old, 'G1', '80'));
    expect(record(linked).legacyV4LinkedModel).toEqual(old.linkedModel);
    expect(shares(linked)).toEqual(['19/35', '16/35']);
  });

  it('derives exact population shares and preferences without changing the caller', () => {
    const input = fixture();
    const before = JSON.stringify(input);
    const linked = success(buildLinkedBasis(input));
    expect(JSON.stringify(input)).toBe(before);
    expect(record(linked).extraDraftData).toEqual({ retained: 'yes' });
    expect(linked.parties[0]!.extraPartyData).toBe('keep');
    expect(record(record(linked).linkedModel).state).toBe('current');
    expect(fractionText(modelGroup(linked, 'G1').populationShare)).toBe('1/2');
    expect(fractionText(modelGroup(linked, 'G2').populationShare)).toBe('1/2');
    const first = record(modelGroup(linked, 'G1').preferences);
    const second = record(modelGroup(linked, 'G2').preferences);
    expect([fractionText(first.P1), fractionText(first.P2)]).toEqual([
      '4/5',
      '1/5',
    ]);
    expect([fractionText(second.P1), fractionText(second.P2)]).toEqual([
      '1/5',
      '4/5',
    ]);
    expect(seats(linked)).toEqual(seats(input));
  });

  it('recomputes party votes from group turnout using the independent two-group fixture', () => {
    const input = fixture();
    const changed = success(editLinkedGroupTurnout(input, 'G1', '80'));
    expect(record(changed).extraDraftData).toEqual({ retained: 'yes' });
    expect(changed.parties[0]!.extraPartyData).toBe('keep');
    expect(shares(changed)).toEqual(['19/35', '16/35']);
    const updated = scenario(changed);
    expect(fractionText(updated.rules.overallTurnout)).toBe('7/10');
    expect(updated.groups[0]!.turnout).toEqual(fraction('4', '5'));
    expect(updated.parties[0]!.composition).toEqual({
      G1: fraction('16', '19'),
      G2: fraction('3', '19'),
    });
    expect(updated.parties[1]!.composition).toEqual({
      G1: fraction('1', '4'),
      G2: fraction('3', '4'),
    });
    expect(seats(changed)).toEqual([55, 46]);
    expect((input.groups as Json[])[0]!.turnout).toBe('0.6');
  });

  it('repeats and reverses turnout edits exactly after JSON export and import', () => {
    const first = success(editLinkedGroupTurnout(fixture(), 'G1', '80'));
    const repeated = success(editLinkedGroupTurnout(first, 'G1', '80'));
    expect(serializeScenario(scenario(repeated))).toBe(
      serializeScenario(scenario(first)),
    );
    const parsed = parseScenarioJson(serializeScenario(scenario(first)));
    if (!parsed.ok) throw new Error('Round trip failed');
    const back = success(editLinkedGroupTurnout(parsed.scenario, 'G1', '60'));
    expect(shares(back)).toEqual(['1/2', '1/2']);
    const again = success(editLinkedGroupTurnout(back, 'G1', '80'));
    expect(serializeResult(runSeats(scenario(again)))).toBe(
      serializeResult(runSeats(scenario(first))),
    );
    expect(shares(again)).toEqual(['19/35', '16/35']);
  });

  it('round-trips non-terminating group turnouts without replacing them by display approximations', () => {
    const first = success(editLinkedGroupTurnout(fixture(), 'G1', '80'));
    const scaled = success(editLinkedOverallTurnout(first, '50'));
    const exact = scenario(scaled);
    expect(exact.groups.map((group) => group.turnout)).toEqual([
      fraction('4', '7'),
      fraction('3', '7'),
    ]);
    const parsed = parseScenarioJson(serializeScenario(exact));
    if (!parsed.ok || parsed.scenario.inputMode !== 'parties') {
      throw new Error('Exact turnout round trip failed');
    }
    expect(parsed.scenario.groups.map((group) => group.turnout)).toEqual([
      fraction('4', '7'),
      fraction('3', '7'),
    ]);
    expect(serializeResult(runSeats(parsed.scenario))).toBe(
      serializeResult(runSeats(exact)),
    );
  });

  it('scales all group turnouts without changing shares, seats or coalition analysis', () => {
    const base = success(buildLinkedBasis(fixture()));
    const changed = success(editLinkedOverallTurnout(base, '75'));
    expect(shares(changed)).toEqual(shares(base));
    expect(seats(changed)).toEqual(seats(base));
    expect(runScenario(scenario(changed)).coalitions).toEqual(
      runScenario(scenario(base)).coalitions,
    );
    expect(scenario(changed).groups.map((group) => group.turnout)).toEqual([
      fraction('3', '4'),
      fraction('3', '4'),
    ]);
  });

  it('refuses overall turnout if proportional scaling exceeds 100% in a group', () => {
    const base = success(editLinkedGroupTurnout(fixture(), 'G1', '90'));
    const before = JSON.stringify(base);
    const result = editLinkedOverallTurnout(base, '90');
    expect(result).toMatchObject({ ok: false, reason: 'turnout-overflow' });
    expect(JSON.stringify(base)).toBe(before);
  });

  it('keeps preferences through zero turnout and restores the last nonzero profile', () => {
    const base = success(editLinkedGroupTurnout(fixture(), 'G1', '80'));
    const zero = success(editLinkedOverallTurnout(base, '0'));
    expect(runSeats(scenario(zero)).allocation.noAllocation).toBe(
      'no-valid-votes',
    );
    const restored = success(editLinkedOverallTurnout(zero, '70'));
    expect(shares(restored)).toEqual(shares(base));
    expect(scenario(restored).groups.map((group) => group.turnout)).toEqual([
      fraction('4', '5'),
      fraction('3', '5'),
    ]);
    expect(seats(restored)).toEqual(seats(base));
  });

  it('rejects a zero-turnout basis with no saved nonzero profile', () => {
    const zero = success(
      editLinkedOverallTurnout(success(buildLinkedBasis(fixture())), '0'),
    );
    for (const id of ['G1', 'G2']) {
      modelGroup(zero, id).lastNonzeroTurnout = fraction('0', '1');
    }
    expect(validateScenario(zero).ok).toBe(false);
  });

  it('rejects a zero-turnout basis whose saved profile contradicts party shares', () => {
    const zero = success(
      editLinkedOverallTurnout(success(buildLinkedBasis(fixture())), '0'),
    );
    modelGroup(zero, 'G1').lastNonzeroTurnout = fraction('4', '5');
    expect(validateScenario(zero).ok).toBe(false);
  });

  it('handles no groups and a single known group without inventing preferences', () => {
    const empty = partyModeInput([['1', '1']], { turnout: '0.6' });
    expect(buildLinkedBasis(empty)).toMatchObject({
      ok: false,
      reason: 'unknown-population',
    });
    expect(runSeats(scenario(empty)).allocation.noAllocation).toBeNull();

    const single = partyModeInput(
      [
        ['1', '2'],
        ['1', '2'],
      ],
      { turnout: '0.6', threshold: '0' },
    );
    single.groups = [(fixture().groups as Json[])[0]!];
    for (const party of single.parties as Json[]) {
      party.composition = { G1: fraction('1', '1') };
    }
    const changed = success(editLinkedGroupTurnout(single, 'G1', '80'));
    expect(shares(changed)).toEqual(['1/2', '1/2']);
    expect(fractionText(scenario(changed).rules.overallTurnout)).toBe('4/5');
    expect(seats(changed)).toEqual(seats(single));
  });

  it('keeps zero-turnout group preferences for future projections', () => {
    const input = fixture();
    (input.groups as Json[])[0]!.growthRate = '0.1';
    (input.groups as Json[])[0]!.turnoutChange = '0.2';
    const zero = success(editLinkedGroupTurnout(input, 'G1', '0'));
    const future = runSeats(scenario(zero), 1);
    if (!('votes' in future)) throw new Error('Projection unavailable');
    const share = future.votes.parties[0]!.voteShare;
    expect(share === null ? null : toFractionString(share)).toBe('74/205');
  });

  it('rejects imported linked data that contradicts its party totals', () => {
    const linked = structuredClone(success(buildLinkedBasis(fixture())));
    record(linked.parties[0]).voteShare = fraction('3', '5');
    record(linked.parties[1]).voteShare = fraction('2', '5');
    const checked = validateScenario(linked);
    expect(checked.ok).toBe(false);
    const store = createStore({ input: fixture() });
    const before = JSON.stringify(store.getState().input);
    expect(store.importScenario(JSON.stringify(linked))).toBe(false);
    expect(JSON.stringify(store.getState().input)).toBe(before);
  });

  it.each([
    [
      'zero denominator',
      (draft: Draft) => {
        modelGroup(draft, 'G1').populationShare = fraction('1', '0');
      },
    ],
    [
      'oversized raw fraction that would reduce to one half',
      (draft: Draft) => {
        modelGroup(draft, 'G1').populationShare = fraction(
          `1${'0'.repeat(257)}`,
          `2${'0'.repeat(257)}`,
        );
      },
    ],
    [
      'population shares not totaling one',
      (draft: Draft) => {
        modelGroup(draft, 'G1').populationShare = fraction('9', '10');
      },
    ],
    [
      'preferences not totaling one',
      (draft: Draft) => {
        record(modelGroup(draft, 'G1').preferences).P1 = fraction('1', '5');
      },
    ],
    [
      'unknown destination',
      (draft: Draft) => {
        modelGroup(draft, 'G1').allowedPartyIds = ['missing-party'];
      },
    ],
    [
      'missing group',
      (draft: Draft) => {
        delete record(record(record(draft).linkedModel).groups).G1;
      },
    ],
    [
      'unknown state',
      (draft: Draft) => {
        record(record(draft).linkedModel).state = 'invalid';
      },
    ],
    [
      'invalid saved turnout',
      (draft: Draft) => {
        modelGroup(draft, 'G1').lastNonzeroTurnout = fraction('3', '2');
      },
    ],
  ])('rejects a malformed linked basis: %s', (_name, corrupt) => {
    const draft = structuredClone(success(buildLinkedBasis(fixture())));
    corrupt(draft);
    expect(validateScenario(draft).ok).toBe(false);
  });

  it('rejects a raw aggregate denominator budget overflow even when every fraction reduces', () => {
    const input = partyModeInput(
      Array.from({ length: 10 }, () => ['1', '10'] as const),
      { populationTotal: '1000', turnout: '0.6', threshold: '0' },
    );
    input.groups = Array.from({ length: 10 }, (_, index) => ({
      id: `G${index + 1}`,
      name: `Group ${index + 1}`,
      notes: '',
      turnout: '0.6',
      growthRate: '0',
      turnoutChange: '0',
    }));
    for (const party of input.parties as Json[]) {
      party.composition = Object.fromEntries(
        (input.groups as Json[]).map((group) => [
          String(group.id),
          fraction('1', '10'),
        ]),
      );
    }
    expect(validateScenario(input).ok).toBe(true);
    const draft = structuredClone(success(buildLinkedBasis(input)));
    const model = record(record(draft).linkedModel);
    let index = 0n;
    for (const group of Object.values(record(model.groups))) {
      const preferences = record(record(group).preferences);
      for (const id of Object.keys(preferences)) {
        const factor = 10n ** 25n + index;
        preferences[id] = fraction(String(factor), String(factor * 10n));
        index += 1n;
      }
    }
    expect(validateScenario(draft).ok).toBe(false);
  });

  it('preserves modeled assumptions or explicitly suspends them when an entity is added', () => {
    const base = success(buildLinkedBasis(fixture()));
    const previousG1 = modelGroup(base, 'G1');
    const added = addEntity(base, 'party', 'New party');
    const validated = scenario(added);
    expect(
      validated.parties.map((party) => fractionText(party.voteShare)),
    ).toEqual(['1/2', '1/2', '0']);
    expect(['current', 'suspended']).toContain(
      record(record(added).linkedModel).state,
    );
    expect(modelGroup(added, 'G1').populationShare).toEqual(
      previousG1.populationShare,
    );
    expect(record(modelGroup(added, 'G1').preferences).P1).toEqual(
      record(previousG1.preferences).P1,
    );
  });

  it('does not silently delete population or latent preferences at zero turnout', () => {
    const zero = success(editLinkedGroupTurnout(fixture(), 'G1', '0'));
    expect(() => deleteEntity(zero, 'group', 'G1', { mode: 'remove' })).toThrow(
      EditError,
    );
    try {
      deleteEntity(zero, 'group', 'G1', { mode: 'remove' });
    } catch (error) {
      expect(error).toMatchObject({ code: 'group-population-in-use' });
    }

    const noCurrentVotes = success(editLinkedPartyShare(zero, 'P1', '0', []));
    expect(() =>
      deleteEntity(noCurrentVotes, 'party', 'P1', { mode: 'remove' }),
    ).toThrow(EditError);
    try {
      deleteEntity(noCurrentVotes, 'party', 'P1', { mode: 'remove' });
    } catch (error) {
      expect(error).toMatchObject({ code: 'party-preference-in-use' });
    }
  });

  it('does not discard a latent preference in a zero-population group', () => {
    const input = fixture();
    for (const party of input.parties as Json[]) {
      party.composition = { G1: fraction('0', '1'), G2: fraction('1', '1') };
    }
    const base = success(buildLinkedBasis(input));
    const preferences = record(modelGroup(base, 'G1').preferences);
    preferences.P1 = fraction('4', '5');
    preferences.P2 = fraction('1', '5');
    expect(validateScenario(base).ok).toBe(true);
    expect(() => deleteEntity(base, 'group', 'G1', { mode: 'remove' })).toThrow(
      EditError,
    );
    try {
      deleteEntity(base, 'group', 'G1', { mode: 'remove' });
    } catch (error) {
      expect(error).toMatchObject({ code: 'group-preference-in-use' });
    }
  });

  it('suspends on adding or duplicating a group and preserves its assumptions', () => {
    const base = success(buildLinkedBasis(fixture()));
    for (const changed of [
      addEntity(base, 'group', 'New group'),
      duplicateEntity(base, 'group', 'G1', 'Copy'),
    ]) {
      expect(scenario(changed).linkedModel?.state).toBe('suspended');
      expect(modelGroup(changed, 'G1')).toEqual(modelGroup(base, 'G1'));
      expect(shares(changed)).toEqual(shares(base));
      expect(seats(changed)).toEqual(seats(base));
    }
    expect(() => setGroupFraction(base, 'G1', 'turnout', '80')).toThrow(
      EditError,
    );
  });

  it('retains the projected ballots when a saved linked model has zero validity', () => {
    const base = success(buildLinkedBasis(fixture()));
    const zeroValidity: Draft = {
      ...base,
      rules: { ...record(base.rules), validBallotRate: '0' },
    };
    const projected = runSeats(scenario(zeroValidity), 1);
    if (!('votes' in projected)) throw new Error('Projection unavailable');
    expect(toFractionString(projected.votes.totals.cast)).toBe('600');
    expect(toFractionString(projected.votes.totals.invalid)).toBe('600');
    expect(toFractionString(projected.votes.turnout)).toBe('3/5');
    expect(projected.allocation.noAllocation).toBe('no-valid-votes');
  });
});

describe('linked national party edits', () => {
  it('moves votes proportionally inside groups and preserves their totals', () => {
    const base = success(buildLinkedBasis(fixture()));
    const changed = success(editLinkedPartyShare(base, 'P1', '60', []));
    expect(record(changed).extraDraftData).toEqual({ retained: 'yes' });
    expect(changed.parties[0]!.extraPartyData).toBe('keep');
    expect(shares(changed)).toEqual(['3/5', '2/5']);
    expect(scenario(changed).parties[0]!.composition).toEqual({
      G1: fraction('7', '10'),
      G2: fraction('3', '10'),
    });
    const first = record(modelGroup(changed, 'G1').preferences);
    const second = record(modelGroup(changed, 'G2').preferences);
    expect([fractionText(first.P1), fractionText(first.P2)]).toEqual([
      '21/25',
      '4/25',
    ]);
    expect([fractionText(second.P1), fractionText(second.P2)]).toEqual([
      '9/25',
      '16/25',
    ]);
    expect(fractionText(modelGroup(changed, 'G1').populationShare)).toBe('1/2');
    expect(scenario(changed).groups.map((group) => group.turnout)).toEqual([
      fraction('3', '5'),
      fraction('3', '5'),
    ]);
  });

  it('honors locks and refuses an impossible national edit without mutation', () => {
    const base = success(buildLinkedBasis(fixture()));
    const before = JSON.stringify(base);
    const result = editLinkedPartyShare(base, 'P1', '60', ['P2']);
    expect(result).toMatchObject({
      ok: false,
      reason: 'locked-total-exceeded',
    });
    expect(JSON.stringify(base)).toBe(before);
  });

  it('reports the absence of an unlocked recipient for an otherwise valid decrease', () => {
    const base = success(buildLinkedBasis(fixture()));
    expect(editLinkedPartyShare(base, 'P1', '40', ['P2'])).toMatchObject({
      ok: false,
      reason: 'no-unlocked-recipient',
    });
  });

  it('does not bypass explicit group destination restrictions', () => {
    const input = fixture();
    const parties = input.parties as Json[];
    parties[0]!.composition = {
      G1: fraction('1', '1'),
      G2: fraction('0', '1'),
    };
    parties[1]!.composition = {
      G1: fraction('0', '1'),
      G2: fraction('1', '1'),
    };
    const base = restrict(
      restrict(success(buildLinkedBasis(input)), 'G1', ['P1']),
      'G2',
      ['P2'],
    );
    const before = JSON.stringify(base);
    const result = editLinkedPartyShare(base, 'P1', '60', []);
    expect(result).toMatchObject({ ok: false, reason: 'forbidden-transfer' });
    expect(JSON.stringify(base)).toBe(before);
  });

  it('allows newly positive support when no destination is forbidden', () => {
    const input = fixture();
    const parties = input.parties as Json[];
    parties[0]!.composition = {
      G1: fraction('1', '1'),
      G2: fraction('0', '1'),
    };
    parties[1]!.composition = {
      G1: fraction('0', '1'),
      G2: fraction('1', '1'),
    };
    const base = success(buildLinkedBasis(input));
    const changed = success(editLinkedPartyShare(base, 'P1', '60', []));
    expect(shares(changed)).toEqual(['3/5', '2/5']);
    expect(scenario(changed).parties[0]!.composition).toEqual({
      G1: fraction('5', '6'),
      G2: fraction('1', '6'),
    });
  });

  it('reroutes feasible transfers around a restricted destination', () => {
    const input = partyModeInput(
      [
        ['3', '5'],
        ['1', '5'],
        ['1', '5'],
      ],
      { populationTotal: '1000', turnout: '0.6', threshold: '0' },
    );
    input.groups = (fixture().groups as Json[]).map((group) => ({ ...group }));
    const parties = input.parties as Json[];
    parties[0]!.composition = {
      G1: fraction('1', '2'),
      G2: fraction('1', '2'),
    };
    parties[1]!.composition = {
      G1: fraction('0', '1'),
      G2: fraction('1', '1'),
    };
    parties[2]!.composition = {
      G1: fraction('1', '1'),
      G2: fraction('0', '1'),
    };
    const base = restrict(success(buildLinkedBasis(input)), 'G2', ['P1', 'P2']);
    const changed = success(editLinkedPartyShare(base, 'P1', '40', []));
    expect(shares(changed)).toEqual(['2/5', '3/10', '3/10']);
    const first = record(modelGroup(changed, 'G1').preferences);
    const second = record(modelGroup(changed, 'G2').preferences);
    expect(fractionText(first.P1)).toBe('2/5');
    expect(fractionText(first.P3)).toBe('3/5');
    expect(fractionText(second.P1)).toBe('2/5');
    expect(fractionText(second.P2)).toBe('3/5');
    expect(fractionText(second.P3)).toBe('0');
    const reordered = {
      ...base,
      groups: [...base.groups].reverse(),
      parties: [...base.parties].reverse(),
    };
    const reorderedResult = success(
      editLinkedPartyShare(reordered, 'P1', '40', []),
    );
    for (const id of ['G1', 'G2']) {
      expect(modelGroup(reorderedResult, id).preferences).toEqual(
        modelGroup(changed, id).preferences,
      );
    }
  });

  it('uses a nonproportional fallback when restrictions make proportional withdrawals impossible', () => {
    const input = partyModeInput(
      [
        ['3', '5'],
        ['1', '5'],
        ['1', '5'],
      ],
      { populationTotal: '1000', turnout: '0.6', threshold: '0' },
    );
    input.groups = (fixture().groups as Json[]).map((group) => ({ ...group }));
    const parties = input.parties as Json[];
    parties[0]!.composition = {
      G1: fraction('1', '2'),
      G2: fraction('1', '2'),
    };
    parties[1]!.composition = {
      G1: fraction('0', '1'),
      G2: fraction('1', '1'),
    };
    parties[2]!.composition = {
      G1: fraction('1', '1'),
      G2: fraction('0', '1'),
    };
    const base = restrict(success(buildLinkedBasis(input)), 'G2', ['P1']);
    const changed = success(editLinkedPartyShare(base, 'P1', '40', []));
    const first = record(modelGroup(changed, 'G1').preferences);
    const second = record(modelGroup(changed, 'G2').preferences);
    expect([
      fractionText(first.P1),
      fractionText(first.P2),
      fractionText(first.P3),
    ]).toEqual(['1/5', '1/5', '3/5']);
    expect([
      fractionText(second.P1),
      fractionText(second.P2),
      fractionText(second.P3),
    ]).toEqual(['3/5', '2/5', '0']);
    expect(shares(changed)).toEqual(['2/5', '3/10', '3/10']);
  });

  it('keeps party edits and overall turnout available when compositions are unknown', () => {
    const input = fixture();
    (input.parties as Json[])[0]!.composition = null;
    const changed = success(editLinkedPartyShare(input, 'P1', '60', []));
    expect(shares(changed)).toEqual(['3/5', '2/5']);
    expect(scenario(changed).parties[0]!.composition).toBeNull();
    const turnout = success(editLinkedOverallTurnout(changed, '50'));
    expect(shares(turnout)).toEqual(shares(changed));
    expect(seats(turnout)).toEqual(seats(changed));
    expect(editLinkedGroupTurnout(input, 'G1', '80')).toMatchObject({
      ok: false,
      reason: 'unknown-party-composition',
    });
  });

  it('suspends a linked basis after a composition-only edit without changing seats', () => {
    const base = success(buildLinkedBasis(fixture()));
    const changed = success(editCompositionShare(base, 'P1', 'G1', '70'));
    expect(shares(changed)).toEqual(shares(base));
    expect(seats(changed)).toEqual(seats(base));
    expect(record(record(changed).linkedModel).state).toBe('suspended');
    expect(modelGroup(changed, 'G1').preferences).toEqual(
      modelGroup(base, 'G1').preferences,
    );
    expect(editLinkedGroupTurnout(changed, 'G1', '80')).toMatchObject({
      ok: false,
      reason: 'suspended-model',
    });
    expect(runSeats(scenario(changed), 1)).toMatchObject({
      kind: 'unavailable',
      reason: 'suspended-model',
    });
    const rebuilt = success(buildLinkedBasis(changed));
    expect(record(record(rebuilt).linkedModel).state).toBe('current');
    expect(fractionText(modelGroup(rebuilt, 'G1').populationShare)).toBe(
      '9/20',
    );
    expect(shares(rebuilt)).toEqual(shares(changed));
    expect(seats(rebuilt)).toEqual(seats(changed));
    expect(runSeats(scenario(rebuilt), 1)).toHaveProperty('allocation');
  });

  it('rebuilds a suspended basis while retaining a zero-turnout group’s saved preferences', () => {
    const zero = success(editLinkedGroupTurnout(fixture(), 'G1', '0'));
    const suspended = success(editCompositionShare(zero, 'P1', 'G1', '0'));
    const rebuilt = success(buildLinkedBasis(suspended));
    expect(scenario(rebuilt).linkedModel?.state).toBe('current');
    expect(modelGroup(rebuilt, 'G1').populationShare).toEqual(
      modelGroup(zero, 'G1').populationShare,
    );
    expect(modelGroup(rebuilt, 'G1').preferences).toEqual(
      modelGroup(zero, 'G1').preferences,
    );
    expect(shares(rebuilt)).toEqual(shares(zero));
    expect(seats(rebuilt)).toEqual(seats(zero));
  });

  it('rebuilds a suspended all-zero basis from the saved profile and restores turnout', () => {
    const base = success(buildLinkedBasis(fixture()));
    const zero = success(editLinkedOverallTurnout(base, '0'));
    const suspended = success(editCompositionShare(zero, 'P1', 'G1', '70'));
    const rebuilt = success(buildLinkedBasis(suspended));
    expect(scenario(rebuilt).linkedModel?.state).toBe('current');
    expect(scenario(rebuilt).groups.map((group) => group.turnout)).toEqual([
      fraction('0', '1'),
      fraction('0', '1'),
    ]);
    expect(runSeats(scenario(rebuilt)).allocation.noAllocation).toBe(
      'no-valid-votes',
    );
    const restored = success(editLinkedOverallTurnout(rebuilt, '60'));
    expect(shares(restored)).toEqual(['1/2', '1/2']);
    expect(seats(restored)).toEqual(seats(base));
    expect(scenario(restored).parties[0]!.composition).toEqual({
      G1: fraction('7', '10'),
      G2: fraction('3', '10'),
    });
  });

  it.each([false, true])(
    'explicitly rescales the saved group profile after an independent suspended turnout edit (from zero: %s)',
    (fromZero) => {
      const base = success(buildLinkedBasis(fixture()));
      const starting = fromZero
        ? success(editLinkedOverallTurnout(base, '0'))
        : base;
      const suspended = success(
        editCompositionShare(starting, 'P1', 'G1', '70'),
      );
      const changed = success(editLinkedOverallTurnout(suspended, '50'));
      expect(scenario(changed).linkedModel?.state).toBe('suspended');
      expect(scenario(changed).groups.map((group) => group.turnout)).toEqual(
        scenario(starting).groups.map((group) => group.turnout),
      );
      const rebuilt = success(buildLinkedBasis(changed));
      expect(scenario(rebuilt).groups.map((group) => group.turnout)).toEqual([
        fraction('1', '2'),
        fraction('1', '2'),
      ]);
      expect(shares(rebuilt)).toEqual(['1/2', '1/2']);
      expect(seats(rebuilt)).toEqual(seats(base));
    },
  );

  it('refuses a suspended rebuild that would require over 100% turnout', () => {
    const base = success(editLinkedGroupTurnout(fixture(), 'G1', '90'));
    const suspended = success(editCompositionShare(base, 'P1', 'G1', '70'));
    const changed = success(editLinkedOverallTurnout(suspended, '90'));
    const before = JSON.stringify(changed);
    expect(buildLinkedBasis(changed)).toMatchObject({
      ok: false,
      reason: 'turnout-overflow',
    });
    expect(JSON.stringify(changed)).toBe(before);
  });

  it('refuses rebuilding if a zero-turnout group is assigned current votes', () => {
    const zero = success(editLinkedGroupTurnout(fixture(), 'G1', '0'));
    const suspended = success(editCompositionShare(zero, 'P1', 'G1', '10'));
    expect(buildLinkedBasis(suspended)).toMatchObject({
      ok: false,
      reason: 'inconsistent-demographics',
    });
  });
});

describe('linked turnout seat correctness', () => {
  it.each([
    ['3', '300', 'below-threshold'],
    ['3.25', '325', 'qualified'],
    ['3.5', '350', 'qualified'],
  ])(
    'keeps the exact %s%% threshold result after a linked turnout edit',
    (_text, numerator, status) => {
      const input = partyModeInput(
        [
          [numerator, '10000'],
          [String(10000n - BigInt(numerator)), '10000'],
        ],
        { populationTotal: '1000', turnout: '0.6', threshold: '0.0325' },
      );
      input.groups = fixture().groups;
      for (const party of input.parties as Json[]) {
        party.composition = { G1: fraction('1', '2'), G2: fraction('1', '2') };
      }
      const changed = success(editLinkedGroupTurnout(input, 'G1', '80'));
      expect(runSeats(scenario(changed)).threshold.parties[0]!.status).toBe(
        status,
      );
    },
  );

  it('refuses unavailable group models without blocking ordinary seats', () => {
    const unknown = fixture();
    (unknown.parties as Json[])[0]!.composition = null;
    expect(editLinkedGroupTurnout(unknown, 'G1', '80')).toMatchObject({
      ok: false,
      reason: 'unknown-party-composition',
    });
    expect(runSeats(scenario(unknown)).allocation.noAllocation).toBeNull();

    const zero = fixture();
    (zero.groups as Json[])[0]!.turnout = '0';
    expect(editLinkedGroupTurnout(zero, 'G1', '80')).toMatchObject({
      ok: false,
      reason: 'unknown-population',
    });
    expect(runSeats(scenario(zero)).allocation.noAllocation).toBeNull();

    const inconsistent = fixture();
    (inconsistent.groups as Json[])[0]!.turnout = '0.5';
    expect(editLinkedGroupTurnout(inconsistent, 'G1', '80')).toMatchObject({
      ok: false,
      reason: 'inconsistent-demographics',
    });
    expect(runSeats(scenario(inconsistent)).allocation.noAllocation).toBeNull();

    const zeroValidity = fixture();
    record(zeroValidity.rules).validBallotRate = '0';
    expect(editLinkedGroupTurnout(zeroValidity, 'G1', '80')).toMatchObject({
      ok: false,
      reason: 'unknown-population',
    });
    expect(runSeats(scenario(zeroValidity)).allocation.noAllocation).toBe(
      'no-valid-votes',
    );
  });

  it.each(['', '-1', '101', 'not-a-percent'])(
    'refuses invalid group turnout %j without changing the caller',
    (text) => {
      const base = success(buildLinkedBasis(fixture()));
      const before = JSON.stringify(base);
      expect(editLinkedGroupTurnout(base, 'G1', text)).toMatchObject({
        ok: false,
        reason: 'invalid-percent',
      });
      expect(JSON.stringify(base)).toBe(before);
    },
  );

  it('refuses a result beyond the exact fraction limit without modifying the basis', () => {
    const input = fixture();
    const denominator = 10n ** 250n + 1n;
    const complement = String(denominator - 1n);
    const whole = String(denominator);
    const parties = input.parties as Json[];
    parties[0]!.composition = {
      G1: fraction('1', whole),
      G2: fraction(complement, whole),
    };
    parties[1]!.composition = {
      G1: fraction(complement, whole),
      G2: fraction('1', whole),
    };
    const base = success(buildLinkedBasis(input));
    const before = JSON.stringify(base);
    expect(
      editLinkedGroupTurnout(base, 'G1', '33.33333333333333'),
    ).toMatchObject({ ok: false, reason: 'precision-limit' });
    expect(JSON.stringify(base)).toBe(before);
  });

  it('edits 20 groups and 30 parties within the 200 ms median budget', () => {
    const input = partyModeInput(
      Array.from({ length: 30 }, () => ['1', '30'] as const),
      { populationTotal: '1000000', turnout: '0.6', threshold: '0' },
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
      notes: '',
      color: '#336699',
    }));
    for (const [index, party] of (input.parties as Json[]).entries()) {
      party.blockId = `B${(index % 10) + 1}`;
      party.composition = Object.fromEntries(
        (input.groups as Json[]).map((group) => [
          String(group.id),
          fraction('1', '20'),
        ]),
      );
    }
    expect(validateScenario(input).ok).toBe(true);
    const durations: number[] = [];
    for (let run = 0; run < 7; run += 1) {
      const start = performance.now();
      const changed = success(editLinkedGroupTurnout(input, 'G1', '80'));
      durations.push(performance.now() - start);
      expect(runSeats(scenario(changed)).allocation.noAllocation).toBeNull();
    }
    durations.sort((a, b) => a - b);
    expect(durations[3]!).toBeLessThan(200);
  });

  it('keeps an empty coalition result when no elected party can join government', () => {
    const input = fixture();
    for (const party of input.parties as Json[]) {
      party.canJoinGovernment = false;
    }
    const changed = success(editLinkedGroupTurnout(input, 'G1', '80'));
    const result = runScenario(scenario(changed));
    expect(result.allocation.noAllocation).toBeNull();
    expect(result.coalitions.minimalWinning).toEqual([]);
  });

  it('preserves tie order and the ID fallback after turnout edits', () => {
    const input = fixture();
    for (const party of input.parties as Json[]) {
      party.composition = { G1: fraction('1', '2'), G2: fraction('1', '2') };
    }
    const parties = input.parties as Json[];
    parties[0]!.tieBreakOrder = 2;
    parties[1]!.tieBreakOrder = 1;
    const ordered = success(editLinkedGroupTurnout(input, 'G1', '80'));
    expect(seats(ordered)).toEqual([50, 51]);
    parties[0]!.tieBreakOrder = 1;
    const tied = success(editLinkedGroupTurnout(input, 'G1', '80'));
    expect(seats(tied)).toEqual([51, 50]);
  });

  it('keeps deterministic nonnegative odd-seat sums across seeded edits, locales and round trips', () => {
    for (let index = 0; index < 30; index += 1) {
      const percent = String(20 + ((index * 37) % 81));
      const changed = success(editLinkedGroupTurnout(fixture(), 'G1', percent));
      const result = runSeats(scenario(changed));
      expect(
        result.allocation.parties.every(
          (party) => Number.isInteger(party.seats) && party.seats >= 0,
        ),
      ).toBe(true);
      expect(
        result.allocation.parties.reduce((sum, party) => sum + party.seats, 0),
      ).toBe(101);
      const expected = serializeResult(result);
      const expectedCoalitions = JSON.stringify(
        runScenario(scenario(changed)).coalitions,
      );
      expect(serializeResult(runSeats(scenario(changed)))).toBe(expected);
      const parsed = parseScenarioJson(serializeScenario(scenario(changed)));
      if (!parsed.ok) throw new Error('Round trip failed');
      expect(serializeResult(runSeats(parsed.scenario))).toBe(expected);
      expect(JSON.stringify(runScenario(parsed.scenario).coalitions)).toBe(
        expectedCoalitions,
      );
      for (const language of LOCALES) {
        const store = createStore({ input: changed, language });
        const derived = store.getDerived().result;
        if (derived === null) throw new Error('Store hid a valid result');
        expect(serializeResult(derived)).toBe(expected);
        expect(
          JSON.stringify(
            runScenario(scenario(store.getState().input)).coalitions,
          ),
        ).toBe(expectedCoalitions);
      }
    }
  });
});
