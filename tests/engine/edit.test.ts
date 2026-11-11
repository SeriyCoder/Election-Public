import editSource from '../../src/engine/edit.ts?raw';
import { describe, expect, it } from 'vitest';
import {
  addEntity,
  addPair,
  deleteEntity,
  duplicateEntity,
  EditError,
  entities,
  findReferences,
  GROUP_CHANGE_FIELDS,
  ID_PREFIX,
  isDraft,
  moveEntity,
  nextIdIndex,
  PAIR_LISTS,
  rebalanceShares,
  rebalanceWeights,
  PALETTE,
  recolorEntity,
  removePair,
  renameEntity,
  repairModes,
  setPartyBlock,
  setAllowedParty,
  setCohortTurnout,
  setEntityNotes,
  setGroupFraction,
  setMajorityMode,
  setPartyEligibility,
  setRule,
  setScenarioText,
  setVoteWeight,
  setVotingMode,
  turnoutCohorts,
  type Draft,
  type EntityKind,
} from '../../src/engine/edit';
import { runScenario, runSeats, serializeResult } from '../../src/engine/run';
import {
  LIMITS,
  parseScenarioJson,
  serializeScenario,
  validateScenario,
} from '../../src/engine/schema';
import { partyModeInput, section8Input, type Json } from './helpers/scenarios';

const KINDS: readonly EntityKind[] = ['group', 'party', 'block'];

function draft(input: Json = section8Input()): Draft {
  if (!isDraft(input)) {
    throw new Error('expected a draft');
  }
  return input;
}

/** Section 8 with group 3 open: 60% P3, 30% P1, 10% P2. */
function splitDraft(): Draft {
  const input = section8Input();
  const groups = (input.groups as Json[]).map((group) =>
    group.id === 'G3'
      ? {
          ...group,
          votingMode: 'open',
          allowedPartyIds: ['P3', 'P1', 'P2'],
          voteWeights: { P3: '0.6', P1: '0.3', P2: '0.1' },
        }
      : group,
  );
  return draft({ ...input, groups });
}

function ids(value: Draft, kind: EntityKind): string[] {
  return entities(value, kind).map((entity) => entity.id);
}

function entity(value: Draft, kind: EntityKind, id: string): Json {
  const found = entities(value, kind).find((item) => item.id === id);
  if (found === undefined) {
    throw new Error(`missing ${kind} ${id}`);
  }
  return found;
}

function serialized(value: Draft): string {
  const validation = validateScenario(value);
  if (!validation.ok) {
    throw new Error(JSON.stringify(validation.issues));
  }
  return serializeResult(runScenario(validation.scenario));
}

function issueCodes(value: Draft): string[] {
  const validation = validateScenario(value);
  return validation.ok ? [] : validation.issues.map((issue) => issue.code);
}

function codeOf(action: () => unknown): string | undefined {
  try {
    action();
  } catch (error) {
    return error instanceof EditError ? error.code : 'not-an-edit-error';
  }
  return undefined;
}

function frozenCopy(value: Draft): Draft {
  return structuredClone(value) as Draft;
}

describe('draft guard', () => {
  it('accepts a structural scenario draft', () => {
    expect(isDraft(section8Input())).toBe(true);
  });

  it('accepts a draft whose values are invalid', () => {
    const input = section8Input();
    expect(isDraft({ ...input, rules: { seatCount: -1 } })).toBe(true);
  });

  it.each([
    ['null', null],
    ['a string', 'scenario'],
    ['an array', []],
    ['missing groups', { ...section8Input(), groups: undefined }],
    ['parties not an array', { ...section8Input(), parties: {} }],
    ['an entity without an ID', { ...section8Input(), blocks: [{}] }],
    ['a numeric ID', { ...section8Input(), blocks: [{ id: 3 }] }],
    ['an entity that is not an object', { ...section8Input(), groups: [1] }],
    ['missing coalition rules', { ...section8Input(), coalitionRules: null }],
  ])('rejects %s', (_label, input) => {
    expect(isDraft(input)).toBe(false);
  });
});

describe('ID generation', () => {
  it('uses one prefix per kind', () => {
    expect(ID_PREFIX).toEqual({ group: 'G', party: 'P', block: 'B' });
  });

  it.each(KINDS)('continues the %s numbering above the largest', (kind) => {
    expect(nextIdIndex(draft(), kind)).toBe(5);
  });

  it('ignores IDs that do not follow the prefix pattern', () => {
    const input = section8Input();
    const parties = [
      ...(input.parties as Json[]),
      { id: 'P10' },
      { id: 'p70' },
      { id: 'X' },
      { id: 'P1a' },
    ];
    expect(nextIdIndex(draft({ ...input, parties }), 'party')).toBe(11);
  });

  it('counts a prefixed ID used by another kind', () => {
    const input = section8Input();
    const parties = [...(input.parties as Json[]), { id: 'G7' }];
    expect(nextIdIndex(draft({ ...input, parties }), 'group')).toBe(8);
  });

  it('starts at 1 when there is no entity', () => {
    const empty = draft({
      ...section8Input(),
      groups: [],
      parties: [],
      blocks: [],
    });
    expect(nextIdIndex(empty, 'block')).toBe(1);
  });
});

describe('add', () => {
  it('appends a group with zero share and no destinations', () => {
    const next = addEntity(draft(), 'group', 'New group');
    expect(ids(next, 'group')).toEqual(['G1', 'G2', 'G3', 'G4', 'G5']);
    expect(entity(next, 'group', 'G5')).toEqual({
      id: 'G5',
      name: 'New group',
      notes: '',
      populationShare: '0',
      growthRate: '0',
      turnout: '1',
      turnoutChange: '0',
      validBallotRate: '0.999',
      participationFactor: '1',
      votingMode: 'open',
      allowedPartyIds: [],
      voteWeights: {},
    });
    expect(Object.keys(entity(next, 'group', 'G5'))).toEqual([
      'id',
      'name',
      'notes',
      'populationShare',
      'growthRate',
      'turnout',
      'turnoutChange',
      'validBallotRate',
      'participationFactor',
      'votingMode',
      'allowedPartyIds',
      'voteWeights',
    ]);
  });

  it('appends an unassigned eligible party after the last tie-break order', () => {
    const next = addEntity(draft(), 'party', 'New party');
    expect(entity(next, 'party', 'P5')).toEqual({
      id: 'P5',
      name: 'New party',
      notes: '',
      color: expect.stringMatching(/^#[0-9a-f]{6}$/),
      blockId: null,
      tieBreakOrder: 5,
      canJoinGovernment: true,
    });
  });

  it('appends a block with a palette color', () => {
    const next = addEntity(draft(), 'block', 'New block');
    expect(entity(next, 'block', 'B5')).toEqual({
      id: 'B5',
      name: 'New block',
      notes: '',
      color: expect.stringMatching(/^#[0-9a-f]{6}$/),
    });
  });

  it('offers at least ten distinct valid palette colors', () => {
    expect(PALETTE.length).toBeGreaterThanOrEqual(10);
    expect(new Set(PALETTE).size).toBe(PALETTE.length);
    for (const color of PALETTE) {
      expect(color).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  it('picks the first palette color not used by the same kind', () => {
    const input = section8Input();
    const parties = (input.parties as Json[]).map((party, index) => ({
      ...party,
      color: PALETTE[index],
    }));
    const next = addEntity(draft({ ...input, parties }), 'party', 'x');
    expect(entity(next, 'party', 'P5').color).toBe(PALETTE[4]);
  });

  it('keeps the scenario valid after adding a party or a block', () => {
    expect(issueCodes(addEntity(draft(), 'party', 'x'))).toEqual([]);
    expect(issueCodes(addEntity(draft(), 'block', 'x'))).toEqual([]);
  });

  it('adds no votes: seats are unchanged after adding a party', () => {
    const before = validateScenario(section8Input());
    const after = validateScenario(addEntity(draft(), 'party', 'x'));
    if (!before.ok || !after.ok) {
      throw new Error('expected valid scenarios');
    }
    const seats = (scenario: typeof before.scenario) =>
      runScenario(scenario).allocation.parties.map((party) => [
        party.partyId,
        party.seats,
      ]);
    expect(seats(after.scenario)).toEqual([
      ...seats(before.scenario),
      ['P5', 0],
    ]);
  });

  it('reports the missing destinations of a new group through validation', () => {
    const codes = issueCodes(addEntity(draft(), 'group', 'x'));
    expect(codes.length).toBeGreaterThan(0);
  });

  it.each([
    ['group', LIMITS.groups],
    ['party', LIMITS.parties],
    ['block', LIMITS.blocks],
  ] as const)('refuses a %s beyond the limit of %d', (kind, limit) => {
    const key = `${kind === 'party' ? 'parties' : `${kind}s`}`;
    const many = Array.from({ length: limit }, (_, index) => ({
      id: `${ID_PREFIX[kind]}${index + 1}`,
    }));
    const full = draft({ ...section8Input(), [key]: many });
    expect(codeOf(() => addEntity(full, kind, 'x'))).toBe('limit-reached');
    expect(codeOf(() => duplicateEntity(full, kind, many[0]!.id, 'x'))).toBe(
      'limit-reached',
    );
  });

  it('adds a zero-share party with unknown composition in party mode', () => {
    const input = draft(partyModeInput([['1', '1']]));
    const next = addEntity(input, 'party', 'New party');
    expect(entity(next, 'party', 'P2')).toMatchObject({
      voteShare: { numerator: '0', denominator: '1' },
      composition: null,
    });
    expect(issueCodes(next)).toEqual([]);
  });

  it('duplicates a party as zero-share in party mode', () => {
    const input = draft(partyModeInput([['1', '1']]));
    const next = duplicateEntity(input, 'party', 'P1', 'Copy');
    expect(entity(next, 'party', 'P2')).toMatchObject({
      voteShare: { numerator: '0', denominator: '1' },
      composition: null,
    });
    expect(issueCodes(next)).toEqual([]);
  });

  it('adds only demographic fields to a party-mode group', () => {
    const input = draft(partyModeInput([['1', '1']]));
    const next = addEntity(input, 'group', 'Group');
    expect(entity(next, 'group', 'G1')).toEqual({
      id: 'G1',
      name: 'Group',
      notes: '',
      growthRate: '0',
      turnout: '1',
      turnoutChange: '0',
    });
    expect(issueCodes(next)).toEqual([]);
  });
});

describe('duplicate', () => {
  it('inserts a group copy after the source with zero share', () => {
    const next = duplicateEntity(splitDraft(), 'group', 'G3', 'Copy');
    expect(ids(next, 'group')).toEqual(['G1', 'G2', 'G3', 'G5', 'G4']);
    const source = entity(next, 'group', 'G3');
    expect(entity(next, 'group', 'G5')).toEqual({
      ...source,
      id: 'G5',
      name: 'Copy',
      populationShare: '0',
    });
  });

  it('keeps a valid scenario valid and seats unchanged after a group copy', () => {
    const next = duplicateEntity(splitDraft(), 'group', 'G3', 'Copy');
    const before = JSON.parse(serialized(splitDraft())) as Json;
    const after = JSON.parse(serialized(next)) as Json;
    expect(after.allocation).toEqual(before.allocation);
  });

  it('copies a party without votes and with the next tie-break order', () => {
    const next = duplicateEntity(splitDraft(), 'party', 'P1', 'Copy');
    expect(ids(next, 'party')).toEqual(['P1', 'P5', 'P2', 'P3', 'P4']);
    expect(entity(next, 'party', 'P5')).toEqual({
      ...entity(next, 'party', 'P1'),
      id: 'P5',
      name: 'Copy',
      tieBreakOrder: 5,
    });
    for (const group of entities(next, 'group')) {
      expect(group.allowedPartyIds).not.toContain('P5');
      expect(Object.keys(group.voteWeights as Json)).not.toContain('P5');
    }
  });

  it('copies a block without member parties', () => {
    const next = duplicateEntity(draft(), 'block', 'B2', 'Copy');
    expect(ids(next, 'block')).toEqual(['B1', 'B2', 'B5', 'B3', 'B4']);
    expect(entity(next, 'block', 'B5')).toEqual({
      ...entity(next, 'block', 'B2'),
      id: 'B5',
      name: 'Copy',
    });
    expect(
      entities(next, 'party').filter((party) => party.blockId === 'B5'),
    ).toEqual([]);
  });

  it('refuses an unknown source', () => {
    expect(codeOf(() => duplicateEntity(draft(), 'party', 'P9', 'x'))).toBe(
      'unknown-entity',
    );
  });

  it.each(KINDS)('copies the notes of a %s', (kind) => {
    const id = `${ID_PREFIX[kind]}2`;
    const noted = setEntityNotes(draft(), kind, id, 'Why this row exists');
    const next = duplicateEntity(noted, kind, id, 'Copy');
    expect(entity(next, kind, `${ID_PREFIX[kind]}5`).notes).toBe(
      'Why this row exists',
    );
  });
});

describe('party-mode group addition with known composition', () => {
  it.each([
    ['adding', (value: Draft) => addEntity(value, 'group', 'New group')],
    [
      'duplicating',
      (value: Draft) => duplicateEntity(value, 'group', 'G1', 'Copy'),
    ],
  ] as const)(
    '%s a group keeps composition complete and votes and seats unchanged',
    (_operation, edit) => {
      const input = partyModeInput([
        ['1', '2'],
        ['1', '4'],
        ['1', '4'],
      ]);
      const parties = input.parties as Json[];
      const value = draft({
        ...input,
        groups: [
          {
            id: 'G1',
            name: 'Group',
            notes: '',
            growthRate: '0',
            turnout: '1',
            turnoutChange: '0',
          },
        ],
        parties: parties.map((party, index) =>
          index < 2
            ? {
                ...party,
                composition: { G1: { numerator: '1', denominator: '1' } },
              }
            : party,
        ),
      });
      const original = structuredClone(value);
      const baseline = validateScenario(value);
      if (!baseline.ok) {
        throw new Error(JSON.stringify(baseline.issues));
      }

      const next = edit(value);
      expect(issueCodes(next)).toEqual([]);
      for (const id of ['P1', 'P2']) {
        expect(entity(next, 'party', id).composition).toEqual({
          G1: { numerator: '1', denominator: '1' },
          G2: { numerator: '0', denominator: '1' },
        });
      }
      expect(entity(next, 'party', 'P3').composition).toBeNull();
      expect(value).toEqual(original);

      const validation = validateScenario(next);
      if (!validation.ok) {
        throw new Error(JSON.stringify(validation.issues));
      }
      const before = runSeats(baseline.scenario);
      const after = runSeats(validation.scenario);
      expect(after.votes.parties).toEqual(before.votes.parties);
      expect(after.allocation).toEqual(before.allocation);
    },
  );
});

describe('field edits keep IDs and references', () => {
  it.each(KINDS)('renames a %s without touching anything else', (kind) => {
    const before = splitDraft();
    const id = `${ID_PREFIX[kind]}1`;
    const next = renameEntity(before, kind, id, 'Renamed');
    expect(entity(next, kind, id).name).toBe('Renamed');
    expect(serialized(next)).toBe(serialized(before));
    expect(next.coalitionRules).toEqual(before.coalitionRules);
    expect(entities(next, 'group').map((group) => group.voteWeights)).toEqual(
      entities(before, 'group').map((group) => group.voteWeights),
    );
  });

  it('keeps any Unicode or markup in a name as plain data', () => {
    const name = '<script>alert("x")</script> עברית Ж';
    const next = renameEntity(draft(), 'party', 'P2', name);
    expect(entity(next, 'party', 'P2').name).toBe(name);
  });

  it.each(['party', 'block'] as const)('recolors a %s', (kind) => {
    const next = recolorEntity(draft(), kind, `${ID_PREFIX[kind]}2`, '#abcdef');
    expect(entity(next, kind, `${ID_PREFIX[kind]}2`).color).toBe('#abcdef');
    expect(serialized(next)).toBe(serialized(draft()));
  });

  it('moves a party to another block or to none', () => {
    const moved = setPartyBlock(draft(), 'P4', 'B1');
    expect(entity(moved, 'party', 'P4').blockId).toBe('B1');
    const unassigned = setPartyBlock(moved, 'P4', null);
    expect(entity(unassigned, 'party', 'P4').blockId).toBeNull();
  });

  it('sets government eligibility', () => {
    const next = setPartyEligibility(draft(), 'P3', true);
    expect(entity(next, 'party', 'P3').canJoinGovernment).toBe(true);
  });

  it('sets the scenario name and notes', () => {
    const named = setScenarioText(draft(), 'name', 'Mine');
    const noted = setScenarioText(named, 'notes', 'Line 1\nLine 2');
    expect(noted.name).toBe('Mine');
    expect(noted.notes).toBe('Line 1\nLine 2');
  });

  it.each(KINDS)('sets the notes of a %s and nothing else', (kind) => {
    const before = splitDraft();
    const id = `${ID_PREFIX[kind]}1`;
    const text = '<b>Line 1</b>\nЗаметка עברית';
    const next = setEntityNotes(before, kind, id, text);
    expect(entity(next, kind, id)).toEqual({
      ...entity(before, kind, id),
      notes: text,
    });
    expect(serialized(next)).toBe(serialized(before));
    expect(next.coalitionRules).toEqual(before.coalitionRules);
  });

  it('refuses edits of an unknown entity', () => {
    expect(codeOf(() => renameEntity(draft(), 'group', 'G9', 'x'))).toBe(
      'unknown-entity',
    );
    expect(codeOf(() => setPartyBlock(draft(), 'P9', null))).toBe(
      'unknown-entity',
    );
    expect(codeOf(() => setEntityNotes(draft(), 'block', 'B9', 'x'))).toBe(
      'unknown-entity',
    );
  });
});

describe('move', () => {
  it('swaps with the neighbour and keeps tie-break orders', () => {
    const next = moveEntity(draft(), 'party', 'P3', -1);
    expect(ids(next, 'party')).toEqual(['P1', 'P3', 'P2', 'P4']);
    expect(entity(next, 'party', 'P3').tieBreakOrder).toBe(3);
    expect(ids(moveEntity(next, 'party', 'P3', 1), 'party')).toEqual([
      'P1',
      'P2',
      'P3',
      'P4',
    ]);
  });

  it('is a no-op at either end', () => {
    expect(ids(moveEntity(draft(), 'group', 'G1', -1), 'group')).toEqual([
      'G1',
      'G2',
      'G3',
      'G4',
    ]);
    expect(ids(moveEntity(draft(), 'block', 'B4', 1), 'block')).toEqual([
      'B1',
      'B2',
      'B3',
      'B4',
    ]);
  });

  it('does not change any party seat count', () => {
    const seatsById = (value: Draft) =>
      Object.fromEntries(
        (
          JSON.parse(serialized(value)) as {
            allocation: { parties: { partyId: string; seats: number }[] };
          }
        ).allocation.parties.map((party) => [party.partyId, party.seats]),
      );
    expect(seatsById(moveEntity(draft(), 'party', 'P4', -1))).toEqual(
      seatsById(draft()),
    );
  });
});

describe('references', () => {
  it('lists groups and pairs that name a party', () => {
    expect(findReferences(splitDraft(), 'party', 'P1')).toEqual([
      { kind: 'group', id: 'G1', path: 'groups[0]' },
      { kind: 'group', id: 'G3', path: 'groups[2]' },
      {
        kind: 'pair',
        id: null,
        path: 'coalitionRules.incompatiblePartyPairs[0]',
      },
    ]);
  });

  it('counts a group that only allows a party without weighting it', () => {
    const input = section8Input();
    const groups = (input.groups as Json[]).map((group) =>
      group.id === 'G4'
        ? { ...group, votingMode: 'open', allowedPartyIds: ['P4', 'P3'] }
        : group,
    );
    expect(findReferences(draft({ ...input, groups }), 'party', 'P3')).toEqual([
      { kind: 'group', id: 'G3', path: 'groups[2]' },
      { kind: 'group', id: 'G4', path: 'groups[3]' },
    ]);
  });

  it('lists override pairs too', () => {
    const input = section8Input();
    const value = draft({
      ...input,
      coalitionRules: {
        ...(input.coalitionRules as Json),
        compatiblePartyOverrides: [['P3', 'P4']],
      },
    });
    expect(findReferences(value, 'party', 'P4')).toContainEqual({
      kind: 'pair',
      id: null,
      path: 'coalitionRules.compatiblePartyOverrides[0]',
    });
  });

  it('lists refusals naming a party on either side', () => {
    const input = section8Input();
    const value = draft({
      ...input,
      coalitionRules: {
        ...(input.coalitionRules as Json),
        partyRefusals: [
          ['P2', 'P3'],
          ['P4', 'P2'],
        ],
      },
    });
    expect(findReferences(value, 'party', 'P2')).toEqual([
      { kind: 'group', id: 'G2', path: 'groups[1]' },
      {
        kind: 'pair',
        id: null,
        path: 'coalitionRules.incompatiblePartyPairs[0]',
      },
      { kind: 'pair', id: null, path: 'coalitionRules.partyRefusals[0]' },
      { kind: 'pair', id: null, path: 'coalitionRules.partyRefusals[1]' },
    ]);
  });

  it('lists member parties and block pairs for a block', () => {
    const input = section8Input();
    const parties = (input.parties as Json[]).map((party) =>
      party.id === 'P4' ? { ...party, blockId: 'B1' } : party,
    );
    const value = draft({
      ...input,
      parties,
      coalitionRules: {
        ...(input.coalitionRules as Json),
        incompatibleBlockPairs: [['B2', 'B1']],
      },
    });
    expect(findReferences(value, 'block', 'B1')).toEqual([
      { kind: 'party', id: 'P1', path: 'parties[0]' },
      { kind: 'party', id: 'P4', path: 'parties[3]' },
      {
        kind: 'pair',
        id: null,
        path: 'coalitionRules.incompatibleBlockPairs[0]',
      },
    ]);
  });

  it('finds no references to a group or an unused party', () => {
    expect(findReferences(draft(), 'group', 'G1')).toEqual([]);
    const added = addEntity(draft(), 'party', 'x');
    expect(findReferences(added, 'party', 'P5')).toEqual([]);
  });

  it('offers the repairs per kind', () => {
    expect(repairModes('party')).toEqual(['reassign', 'remove']);
    expect(repairModes('block')).toEqual(['reassign', 'unassign']);
    expect(repairModes('group')).toEqual([]);
  });
});

describe('delete', () => {
  it('deletes an unreferenced entity without a repair', () => {
    const added = addEntity(draft(), 'party', 'x');
    expect(ids(deleteEntity(added, 'party', 'P5'), 'party')).toEqual([
      'P1',
      'P2',
      'P3',
      'P4',
    ]);
  });

  it('deletes a group and lets validation report the population gap', () => {
    const next = deleteEntity(draft(), 'group', 'G4');
    expect(ids(next, 'group')).toEqual(['G1', 'G2', 'G3']);
    expect(issueCodes(next)).toContain('invalid-total');
  });

  it.each(['party', 'block'] as const)(
    'requires a repair for a referenced %s',
    (kind) => {
      expect(
        codeOf(() => deleteEntity(draft(), kind, `${ID_PREFIX[kind]}1`)),
      ).toBe('repair-required');
    },
  );

  it.each([
    ['party', { mode: 'unassign' }],
    ['block', { mode: 'remove' }],
    ['party', { mode: 'reassign', targetId: 'P1' }],
    ['party', { mode: 'reassign', targetId: 'P9' }],
    ['block', { mode: 'reassign', targetId: 'B9' }],
  ] as const)('refuses the %s repair %j for ID 1', (kind, repair) => {
    expect(
      codeOf(() => deleteEntity(draft(), kind, `${ID_PREFIX[kind]}1`, repair)),
    ).toBe('invalid-repair');
  });

  it('refuses an unknown entity', () => {
    expect(codeOf(() => deleteEntity(draft(), 'group', 'G9'))).toBe(
      'unknown-entity',
    );
  });

  it('reassigns a party: weights are summed exactly and pairs removed', () => {
    const next = deleteEntity(splitDraft(), 'party', 'P1', {
      mode: 'reassign',
      targetId: 'P3',
    });
    expect(ids(next, 'party')).toEqual(['P2', 'P3', 'P4']);
    expect(entity(next, 'group', 'G1').allowedPartyIds).toEqual(['P3']);
    expect(entity(next, 'group', 'G1').voteWeights).toEqual({ P3: '1' });
    expect(entity(next, 'group', 'G3').allowedPartyIds).toEqual(['P3', 'P2']);
    expect(entity(next, 'group', 'G3').voteWeights).toEqual({
      P3: '0.9',
      P2: '0.1',
    });
    expect(next.coalitionRules.incompatiblePartyPairs).toEqual([]);
    expect(issueCodes(next)).toEqual([]);
  });

  it('preserves every valid vote on reassignment', () => {
    const before = validateScenario(splitDraft());
    const next = deleteEntity(splitDraft(), 'party', 'P1', {
      mode: 'reassign',
      targetId: 'P3',
    });
    const after = validateScenario(next);
    if (!before.ok || !after.ok) {
      throw new Error('expected valid scenarios');
    }
    const votes = (scenario: typeof before.scenario) =>
      runScenario(scenario).votes;
    expect(votes(after.scenario).allValidVotes).toEqual(
      votes(before.scenario).allValidVotes,
    );
  });

  it('removes a party with its weights and lets validation report totals', () => {
    const next = deleteEntity(splitDraft(), 'party', 'P1', { mode: 'remove' });
    expect(entity(next, 'group', 'G1').allowedPartyIds).toEqual([]);
    expect(entity(next, 'group', 'G1').voteWeights).toEqual({});
    expect(entity(next, 'group', 'G3').voteWeights).toEqual({
      P3: '0.6',
      P2: '0.1',
    });
    expect(next.coalitionRules.incompatiblePartyPairs).toEqual([]);
    expect(issueCodes(next).length).toBeGreaterThan(0);
  });

  it('refuses to reassign a weight that is not a decimal', () => {
    const input = splitDraft();
    const groups = entities(input, 'group').map((group) =>
      group.id === 'G3'
        ? { ...group, voteWeights: { P3: 'abc', P1: '0.3', P2: '0.1' } }
        : group,
    );
    expect(
      codeOf(() =>
        deleteEntity(draft({ ...input, groups }), 'party', 'P1', {
          mode: 'reassign',
          targetId: 'P3',
        }),
      ),
    ).toBe('invalid-weight');
  });

  it('reassigns block members and drops block pairs', () => {
    const input = section8Input();
    const value = draft({
      ...input,
      coalitionRules: {
        ...(input.coalitionRules as Json),
        incompatibleBlockPairs: [
          ['B1', 'B2'],
          ['B3', 'B4'],
        ],
      },
    });
    const next = deleteEntity(value, 'block', 'B1', {
      mode: 'reassign',
      targetId: 'B4',
    });
    expect(ids(next, 'block')).toEqual(['B2', 'B3', 'B4']);
    expect(entity(next, 'party', 'P1').blockId).toBe('B4');
    expect(next.coalitionRules.incompatibleBlockPairs).toEqual([['B3', 'B4']]);
  });

  it('unassigns block members', () => {
    const next = deleteEntity(draft(), 'block', 'B2', { mode: 'unassign' });
    expect(entity(next, 'party', 'P2').blockId).toBeNull();
    expect(issueCodes(next)).toEqual([]);
  });

  it.each([
    ['remove', { mode: 'remove' }],
    ['reassign', { mode: 'reassign', targetId: 'P1' }],
  ] as const)(
    'drops refusals naming a party it deletes with %s',
    (_mode, repair) => {
      const input = section8Input();
      const value = draft({
        ...input,
        coalitionRules: {
          ...(input.coalitionRules as Json),
          partyRefusals: [
            ['P4', 'P2'],
            ['P3', 'P1'],
            ['P2', 'P4'],
          ],
        },
      });
      const next = deleteEntity(value, 'party', 'P4', repair);
      expect(next.coalitionRules.partyRefusals).toEqual([['P3', 'P1']]);
    },
  );
});

describe('purity', () => {
  it('never mutates the input draft', () => {
    const source = splitDraft();
    const copy = frozenCopy(source);
    addEntity(source, 'group', 'x');
    duplicateEntity(source, 'party', 'P2', 'x');
    renameEntity(source, 'block', 'B1', 'x');
    recolorEntity(source, 'party', 'P1', '#000000');
    setPartyBlock(source, 'P1', null);
    setPartyEligibility(source, 'P3', true);
    setScenarioText(source, 'notes', 'x');
    setEntityNotes(source, 'group', 'G1', 'x');
    moveEntity(source, 'group', 'G2', 1);
    deleteEntity(source, 'party', 'P1', { mode: 'reassign', targetId: 'P3' });
    deleteEntity(source, 'block', 'B1', { mode: 'unassign' });
    setGroupFraction(source, 'G1', 'turnout', '50');
    setVotingMode(source, 'G1', 'open');
    setAllowedParty(source, 'G3', 'P4', true);
    setAllowedParty(source, 'G3', 'P1', false);
    setVoteWeight(source, 'G3', 'P1', '20');
    setRule(source, 'seatCount', '100');
    setMajorityMode(source, 'override');
    rebalanceShares(source, ['G1']);
    rebalanceWeights(source, 'G3', ['P3']);
    expect(source).toEqual(copy);
  });

  it('keeps unknown top-level fields of the draft', () => {
    const value = draft({ ...section8Input(), extra: 'kept' });
    expect(renameEntity(value, 'group', 'G1', 'x').extra).toBe('kept');
  });

  it('uses exact arithmetic only', () => {
    expect(editSource).not.toMatch(
      /\b(parseFloat|parseInt|toFixed|toPrecision|Math)\b|\bNumber\(/,
    );
  });

  it('refuses to delete a positive-share party even with a repair', () => {
    const value = draft(partyModeInput([['1', '1']]));
    expect(
      codeOf(() => deleteEntity(value, 'party', 'P1', { mode: 'remove' })),
    ).toBe('party-share-in-use');
  });

  it('deletes a zero-share party while repairing coalition references', () => {
    const input = partyModeInput([
      ['1', '1'],
      ['0', '1'],
    ]);
    const value = draft({
      ...input,
      coalitionRules: {
        ...(input.coalitionRules as Json),
        partyRefusals: [['P1', 'P2']],
      },
    });
    const next = deleteEntity(value, 'party', 'P2', { mode: 'remove' });
    expect(next.parties.map((party) => party.id)).toEqual(['P1']);
    expect(next.coalitionRules.partyRefusals).toEqual([]);
    expect(issueCodes(next)).toEqual([]);
  });

  it('refuses to delete a group used by a known party composition', () => {
    const input = partyModeInput([['1', '1']]);
    const value = draft({
      ...input,
      groups: [
        {
          id: 'G1',
          name: 'Group',
          notes: '',
          growthRate: '0',
          turnout: '1',
          turnoutChange: '0',
        },
      ],
      parties: [
        {
          ...(input.parties as Json[])[0],
          composition: { G1: { numerator: '1', denominator: '1' } },
        },
      ],
    });
    expect(codeOf(() => deleteEntity(value, 'group', 'G1'))).toBe(
      'group-composition-in-use',
    );
  });

  it('removes zero-valued composition keys when deleting a group', () => {
    const input = partyModeInput([['1', '1']]);
    const value = draft({
      ...input,
      groups: [
        {
          id: 'G1',
          name: 'Kept',
          notes: '',
          growthRate: '0',
          turnout: '1',
          turnoutChange: '0',
        },
        {
          id: 'G2',
          name: 'Removed',
          notes: '',
          growthRate: '0',
          turnout: '1',
          turnoutChange: '0',
        },
      ],
      parties: [
        {
          ...(input.parties as Json[])[0],
          composition: {
            G1: { numerator: '1', denominator: '1' },
            G2: { numerator: '0', denominator: '1' },
          },
        },
      ],
    });
    const next = deleteEntity(value, 'group', 'G2');
    expect(entity(next, 'party', 'P1').composition).toEqual({
      G1: { numerator: '1', denominator: '1' },
    });
    expect(issueCodes(next)).toEqual([]);
  });
});

function group(value: Draft, id: string): Json {
  return entity(value, 'group', id);
}

function rules(value: Draft): Json {
  return value.rules as Json;
}

describe('group fractions', () => {
  it.each([
    ['populationShare', '38', '0.38'],
    ['turnout', '42,5', '0.425'],
    ['validBallotRate', '99.5', '0.995'],
    ['participationFactor', '100', '1'],
  ] as const)('stores %s from percent text exactly', (field, text, stored) => {
    const next = setGroupFraction(draft(), 'G3', field, text);
    expect(group(next, 'G3')[field]).toBe(stored);
    expect(group(next, 'G1')).toEqual(group(draft(), 'G1'));
  });

  it('keeps unparseable text so validation can show it', () => {
    const next = setGroupFraction(draft(), 'G3', 'turnout', '12.');
    expect(group(next, 'G3').turnout).toBe('12.');
    expect(issueCodes(next)).toContain('invalid-decimal');
  });

  it('rejects an unknown group', () => {
    expect(() => setGroupFraction(draft(), 'G9', 'turnout', '1')).toThrow(
      EditError,
    );
  });

  it('limits party-mode group edits to demographic assumptions', () => {
    const raw = partyModeInput([['1', '1']]);
    const value = draft({
      ...raw,
      groups: [
        {
          id: 'G1',
          name: 'Group',
          notes: '',
          growthRate: '0',
          turnout: '1',
          turnoutChange: '0',
        },
      ],
    });
    expect(
      setGroupFraction(value, 'G1', 'turnout', '50').groups[0]!.turnout,
    ).toBe('0.5');
    expect(
      setGroupFraction(value, 'G1', 'growthRate', '2').groups[0]!.growthRate,
    ).toBe('0.02');
    expect(
      setGroupFraction(value, 'G1', 'turnoutChange', '2').groups[0]!
        .turnoutChange,
    ).toBe('0.02');
    expect(
      codeOf(() => setGroupFraction(value, 'G1', 'populationShare', '50')),
    ).toBe('party-mode-unsupported');
    expect(codeOf(() => setVotingMode(value, 'G1', 'open'))).toBe(
      'party-mode-unsupported',
    );
    expect(codeOf(() => setAllowedParty(value, 'G1', 'P1', true))).toBe(
      'party-mode-unsupported',
    );
    expect(codeOf(() => setVoteWeight(value, 'G1', 'P1', '50'))).toBe(
      'party-mode-unsupported',
    );
    expect(codeOf(() => rebalanceShares(value, []))).toBe(
      'party-mode-unsupported',
    );
    expect(codeOf(() => rebalanceWeights(value, 'G1', []))).toBe(
      'party-mode-unsupported',
    );
    expect(codeOf(() => turnoutCohorts(value, 'party', 'P1'))).toBe(
      'party-mode-unsupported',
    );
    expect(codeOf(() => setCohortTurnout(value, ['G1'], '50'))).toBe(
      'party-mode-unsupported',
    );
  });
});

describe('group change fields', () => {
  it('lists growth and turnout change in editor order', () => {
    expect(GROUP_CHANGE_FIELDS).toEqual(['growthRate', 'turnoutChange']);
  });

  it.each([
    ['growthRate', '2', '0.02'],
    ['growthRate', '-2,5', '-0.025'],
    ['growthRate', '-100', '-1'],
    ['turnoutChange', '1', '0.01'],
    ['turnoutChange', '-0.5', '-0.005'],
    ['turnoutChange', '0', '0'],
  ] as const)('stores %s from %j as %j', (field, text, stored) => {
    const next = setGroupFraction(draft(), 'G3', field, text);
    expect(group(next, 'G3')[field]).toBe(stored);
    expect(group(next, 'G1')).toEqual(group(draft(), 'G1'));
    expect(validateScenario(next).ok).toBe(true);
  });

  it('keeps a lone minus sign for validation to show', () => {
    const next = setGroupFraction(draft(), 'G3', 'growthRate', '-');
    expect(group(next, 'G3').growthRate).toBe('-');
    expect(issueCodes(next)).toContain('invalid-decimal');
  });

  it('lets validation refuse a change beyond 100 percent a year', () => {
    const next = setGroupFraction(draft(), 'G3', 'turnoutChange', '150');
    expect(group(next, 'G3').turnoutChange).toBe('1.5');
    expect(issueCodes(next)).toContain('out-of-range');
  });
});

describe('voting mode and destinations', () => {
  it('switches mode without touching destinations', () => {
    const next = setVotingMode(splitDraft(), 'G3', 'restricted');
    expect(group(next, 'G3').votingMode).toBe('restricted');
    expect(group(next, 'G3').allowedPartyIds).toEqual(['P3', 'P1', 'P2']);
    expect(group(next, 'G3').voteWeights).toEqual({
      P3: '0.6',
      P1: '0.3',
      P2: '0.1',
    });
    expect(issueCodes(next)).toContain('restricted-mixed-blocks');
  });

  it('allows a party with weight zero, once', () => {
    const next = setAllowedParty(draft(), 'G1', 'P2', true);
    expect(group(next, 'G1').allowedPartyIds).toEqual(['P1', 'P2']);
    expect(group(next, 'G1').voteWeights).toEqual({ P1: '1', P2: '0' });
    expect(setAllowedParty(next, 'G1', 'P2', true)).toEqual(next);
  });

  it('disallowing a party drops its weight and the total shows the gap', () => {
    const next = setAllowedParty(splitDraft(), 'G3', 'P1', false);
    expect(group(next, 'G3').allowedPartyIds).toEqual(['P3', 'P2']);
    expect(group(next, 'G3').voteWeights).toEqual({ P3: '0.6', P2: '0.1' });
    expect(issueCodes(next)).toContain('invalid-total');
  });

  it('rejects an unknown party', () => {
    expect(() => setAllowedParty(draft(), 'G1', 'P9', true)).toThrow(EditError);
  });

  it('sets a weight from percent text, keeping key order', () => {
    const next = setVoteWeight(splitDraft(), 'G3', 'P1', '25');
    expect(Object.entries(group(next, 'G3').voteWeights as Json)).toEqual([
      ['P3', '0.6'],
      ['P1', '0.25'],
      ['P2', '0.1'],
    ]);
  });

  it('keeps an unparseable weight as text', () => {
    const next = setVoteWeight(splitDraft(), 'G3', 'P1', 'abc');
    expect((group(next, 'G3').voteWeights as Json).P1).toBe('abc');
  });

  it('refuses a weight for a party that is not allowed', () => {
    expect(() => setVoteWeight(draft(), 'G1', 'P2', '10')).toThrow(EditError);
  });

  it('reproduces the 60/30/10 split through editor operations', () => {
    let next = setVotingMode(draft(), 'G3', 'open');
    next = setAllowedParty(next, 'G3', 'P1', true);
    next = setAllowedParty(next, 'G3', 'P2', true);
    next = setVoteWeight(next, 'G3', 'P3', '60');
    next = setVoteWeight(next, 'G3', 'P1', '30');
    next = setVoteWeight(next, 'G3', 'P2', '10');
    expect(serialized(next)).toBe(serialized(splitDraft()));
  });
});

describe('rules', () => {
  it.each([
    ['seatCount', '100', 100],
    ['seatCount', ' 121 ', 121],
    ['seatCount', 'abc', 'abc'],
    ['majorityOverride', '61', 61],
    ['threshold', '3,25', '0.0325'],
    ['threshold', '5%', '5%'],
    ['populationTotal', '2000000', '2000000'],
    ['populationTotal', ' 1500000.5 ', '1500000.5'],
    ['populationTotal', 'x', 'x'],
  ] as const)('sets %s from %j', (field, text, stored) => {
    expect(rules(setRule(draft(), field, text))[field]).toBe(stored);
  });

  it('keeps the other rules', () => {
    const next = setRule(draft(), 'threshold', '2');
    expect({ ...rules(next), threshold: '0' }).toEqual(rules(draft()));
  });

  it('switches to an override at a simple majority', () => {
    const next = setMajorityMode(draft(), 'override');
    expect(rules(next).majorityMode).toBe('override');
    expect(rules(next).majorityOverride).toBe(61);
    expect(issueCodes(next)).toEqual([]);
    const odd = setMajorityMode(
      setRule(draft(), 'seatCount', '121'),
      'override',
    );
    expect(rules(odd).majorityOverride).toBe(61);
  });

  it('keeps an existing override and clears it for the default mode', () => {
    const custom = setRule(
      setMajorityMode(draft(), 'override'),
      'majorityOverride',
      '70',
    );
    expect(rules(setMajorityMode(custom, 'override')).majorityOverride).toBe(
      70,
    );
    const back = setMajorityMode(custom, 'default');
    expect(rules(back).majorityMode).toBe('default');
    expect(rules(back).majorityOverride).toBeNull();
    expect(issueCodes(back)).toEqual([]);
  });
});

describe('rebalance', () => {
  it('rescales unlocked shares to exactly 100%', () => {
    const before = setGroupFraction(draft(), 'G1', 'populationShare', '48');
    const next = rebalanceShares(before, ['G1']);
    expect(next).not.toBeNull();
    const shares = entities(next!, 'group').map(
      (item) => item.populationShare as string,
    );
    expect(shares[0]).toBe('0.48');
    expect(issueCodes(next!)).toEqual([]);
    expect(shares[1]).toBe('0.352258064516129032');
  });

  it('refuses when locked shares exceed 100%', () => {
    let before = setGroupFraction(draft(), 'G1', 'populationShare', '48');
    before = setGroupFraction(before, 'G2', 'populationShare', '60');
    expect(rebalanceShares(before, ['G1', 'G2'])).toBeNull();
  });

  it("rescales one group's weights over its allowed parties", () => {
    const before = setVoteWeight(splitDraft(), 'G3', 'P3', '70');
    const next = rebalanceWeights(before, 'G3', ['P3']);
    expect(group(next!, 'G3').voteWeights).toEqual({
      P3: '0.7',
      P1: '0.225',
      P2: '0.075',
    });
    expect(group(next!, 'G1')).toEqual(group(before, 'G1'));
  });

  it('counts an allowed party without a weight as zero', () => {
    const before = setAllowedParty(draft(), 'G1', 'P2', true);
    const next = rebalanceWeights(before, 'G1', ['P1']);
    expect(group(next!, 'G1').voteWeights).toEqual({ P1: '1', P2: '0' });
  });

  it('refuses when every weight is locked', () => {
    expect(rebalanceWeights(splitDraft(), 'G3', ['P3', 'P1', 'P2'])).toBeNull();
  });
});

describe('coalition pair edits', () => {
  function pairList(value: Draft, list: string): unknown {
    return value.coalitionRules[list];
  }

  it('names the four pair lists', () => {
    expect(PAIR_LISTS).toEqual([
      'incompatiblePartyPairs',
      'incompatibleBlockPairs',
      'compatiblePartyOverrides',
      'partyRefusals',
    ]);
  });

  it('appends a party pair in persisted party order', () => {
    const next = addPair(draft(), 'incompatiblePartyPairs', 'P4', 'P2');
    expect(pairList(next, 'incompatiblePartyPairs')).toEqual([
      ['P1', 'P2'],
      ['P2', 'P4'],
    ]);
    expect(issueCodes(next)).toEqual([]);
  });

  it('appends a block pair in persisted block order', () => {
    const next = addPair(draft(), 'incompatibleBlockPairs', 'B3', 'B1');
    expect(pairList(next, 'incompatibleBlockPairs')).toEqual([['B1', 'B3']]);
    expect(issueCodes(next)).toEqual([]);
  });

  it('adds an override for a block-derived pair', () => {
    const base = addPair(draft(), 'incompatibleBlockPairs', 'B1', 'B3');
    const next = addPair(base, 'compatiblePartyOverrides', 'P3', 'P1');
    expect(pairList(next, 'compatiblePartyOverrides')).toEqual([['P1', 'P3']]);
    expect(issueCodes(next)).toEqual([]);
  });

  it('changes nothing but the target list', () => {
    const before = draft();
    const next = addPair(before, 'incompatiblePartyPairs', 'P3', 'P4');
    expect({ ...next, coalitionRules: before.coalitionRules }).toEqual(before);
    expect(pairList(next, 'incompatibleBlockPairs')).toEqual(
      pairList(before, 'incompatibleBlockPairs'),
    );
  });

  it.each([
    ['a self pair', 'incompatiblePartyPairs', 'P1', 'P1'],
    ['a duplicate', 'incompatiblePartyPairs', 'P1', 'P2'],
    ['a reversed duplicate', 'incompatiblePartyPairs', 'P2', 'P1'],
    ['an override of an explicit pair', 'compatiblePartyOverrides', 'P2', 'P1'],
  ] as const)('refuses %s', (_label, list, first, second) => {
    expect(codeOf(() => addPair(draft(), list, first, second))).toBe(
      'invalid-pair',
    );
  });

  it('refuses an explicit pair that is already an override', () => {
    const base = addPair(
      addPair(draft(), 'incompatibleBlockPairs', 'B3', 'B4'),
      'compatiblePartyOverrides',
      'P3',
      'P4',
    );
    expect(
      codeOf(() => addPair(base, 'incompatiblePartyPairs', 'P4', 'P3')),
    ).toBe('invalid-pair');
  });

  it.each([
    ['incompatiblePartyPairs', 'P1', 'P9'],
    ['incompatiblePartyPairs', 'P1', 'B2'],
    ['incompatibleBlockPairs', 'B1', 'P2'],
    ['compatiblePartyOverrides', 'B1', 'B2'],
  ] as const)('refuses unknown IDs in %s (%s, %s)', (list, first, second) => {
    expect(codeOf(() => addPair(draft(), list, first, second))).toBe(
      'unknown-entity',
    );
  });

  it('refuses a pair beyond the list limit', () => {
    const base = draft();
    const full = {
      ...base,
      coalitionRules: {
        ...base.coalitionRules,
        incompatibleBlockPairs: Array.from({ length: LIMITS.pairs }, () => [
          'B1',
          'B2',
        ]),
      },
    };
    expect(
      codeOf(() => addPair(full, 'incompatibleBlockPairs', 'B3', 'B4')),
    ).toBe('limit-reached');
  });

  it('removes a pair by index and keeps the rest in order', () => {
    const base = addPair(
      addPair(draft(), 'incompatiblePartyPairs', 'P2', 'P3'),
      'incompatiblePartyPairs',
      'P3',
      'P4',
    );
    const next = removePair(base, 'incompatiblePartyPairs', 1);
    expect(pairList(next, 'incompatiblePartyPairs')).toEqual([
      ['P1', 'P2'],
      ['P3', 'P4'],
    ]);
  });

  it.each([-1, 1, 1.5])('refuses to remove index %s', (index) => {
    expect(
      codeOf(() => removePair(draft(), 'incompatiblePartyPairs', index)),
    ).toBe('invalid-pair');
  });

  it('never mutates its input', () => {
    const before = draft();
    const copy = frozenCopy(before);
    addPair(before, 'incompatiblePartyPairs', 'P3', 'P4');
    removePair(before, 'incompatiblePartyPairs', 0);
    expect(before).toEqual(copy);
  });

  it('changes the coalition result only through the rules', () => {
    const before = draft();
    const next = removePair(before, 'incompatiblePartyPairs', 0);
    const validation = validateScenario(next);
    if (!validation.ok) {
      throw new Error('expected a valid scenario');
    }
    const result = runScenario(validation.scenario);
    expect(result.coalitions.forbiddenPairs).toEqual([]);
    expect(serialized(next)).not.toBe(serialized(before));
  });

  it('keeps the direction of a refusal', () => {
    const next = addPair(draft(), 'partyRefusals', 'P4', 'P2');
    expect(pairList(next, 'partyRefusals')).toEqual([['P4', 'P2']]);
    expect(pairList(next, 'incompatiblePartyPairs')).toEqual([['P1', 'P2']]);
    expect(issueCodes(next)).toEqual([]);
  });

  it('records the reverse refusal as a separate answer', () => {
    const next = addPair(
      addPair(draft(), 'partyRefusals', 'P4', 'P2'),
      'partyRefusals',
      'P2',
      'P4',
    );
    expect(pairList(next, 'partyRefusals')).toEqual([
      ['P4', 'P2'],
      ['P2', 'P4'],
    ]);
    expect(issueCodes(next)).toEqual([]);
  });

  it('accepts a refusal of a pair that is explicitly incompatible, and the reverse', () => {
    const refused = addPair(draft(), 'partyRefusals', 'P2', 'P1');
    expect(pairList(refused, 'partyRefusals')).toEqual([['P2', 'P1']]);
    expect(issueCodes(refused)).toEqual([]);
    const both = addPair(
      addPair(
        removePair(draft(), 'incompatiblePartyPairs', 0),
        'partyRefusals',
        'P1',
        'P2',
      ),
      'incompatiblePartyPairs',
      'P2',
      'P1',
    );
    expect(pairList(both, 'incompatiblePartyPairs')).toEqual([['P1', 'P2']]);
    expect(issueCodes(both)).toEqual([]);
  });

  it.each([
    ['a self refusal', 'P1', 'P1'],
    ['the same refusal twice', 'P4', 'P2'],
  ] as const)('refuses %s', (_label, first, second) => {
    const base = addPair(draft(), 'partyRefusals', 'P4', 'P2');
    expect(codeOf(() => addPair(base, 'partyRefusals', first, second))).toBe(
      'invalid-pair',
    );
  });

  it.each([
    ['P3', 'P4'],
    ['P4', 'P3'],
  ] as const)(
    'refuses a refusal %s-%s of an overridden pair',
    (first, second) => {
      const base = addPair(
        addPair(draft(), 'incompatibleBlockPairs', 'B3', 'B4'),
        'compatiblePartyOverrides',
        'P3',
        'P4',
      );
      expect(codeOf(() => addPair(base, 'partyRefusals', first, second))).toBe(
        'invalid-pair',
      );
    },
  );

  it.each([
    ['P3', 'P4'],
    ['P4', 'P3'],
  ] as const)(
    'refuses an override %s-%s of a refused pair',
    (first, second) => {
      const base = addPair(
        addPair(draft(), 'incompatibleBlockPairs', 'B3', 'B4'),
        'partyRefusals',
        'P4',
        'P3',
      );
      expect(
        codeOf(() => addPair(base, 'compatiblePartyOverrides', first, second)),
      ).toBe('invalid-pair');
    },
  );

  it.each([
    ['P1', 'P9'],
    ['B1', 'P2'],
  ] as const)('refuses an unknown refusal %s-%s', (first, second) => {
    expect(codeOf(() => addPair(draft(), 'partyRefusals', first, second))).toBe(
      'unknown-entity',
    );
  });

  it('removes a refusal by index and keeps the rest in order', () => {
    const base = addPair(
      addPair(
        addPair(draft(), 'partyRefusals', 'P4', 'P2'),
        'partyRefusals',
        'P2',
        'P4',
      ),
      'partyRefusals',
      'P3',
      'P1',
    );
    expect(
      pairList(removePair(base, 'partyRefusals', 1), 'partyRefusals'),
    ).toEqual([
      ['P4', 'P2'],
      ['P3', 'P1'],
    ]);
  });
});

/** Section 8 with group 1 split 70 / 30 between party 1 and party 5, both in block 1. */
function multiBlockDraft(): Draft {
  const input = section8Input();
  const parties = input.parties as Json[];
  return draft({
    ...input,
    groups: (input.groups as Json[]).map((group) =>
      group.id === 'G1'
        ? {
            ...group,
            allowedPartyIds: ['P1', 'P5'],
            voteWeights: { P1: '0.7', P5: '0.3' },
          }
        : group,
    ),
    parties: [
      ...parties,
      { ...parties[0], id: 'P5', name: 'Party 5', tieBreakOrder: 5 },
    ],
  });
}

function withGroup(value: Draft, id: string, fields: Json): Draft {
  return draft({
    ...value,
    groups: entities(value, 'group').map((item) =>
      item.id === id ? { ...item, ...fields } : item,
    ),
  });
}

function seatList(value: Draft): number[] {
  const validation = validateScenario(value);
  if (!validation.ok) {
    throw new Error(JSON.stringify(validation.issues));
  }
  return runScenario(validation.scenario).allocation.parties.map(
    (party) => party.seats,
  );
}

const ONLY = (id: string) => ({ dedicated: [id], shared: [] });
const NONE = { dedicated: [], shared: [] };

describe('turnout cohorts', () => {
  it.each([1, 2, 3, 4])(
    'finds the one dedicated group of Section 8 party and block %i',
    (n) => {
      expect(turnoutCohorts(draft(), 'party', `P${n}`)).toEqual(ONLY(`G${n}`));
      expect(turnoutCohorts(draft(), 'block', `B${n}`)).toEqual(ONLY(`G${n}`));
    },
  );

  it('lists an open group that also votes elsewhere as shared', () => {
    const split = splitDraft();
    expect(turnoutCohorts(split, 'party', 'P1')).toEqual({
      dedicated: ['G1'],
      shared: ['G3'],
    });
    expect(turnoutCohorts(split, 'party', 'P2')).toEqual({
      dedicated: ['G2'],
      shared: ['G3'],
    });
    expect(turnoutCohorts(split, 'party', 'P3')).toEqual({
      dedicated: [],
      shared: ['G3'],
    });
    expect(turnoutCohorts(split, 'party', 'P4')).toEqual(ONLY('G4'));
    expect(turnoutCohorts(split, 'block', 'B1')).toEqual({
      dedicated: ['G1'],
      shared: ['G3'],
    });
    expect(turnoutCohorts(split, 'block', 'B3')).toEqual({
      dedicated: [],
      shared: ['G3'],
    });
  });

  it('lists a group once when it feeds two parties of one block', () => {
    const multi = multiBlockDraft();
    expect(turnoutCohorts(multi, 'block', 'B1')).toEqual(ONLY('G1'));
    expect(turnoutCohorts(multi, 'party', 'P1')).toEqual({
      dedicated: [],
      shared: ['G1'],
    });
    expect(turnoutCohorts(multi, 'party', 'P5')).toEqual({
      dedicated: [],
      shared: ['G1'],
    });
  });

  it('does not count a destination whose weight is exactly zero', () => {
    const ticked = setAllowedParty(draft(), 'G1', 'P3', true);
    expect(turnoutCohorts(ticked, 'party', 'P3')).toEqual(ONLY('G3'));
    expect(turnoutCohorts(ticked, 'party', 'P1')).toEqual(ONLY('G1'));
    const zeros = withGroup(ticked, 'G1', {
      voteWeights: { P1: '1', P3: '0.000' },
    });
    expect(turnoutCohorts(zeros, 'party', 'P3')).toEqual(ONLY('G3'));
  });

  it('counts the smallest positive weight', () => {
    const tiny = withGroup(setAllowedParty(draft(), 'G1', 'P3', true), 'G1', {
      voteWeights: { P1: '0.999999999999999999', P3: '0.000000000000000001' },
    });
    expect(turnoutCohorts(tiny, 'party', 'P3')).toEqual({
      dedicated: ['G3'],
      shared: ['G1'],
    });
    expect(turnoutCohorts(tiny, 'party', 'P1')).toEqual({
      dedicated: [],
      shared: ['G1'],
    });
  });

  it.each([
    ['text', 'abc'],
    ['missing', undefined],
    ['a number', 0],
  ])('counts an unreadable weight (%s) as a vote', (_, weight) => {
    const voteWeights: Json = { P1: '1' };
    if (weight !== undefined) {
      voteWeights.P3 = weight;
    }
    const value = withGroup(draft(), 'G1', {
      allowedPartyIds: ['P1', 'P3'],
      voteWeights,
    });
    expect(turnoutCohorts(value, 'party', 'P3')).toEqual({
      dedicated: ['G3'],
      shared: ['G1'],
    });
  });

  it('ignores a weight for a party that is not an allowed destination', () => {
    const value = withGroup(draft(), 'G1', {
      voteWeights: { P1: '1', P3: '0.5' },
    });
    expect(turnoutCohorts(value, 'party', 'P3')).toEqual(ONLY('G3'));
    expect(turnoutCohorts(value, 'party', 'P1')).toEqual(ONLY('G1'));
  });

  it('ignores a destination that names no party', () => {
    const value = withGroup(draft(), 'G1', {
      allowedPartyIds: ['P1', 'P9'],
      voteWeights: { P1: '1', P9: '0.2' },
    });
    expect(turnoutCohorts(value, 'party', 'P1')).toEqual(ONLY('G1'));
    expect(turnoutCohorts(value, 'block', 'B1')).toEqual(ONLY('G1'));
  });

  it('follows group order, not party order', () => {
    const joined = setPartyBlock(draft(), 'P2', 'B1');
    expect(turnoutCohorts(joined, 'block', 'B1')).toEqual({
      dedicated: ['G1', 'G2'],
      shared: [],
    });
    const moved = moveEntity(joined, 'group', 'G2', -1);
    expect(turnoutCohorts(moved, 'block', 'B1')).toEqual({
      dedicated: ['G2', 'G1'],
      shared: [],
    });
  });

  it('finds no cohort for a party no group votes for', () => {
    const silent = withGroup(draft(), 'G3', { voteWeights: { P3: '0' } });
    expect(turnoutCohorts(silent, 'party', 'P3')).toEqual(NONE);
    expect(turnoutCohorts(silent, 'block', 'B3')).toEqual(NONE);
    const added = addEntity(draft(), 'party', 'Party 5');
    expect(turnoutCohorts(added, 'party', ids(added, 'party').at(-1)!)).toEqual(
      NONE,
    );
  });

  it('finds no cohort for a block without parties', () => {
    const emptied = setPartyBlock(draft(), 'P2', null);
    expect(turnoutCohorts(emptied, 'block', 'B2')).toEqual(NONE);
    expect(turnoutCohorts(emptied, 'party', 'P2')).toEqual(ONLY('G2'));
  });

  it('rejects an unknown party or block', () => {
    expect(codeOf(() => turnoutCohorts(draft(), 'party', 'P9'))).toBe(
      'unknown-entity',
    );
    expect(codeOf(() => turnoutCohorts(draft(), 'block', 'B9'))).toBe(
      'unknown-entity',
    );
    expect(codeOf(() => turnoutCohorts(draft(), 'party', 'B1'))).toBe(
      'unknown-entity',
    );
  });

  it('lists each group at most once and never as both kinds', () => {
    for (const value of [draft(), splitDraft(), multiBlockDraft()]) {
      for (const kind of ['party', 'block'] as const) {
        for (const id of ids(value, kind)) {
          const { dedicated, shared } = turnoutCohorts(value, kind, id);
          const all = [...dedicated, ...shared];
          expect(new Set(all).size).toBe(all.length);
        }
      }
    }
  });

  it('follows the current weights with no stored state', () => {
    const after = setVoteWeight(
      setVoteWeight(splitDraft(), 'G3', 'P1', '0'),
      'G3',
      'P2',
      '0',
    );
    expect(turnoutCohorts(after, 'party', 'P3')).toEqual(ONLY('G3'));
    expect(turnoutCohorts(after, 'party', 'P1')).toEqual(ONLY('G1'));
  });

  it('never mutates its input', () => {
    const before = splitDraft();
    const copy = frozenCopy(before);
    turnoutCohorts(before, 'block', 'B1');
    turnoutCohorts(before, 'party', 'P3');
    expect(before).toEqual(copy);
  });
});

describe('cohort turnout edit', () => {
  it('sets the turnout of each listed group exactly', () => {
    const next = setCohortTurnout(draft(), ['G1', 'G2'], '70');
    expect(group(next, 'G1').turnout).toBe('0.7');
    expect(group(next, 'G2').turnout).toBe('0.7');
    expect(group(next, 'G3')).toEqual(group(draft(), 'G3'));
    expect(group(next, 'G4')).toEqual(group(draft(), 'G4'));
  });

  it('equals the same edits made group by group', () => {
    const bulk = setCohortTurnout(splitDraft(), ['G1', 'G4'], '42,5');
    const single = setGroupFraction(
      setGroupFraction(splitDraft(), 'G1', 'turnout', '42,5'),
      'G4',
      'turnout',
      '42,5',
    );
    expect(bulk).toEqual(single);
  });

  it('applies a repeated group once', () => {
    expect(setCohortTurnout(draft(), ['G1', 'G1'], '50')).toEqual(
      setCohortTurnout(draft(), ['G1'], '50'),
    );
  });

  it('gives the same draft when applied twice', () => {
    const once = setCohortTurnout(draft(), ['G2', 'G3'], '61.5');
    expect(setCohortTurnout(once, ['G2', 'G3'], '61.5')).toEqual(once);
  });

  it.each([
    ['0', '0'],
    ['100', '1'],
    ['42,5', '0.425'],
    [' 7 ', '0.07'],
    ['42.65233', '0.4265233'],
  ])('accepts %j and stores %s', (text, stored) => {
    expect(group(setCohortTurnout(draft(), ['G3'], text), 'G3').turnout).toBe(
      stored,
    );
  });

  it.each([
    '',
    'abc',
    '-1',
    '-0.0000000000000001',
    '100.0000000000000001',
    '101',
    '12.',
    '5%',
  ])('refuses %j', (text) => {
    expect(codeOf(() => setCohortTurnout(draft(), ['G1'], text))).toBe(
      'invalid-turnout',
    );
  });

  it('rejects an unknown group', () => {
    expect(codeOf(() => setCohortTurnout(draft(), ['G1', 'G9'], '50'))).toBe(
      'unknown-entity',
    );
  });

  it('returns an equal draft for an empty list', () => {
    expect(setCohortTurnout(draft(), [], '50')).toEqual(draft());
  });

  it('leaves shared groups at their own turnout', () => {
    const split = splitDraft();
    const next = setCohortTurnout(
      split,
      turnoutCohorts(split, 'block', 'B1').dedicated,
      '50',
    );
    expect(group(next, 'G1').turnout).toBe('0.5');
    expect(group(next, 'G3').turnout).toBe(group(split, 'G3').turnout);
  });

  it('gives the zero-turnout seats through the Party 3 shortcut', () => {
    const base = draft();
    const next = setCohortTurnout(
      base,
      turnoutCohorts(base, 'party', 'P3').dedicated,
      '0',
    );
    expect(serialized(next)).toBe(serialized(draft(section8Input('0'))));
    expect(seatList(next)).toEqual([54, 59, 0, 7]);
  });

  it('changes a group that feeds two block parties once, not twice', () => {
    const multi = multiBlockDraft();
    const viaBlock = setCohortTurnout(
      multi,
      turnoutCohorts(multi, 'block', 'B1').dedicated,
      '50',
    );
    expect(group(viaBlock, 'G1').turnout).toBe('0.5');
    expect(serialized(viaBlock)).toBe(
      serialized(setGroupFraction(multi, 'G1', 'turnout', '50')),
    );
  });

  it('keeps the result through a JSON round trip', () => {
    const next = setCohortTurnout(draft(), ['G3'], '42.65233');
    const validation = validateScenario(next);
    if (!validation.ok) {
      throw new Error('expected a valid scenario');
    }
    const reread = parseScenarioJson(serializeScenario(validation.scenario));
    if (!reread.ok) {
      throw new Error('expected the export to import');
    }
    expect(serializeResult(runScenario(reread.scenario))).toBe(
      serialized(next),
    );
  });

  it('never mutates its input', () => {
    const before = draft();
    const copy = frozenCopy(before);
    setCohortTurnout(before, ['G1', 'G2'], '10');
    expect(before).toEqual(copy);
  });
});
