import { describe, expect, it } from 'vitest';
import { runScenario, runSeats, serializeResult } from '../../src/engine/run';
import {
  LIMITS,
  MAX_PARTY_DENOMINATOR_DIGITS,
  SCHEMA_VERSION,
  parseScenarioJson,
  serializeScenario,
  validateScenario,
  type Scenario,
  type ValidationResult,
} from '../../src/engine/schema';
import {
  buildScenario,
  groupInput,
  partyModeBudgetCompositionInput,
  partyModeBudgetExpansionInput,
  partyModeInput,
  partyInput,
  rulesInput,
  scenarioInput,
  section8Input,
} from './helpers/scenarios';

type Json = Record<string, unknown>;

function validInput(): Json {
  return {
    schemaVersion: SCHEMA_VERSION,
    inputMode: 'groups',
    id: 'scenario-1',
    name: 'Example',
    notes: '',
    rules: {
      populationTotal: '1000000',
      seatCount: 120,
      majorityMode: 'default',
      majorityOverride: null,
      threshold: '0',
      allocationMethod: 'hamilton',
    },
    groups: [
      {
        id: 'G1',
        name: 'Open cohort',
        notes: '',
        populationShare: '0.6',
        growthRate: '0.015',
        turnout: '0.7',
        turnoutChange: '-0.005',
        validBallotRate: '1',
        participationFactor: '1',
        votingMode: 'open',
        allowedPartyIds: ['P1', 'P3', 'P4'],
        voteWeights: { P1: '0.6', P3: '0.3', P4: '0.1' },
      },
      {
        id: 'G2',
        name: 'Restricted cohort',
        notes: '',
        populationShare: '0.4',
        growthRate: '0',
        turnout: '0.5',
        turnoutChange: '0',
        validBallotRate: '0.99',
        participationFactor: '1',
        votingMode: 'restricted',
        allowedPartyIds: ['P1', 'P2'],
        voteWeights: { P1: '0.5', P2: '0.5' },
      },
    ],
    parties: [
      party('P1', 'B1', 1),
      party('P2', 'B1', 2),
      party('P3', 'B2', 3),
      party('P4', null, 4),
    ],
    blocks: [
      { id: 'B1', name: 'Block 1', notes: '', color: '#112233' },
      { id: 'B2', name: 'Block 2', notes: '', color: '#a1B2c3' },
    ],
    coalitionRules: {
      incompatiblePartyPairs: [['P1', 'P3']],
      incompatibleBlockPairs: [],
      compatiblePartyOverrides: [],
      partyRefusals: [],
    },
  };
}

function party(
  id: string,
  blockId: string | null,
  tieBreakOrder: number,
): Json {
  return {
    id,
    name: `Party ${id}`,
    notes: '',
    color: '#445566',
    blockId,
    tieBreakOrder,
    canJoinGovernment: true,
  };
}

function at(value: Json, path: string): Json {
  let current: unknown = value;
  for (const key of path.split('.')) {
    current = (current as Record<string, unknown>)[key];
  }
  return current as Json;
}

function groupAt(value: Json, index: number): Json {
  return (value.groups as Json[])[index] as Json;
}

function partyAt(value: Json, index: number): Json {
  return (value.parties as Json[])[index] as Json;
}

function issues(result: ValidationResult): string[] {
  if (result.ok) {
    return [];
  }
  return result.issues.map((issue) => `${issue.path}:${issue.code}`);
}

function expectIssue(input: unknown, entry: string): void {
  const result = validateScenario(input);
  expect(result.ok).toBe(false);
  expect(issues(result)).toContain(entry);
}

function expectValid(input: unknown): void {
  const result = validateScenario(input);
  expect(issues(result)).toEqual([]);
  expect(result.ok).toBe(true);
}

describe('valid scenarios', () => {
  it('accepts a complete version 5 group scenario', () => {
    const input = validInput();
    const result = validateScenario(input);
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(SCHEMA_VERSION).toBe(5);
    expect(result.scenario).toEqual(input);
    expect(result.scenario).not.toBe(input);
  });

  it('drops unknown fields at every level', () => {
    const input = validInput();
    input.extra = 'x';
    at(input, 'rules').extra = 1;
    groupAt(input, 0).extra = true;
    partyAt(input, 0).extra = [];
    at(input, 'coalitionRules').extra = {};
    const result = validateScenario(input);
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.scenario).toEqual(validInput());
    expect(JSON.stringify(result.scenario)).not.toContain('extra');
  });

  it('ignores prototype keys from parsed JSON', () => {
    const text = JSON.stringify(validInput()).replace(
      '{"schemaVersion"',
      '{"__proto__":{"polluted":true},"schemaVersion"',
    );
    const result = parseScenarioJson(text);
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(JSON.stringify(result.scenario)).not.toContain('polluted');
    expect(({} as Json).polluted).toBeUndefined();
  });

  it('orders vote weights by allowed party order', () => {
    const input = validInput();
    groupAt(input, 0).voteWeights = { P4: '0.1', P1: '0.6', P3: '0.3' };
    const result = validateScenario(input);
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    if (result.scenario.inputMode !== 'groups') {
      throw new Error('expected a group-mode scenario');
    }
    expect(Object.keys(result.scenario.groups[0]?.voteWeights ?? {})).toEqual([
      'P1',
      'P3',
      'P4',
    ]);
  });

  it('accepts sparse weights that omit an allowed party', () => {
    const input = validInput();
    groupAt(input, 0).voteWeights = { P1: '0.7', P3: '0.3' };
    expectValid(input);
  });

  it('survives a JSON round trip unchanged', () => {
    const first = validateScenario(validInput());
    expect(first.ok).toBe(true);
    if (!first.ok) {
      return;
    }
    const text = JSON.stringify(first.scenario);
    const second = parseScenarioJson(text);
    expect(second.ok).toBe(true);
    if (!second.ok) {
      return;
    }
    expect(JSON.stringify(second.scenario)).toBe(text);
  });

  it('returns identical output on repeated validation', () => {
    const a = JSON.stringify(validateScenario(validInput()));
    const b = JSON.stringify(validateScenario(validInput()));
    expect(a).toBe(b);
  });

  it('allows duplicate tie-break order values', () => {
    const input = validInput();
    partyAt(input, 1).tieBreakOrder = 1;
    expectValid(input);
  });

  it('allows an open group to span blocks and a restricted group of unassigned parties', () => {
    const input = validInput();
    const restricted = groupAt(input, 1);
    (input.parties as Json[]).push(party('P5', null, 5));
    restricted.allowedPartyIds = ['P4', 'P5'];
    restricted.voteWeights = { P4: '0.5', P5: '0.5' };
    expectValid(input);
  });

  it('accepts a valid majority override and a fractional threshold', () => {
    const input = validInput();
    const rules = at(input, 'rules');
    rules.majorityMode = 'override';
    rules.majorityOverride = 70;
    rules.threshold = '0.0325';
    expectValid(input);
  });

  it('accepts empty names so new entities can start empty', () => {
    const input = validInput();
    partyAt(input, 0).name = '';
    expectValid(input);
  });

  it('accepts an override that lifts a block default', () => {
    const input = validInput();
    const rules = at(input, 'coalitionRules');
    rules.incompatibleBlockPairs = [['B1', 'B2']];
    rules.compatiblePartyOverrides = [['P2', 'P3']];
    expectValid(input);
  });
});

describe('version and structure', () => {
  it.each([null, [], 'scenario', 1])('rejects non-object root %j', (value) => {
    expectIssue(value, ':not-an-object');
  });

  it('rejects a future schema version and stops', () => {
    const input = validInput();
    input.schemaVersion = SCHEMA_VERSION + 1;
    input.groups = 'broken';
    const result = validateScenario(input);
    expect(issues(result)).toEqual(['schemaVersion:unsupported-version']);
  });

  it.each(['1', 0, 1.5])('rejects schema version %j', (version) => {
    const input = validInput();
    input.schemaVersion = version;
    expectIssue(input, 'schemaVersion:invalid-version');
  });

  it('reports a missing schema version', () => {
    const input = validInput();
    delete input.schemaVersion;
    expectIssue(input, 'schemaVersion:missing-field');
  });
});

describe('version 1 migration', () => {
  const GROUP_KEYS = [
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
  ];

  function versionOneInput(): Json {
    const input = validInput();
    input.schemaVersion = 1;
    for (const group of input.groups as Json[]) {
      delete group.growthRate;
      delete group.turnoutChange;
    }
    return input;
  }

  it('accepts a version 1 file and returns version 5 group mode', () => {
    const result = validateScenario(versionOneInput());
    expect(issues(result)).toEqual([]);
    if (!result.ok) {
      return;
    }
    expect(result.scenario.schemaVersion).toBe(5);
    expect(result.scenario.inputMode).toBe('groups');
  });

  it.each([1, 2])(
    'reads a version %i file without refusals as version 5 with none',
    (version) => {
      const input = versionOneInput();
      input.schemaVersion = version;
      delete at(input, 'coalitionRules').partyRefusals;
      const result = validateScenario(input);
      expect(issues(result)).toEqual([]);
      if (!result.ok) {
        return;
      }
      expect(result.scenario.schemaVersion).toBe(5);
      expect(result.scenario.inputMode).toBe('groups');
      expect(result.scenario.coalitionRules.partyRefusals).toEqual([]);
      expect(result.scenario.coalitionRules.incompatiblePartyPairs).toEqual([
        ['P1', 'P3'],
      ]);
    },
  );

  it('fills both new fields with zero in the documented key order', () => {
    const result = validateScenario(versionOneInput());
    if (!result.ok) {
      throw new Error('invalid');
    }
    for (const group of result.scenario.groups) {
      expect(Object.keys(group)).toEqual(GROUP_KEYS);
      expect(group.growthRate).toBe('0');
      expect(group.turnoutChange).toBe('0');
    }
  });

  it('keeps the same key order for a current file with the fields out of place', () => {
    const input = validInput();
    const group = groupAt(input, 0);
    const { growthRate, turnoutChange } = group;
    delete group.growthRate;
    delete group.turnoutChange;
    group.turnoutChange = turnoutChange;
    group.growthRate = growthRate;
    const result = validateScenario(input);
    if (!result.ok) {
      throw new Error('invalid');
    }
    expect(Object.keys(result.scenario.groups[0] ?? {})).toEqual(GROUP_KEYS);
    expect(result.scenario.groups[0]?.growthRate).toBe('0.015');
    expect(result.scenario.groups[0]?.turnoutChange).toBe('-0.005');
  });

  it('reads absent fields in a version 2 file as zero', () => {
    const input = versionOneInput();
    input.schemaVersion = 2;
    const result = validateScenario(input);
    if (!result.ok) {
      throw new Error('invalid');
    }
    expect(result.scenario.groups.map((group) => group.growthRate)).toEqual([
      '0',
      '0',
    ]);
  });

  it('gives a migrated file the same results as before', () => {
    const v1 = section8Input('0.37');
    v1.schemaVersion = 1;
    const migrated = buildScenario(v1);
    const current = buildScenario(section8Input('0.37'));
    expect(serializeResult(runScenario(migrated))).toBe(
      serializeResult(runScenario(current)),
    );
    expect(serializeScenario(migrated)).toBe(serializeScenario(current));
  });

  it('gives a version 2 file without refusals the same coalitions', () => {
    const v2 = section8Input('0');
    v2.schemaVersion = 2;
    delete at(v2, 'coalitionRules').partyRefusals;
    const migrated = buildScenario(v2);
    const current = buildScenario(section8Input('0'));
    expect(JSON.stringify(runScenario(migrated).coalitions)).toBe(
      JSON.stringify(runScenario(current).coalitions),
    );
    expect(serializeScenario(migrated)).toBe(serializeScenario(current));
  });

  it('exports a migrated file as version 5 group mode', () => {
    const text = serializeScenario(buildScenario(versionOneInput()));
    expect(text.startsWith('{\n  "schemaVersion": 5,')).toBe(true);
    expect(text).toContain('"inputMode": "groups"');
    expect(text).toContain('"partyRefusals": []');
    expect(text).toContain('"growthRate": "0"');
    expect(text).toContain('"turnoutChange": "0"');
  });
});

describe('version 4 party mode', () => {
  it('accepts a group-free scenario with exact non-terminating shares', () => {
    const result = validateScenario(
      partyModeInput([
        ['2', '6'],
        ['4', '6'],
      ]),
    );

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.scenario.schemaVersion).toBe(5);
    const scenario = result.scenario as unknown as Json;
    expect(scenario.inputMode).toBe('parties');
    expect(scenario.groups).toEqual([]);
    expect(
      (scenario.parties as Json[]).map((party) => party.voteShare),
    ).toEqual([
      { numerator: '1', denominator: '3' },
      { numerator: '2', denominator: '3' },
    ]);
    expect(
      (scenario.parties as Json[]).map((party) => party.composition),
    ).toEqual([null, null]);

    const expectedResult = serializeResult(runScenario(result.scenario));
    const parsed = parseScenarioJson(serializeScenario(result.scenario));
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.scenario).toEqual(result.scenario);
      expect(serializeResult(runScenario(parsed.scenario))).toBe(
        expectedResult,
      );
    }
  });

  it.each([1, 2, 3])(
    'migrates version %i group scenarios without changing results',
    (version) => {
      const input = section8Input('0.37');
      input.schemaVersion = version;
      const result = validateScenario(input);

      expect(result.ok).toBe(true);
      if (!result.ok) {
        return;
      }
      expect(result.scenario.schemaVersion).toBe(5);
      expect((result.scenario as unknown as Json).inputMode).toBe('groups');
      expect(serializeResult(runScenario(result.scenario))).toBe(
        serializeResult(runScenario(buildScenario(section8Input('0.37')))),
      );
    },
  );

  it('rejects party vote shares that do not sum exactly to one', () => {
    const result = validateScenario(
      partyModeInput([
        ['1', '3'],
        ['1', '3'],
      ]),
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(
        result.issues.some((issue) => issue.path.startsWith('parties')),
      ).toBe(true);
    }
  });

  it('rejects oversized exact-fraction components before calculation', () => {
    const input = partyModeInput([
      ['1', '1'],
      ['0', '1'],
    ]);
    const parties = input.parties as Json[];
    const first = parties[0] as Json;
    first.voteShare = {
      numerator: '9'.repeat(257),
      denominator: '9'.repeat(257),
    };
    const result = validateScenario(input);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(
        result.issues.some((issue) =>
          issue.path.startsWith('parties[0].voteShare'),
        ),
      ).toBe(true);
    }
  });

  it('rejects a party mode that exceeds the aggregate distinct-denominator budget', () => {
    const input = partyModeInput(
      Array.from({ length: 10 }, () => ['1', '10'] as const),
    );
    input.groups = [
      {
        id: 'G1',
        name: 'Group 1',
        notes: '',
        growthRate: '0',
        turnout: '1',
        turnoutChange: '0',
      },
      {
        id: 'G2',
        name: 'Group 2',
        notes: '',
        growthRate: '0',
        turnout: '1',
        turnoutChange: '0',
      },
    ];
    const parties = input.parties as Json[];
    parties.forEach((party, index) => {
      const denominator = `${index + 1}${'0'.repeat(255)}`;
      const complement = (BigInt(denominator) - 1n).toString();
      party.composition = {
        G1: { numerator: '1', denominator },
        G2: { numerator: complement, denominator },
      };
    });

    const result = validateScenario(input);

    expect(MAX_PARTY_DENOMINATOR_DIGITS).toBe(2048);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(
        result.issues.some(
          (issue) =>
            issue.code === 'too-long' && issue.path.includes('.composition.'),
        ),
      ).toBe(true);
    }
  });

  it('rejects party shares whose canonical denominators exceed the budget', () => {
    const input = partyModeBudgetExpansionInput(100);
    const result = validateScenario(input);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(
        result.issues.some(
          (issue) =>
            issue.code === 'too-long' &&
            issue.path.includes('.voteShare.denominator'),
        ),
      ).toBe(true);
    }
    expect(parseScenarioJson(JSON.stringify(input)).ok).toBe(false);
  });

  it('rejects compositions whose canonical denominators exceed the budget', () => {
    const paired = partyModeBudgetExpansionInput(100);
    const fractions = (paired.parties as Json[]).map(
      (party) => party.voteShare,
    );
    const input = partyModeInput([['1', '1']]);
    input.groups = fractions.map((_, index) => ({
      id: `G${index + 1}`,
      name: `Group ${index + 1}`,
      notes: '',
      growthRate: '0',
      turnout: '1',
      turnoutChange: '0',
    }));
    (input.parties as Json[])[0]!.composition = Object.fromEntries(
      fractions.map((fraction, index) => [`G${index + 1}`, fraction]),
    );

    const result = validateScenario(input);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(
        result.issues.some(
          (issue) =>
            issue.code === 'too-long' && issue.path.includes('.composition.'),
        ),
      ).toBe(true);
    }
  });

  it('counts the canonical overall-turnout denominator against the same budget', () => {
    const input = partyModeBudgetExpansionInput(50);
    const first = (input.parties as Json[])[0]!.voteShare as Json;
    (input.rules as Json).overallTurnout = {
      numerator: '2',
      denominator: first.denominator,
    };

    const result = validateScenario(input);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues).toContainEqual(
        expect.objectContaining({
          path: 'rules.overallTurnout.denominator',
          code: 'too-long',
        }),
      );
    }
  });

  it.each([
    { digits: 2048, turnoutDigits: 20, accepted: true },
    { digits: 2049, turnoutDigits: 21, accepted: false },
  ])(
    'enforces the canonical denominator budget at $digits digits',
    ({ digits, turnoutDigits, accepted }) => {
      const input = partyModeBudgetExpansionInput(50);
      (input.rules as Json).overallTurnout = {
        numerator: '1',
        denominator: String(10n ** BigInt(turnoutDigits - 1) + 3n),
      };

      const result = validateScenario(input);

      expect(result.ok).toBe(accepted);
      if (result.ok && result.scenario.inputMode === 'parties') {
        const denominators = new Set([
          result.scenario.rules.overallTurnout.denominator,
          ...result.scenario.parties.map(
            (party) => party.voteShare.denominator,
          ),
        ]);
        expect(
          [...denominators].reduce(
            (total, denominator) => total + denominator.length,
            0,
          ),
        ).toBe(digits);
        expect(validateScenario(result.scenario).ok).toBe(true);
        expect(parseScenarioJson(serializeScenario(result.scenario)).ok).toBe(
          true,
        );
      } else if (!result.ok) {
        expect(result.issues).toContainEqual(
          expect.objectContaining({
            path: 'rules.overallTurnout.denominator',
            code: 'too-long',
          }),
        );
      }
    },
  );

  it('round-trips an accepted 40-list input near the canonical budget', () => {
    const result = validateScenario(partyModeBudgetExpansionInput(50));
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    if (result.scenario.inputMode !== 'parties') {
      throw new Error('expected party mode');
    }
    const denominators = new Set([
      result.scenario.rules.overallTurnout.denominator,
      ...result.scenario.parties.map((party) => party.voteShare.denominator),
    ]);
    expect(
      [...denominators].reduce(
        (total, denominator) => total + denominator.length,
        0,
      ),
    ).toBe(2029);
    const checked = validateScenario(result.scenario);
    expect(checked.ok).toBe(true);
    const restored = parseScenarioJson(serializeScenario(result.scenario));
    expect(restored.ok).toBe(true);
    if (!restored.ok) {
      return;
    }
    const before = runSeats(result.scenario);
    const after = runSeats(restored.scenario);
    expect(serializeResult(after)).toBe(serializeResult(before));
    expect(
      after.allocation.parties.reduce((total, party) => total + party.seats, 0),
    ).toBe(120);
  });

  it('projects an eight-group, ten-party scenario near the canonical budget', () => {
    const result = validateScenario(partyModeBudgetCompositionInput());
    expect(result.ok).toBe(true);
    if (!result.ok || result.scenario.inputMode !== 'parties') {
      throw new Error('expected a valid party-mode scenario');
    }
    const denominators = new Set([
      result.scenario.rules.overallTurnout.denominator,
      ...result.scenario.parties.flatMap((party) => [
        party.voteShare.denominator,
        ...Object.values(party.composition ?? {}).map(
          (fraction) => fraction.denominator,
        ),
      ]),
    ]);
    expect(
      [...denominators].reduce(
        (total, denominator) => total + denominator.length,
        0,
      ),
    ).toBe(2003);
    const projected = runSeats(result.scenario, 1);
    if ('kind' in projected) {
      throw new Error(`unexpected unavailable projection: ${projected.reason}`);
    }
    expect(
      projected.allocation.parties.reduce(
        (total, party) => total + party.seats,
        0,
      ),
    ).toBe(120);
  });

  it('requires an explicit input mode for version 4', () => {
    const input = partyModeInput([
      ['1', '3'],
      ['2', '3'],
    ]);
    delete input.inputMode;
    const result = validateScenario(input);

    expect(issues(result)).toContain('inputMode:missing-field');
  });
});

describe('growth and turnout change values', () => {
  it.each(['-1', '1', '-0.5', '0', '0.000001', '-1.000', '1.0'])(
    'accepts %j for both fields',
    (value) => {
      const input = validInput();
      groupAt(input, 0).growthRate = value;
      groupAt(input, 1).turnoutChange = value;
      expectValid(input);
    },
  );

  it.each([
    ['-1.000000000000000001', 'out-of-range'],
    ['1.5', 'out-of-range'],
    ['-2', 'out-of-range'],
    ['abc', 'invalid-decimal'],
    ['+0.1', 'invalid-decimal'],
    ['', 'invalid-decimal'],
  ])('rejects %j as %s', (value, code) => {
    const input = validInput();
    groupAt(input, 0).growthRate = value;
    groupAt(input, 1).turnoutChange = value;
    expectIssue(input, `groups[0].growthRate:${code}`);
    expectIssue(input, `groups[1].turnoutChange:${code}`);
  });

  it.each([0.01, null, true])('rejects a non-string %j', (value) => {
    const input = validInput();
    groupAt(input, 0).growthRate = value;
    groupAt(input, 0).turnoutChange = value;
    expectIssue(input, 'groups[0].growthRate:wrong-type');
    expectIssue(input, 'groups[0].turnoutChange:wrong-type');
  });

  it('keeps the projection limit at twenty years', () => {
    expect(LIMITS.projectionYears).toBe(50);
  });

  it.each(['rules', 'groups', 'parties', 'blocks', 'coalitionRules', 'name'])(
    'reports a missing %s',
    (field) => {
      const input = validInput();
      delete input[field];
      expectIssue(input, `${field}:missing-field`);
    },
  );

  it('reports a wrong container type', () => {
    const input = validInput();
    input.groups = {};
    expectIssue(input, 'groups:wrong-type');
  });

  it('collects several independent issues', () => {
    const input = validInput();
    groupAt(input, 0).turnout = '2';
    partyAt(input, 0).color = 'red';
    const result = validateScenario(input);
    expect(issues(result)).toEqual(
      expect.arrayContaining([
        'groups[0].turnout:out-of-range',
        'parties[0].color:invalid-color',
      ]),
    );
  });

  it('gives every issue a non-empty message', () => {
    const input = validInput();
    groupAt(input, 0).turnout = '2';
    const result = validateScenario(input);
    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    for (const issue of result.issues) {
      expect(issue.message.length).toBeGreaterThan(0);
    }
  });
});

describe('entity limits', () => {
  it('rejects more groups than the limit before checking entities', () => {
    const input = validInput();
    input.groups = Array.from({ length: LIMITS.groups + 1 }, () => 'bad');
    expect(issues(validateScenario(input))).toEqual(['groups:too-many']);
  });

  it('rejects more parties than the limit', () => {
    const input = validInput();
    input.parties = Array.from({ length: LIMITS.parties + 1 }, () => 'bad');
    expect(issues(validateScenario(input))).toEqual(['parties:too-many']);
  });

  it('rejects more blocks than the limit', () => {
    const input = validInput();
    input.blocks = Array.from({ length: LIMITS.blocks + 1 }, () => 'bad');
    expect(issues(validateScenario(input))).toEqual(['blocks:too-many']);
  });

  it('rejects an oversized pair list', () => {
    const input = validInput();
    at(input, 'coalitionRules').incompatiblePartyPairs = Array.from(
      { length: LIMITS.pairs + 1 },
      () => ['P1', 'P3'],
    );
    expect(issues(validateScenario(input))).toEqual([
      'coalitionRules.incompatiblePartyPairs:too-many',
    ]);
  });

  it('rejects an oversized refusal list before checking entries', () => {
    const input = validInput();
    at(input, 'coalitionRules').partyRefusals = Array.from(
      { length: LIMITS.pairs + 1 },
      () => ['P1', 'P9'],
    );
    expect(issues(validateScenario(input))).toEqual([
      'coalitionRules.partyRefusals:too-many',
    ]);
  });

  it('accepts exactly the maximum number of parties', () => {
    const input = validInput();
    const parties = input.parties as Json[];
    for (let index = parties.length; index < LIMITS.parties; index += 1) {
      parties.push(party(`X${index}`, null, index));
    }
    expectValid(input);
  });
});

describe('identifiers and references', () => {
  it.each(['', 'a b', 'x'.repeat(65), 'пар', 'a.b'])('rejects id %j', (id) => {
    const input = validInput();
    partyAt(input, 3).id = id;
    expectIssue(input, 'parties[3].id:invalid-id');
  });

  it('accepts a 64-character id', () => {
    const input = validInput();
    input.id = 'a'.repeat(64);
    expectValid(input);
  });

  it('rejects a non-string id', () => {
    const input = validInput();
    partyAt(input, 3).id = 4;
    expectIssue(input, 'parties[3].id:wrong-type');
  });

  it('rejects duplicate ids within a kind', () => {
    const input = validInput();
    partyAt(input, 1).id = 'P1';
    expectIssue(input, 'parties[1].id:duplicate-id');
  });

  it('allows the same id in different kinds', () => {
    const input = validInput();
    input.id = 'P1';
    expectValid(input);
  });

  it('rejects a party in an unknown block', () => {
    const input = validInput();
    partyAt(input, 0).blockId = 'B9';
    expectIssue(input, 'parties[0].blockId:dangling-reference');
  });

  it('rejects an unknown allowed party', () => {
    const input = validInput();
    groupAt(input, 0).allowedPartyIds = ['P1', 'P3', 'P9'];
    expectIssue(input, 'groups[0].allowedPartyIds[2]:dangling-reference');
  });

  it('rejects a repeated allowed party', () => {
    const input = validInput();
    groupAt(input, 0).allowedPartyIds = ['P1', 'P3', 'P4', 'P1'];
    expectIssue(input, 'groups[0].allowedPartyIds[3]:duplicate-reference');
  });

  it('rejects an empty destination list', () => {
    const input = validInput();
    groupAt(input, 0).allowedPartyIds = [];
    groupAt(input, 0).voteWeights = {};
    expectIssue(input, 'groups[0].allowedPartyIds:empty-destinations');
  });

  it('rejects a weight for a party outside the allowed set', () => {
    const input = validInput();
    groupAt(input, 1).voteWeights = { P1: '0.5', P3: '0.5' };
    expectIssue(input, 'groups[1].voteWeights.P3:disallowed-destination');
  });

  it('rejects a prototype key used as a destination', () => {
    const text = JSON.stringify(validInput()).replace(
      '"voteWeights":{"P1":"0.5","P2":"0.5"}',
      '"voteWeights":{"P1":"0.5","P2":"0.5","__proto__":"0"}',
    );
    const result = parseScenarioJson(text);
    expect(issues(result)).toContain(
      'groups[1].voteWeights.__proto__:disallowed-destination',
    );
  });

  it('rejects a restricted group spanning blocks', () => {
    const input = validInput();
    const group = groupAt(input, 1);
    group.allowedPartyIds = ['P1', 'P3'];
    group.voteWeights = { P1: '0.5', P3: '0.5' };
    expectIssue(input, 'groups[1].allowedPartyIds:restricted-mixed-blocks');
  });

  it('rejects a restricted group mixing a block party and an unassigned party', () => {
    const input = validInput();
    const group = groupAt(input, 1);
    group.allowedPartyIds = ['P1', 'P4'];
    group.voteWeights = { P1: '0.5', P4: '0.5' };
    expectIssue(input, 'groups[1].allowedPartyIds:restricted-mixed-blocks');
  });
});

describe('field values', () => {
  it.each(['#12345', 'red', '#GGGGGG', '#1122334', 112233])(
    'rejects color %j',
    (color) => {
      const input = validInput();
      (input.blocks as Json[])[0]!.color = color;
      const expected =
        typeof color === 'string' ? 'invalid-color' : 'wrong-type';
      expectIssue(input, `blocks[0].color:${expected}`);
    },
  );

  it.each([
    ['1.1', 'out-of-range'],
    ['-0.1', 'out-of-range'],
    ['0.5e1', 'invalid-decimal'],
    [' 0.5', 'invalid-decimal'],
    ['0,5', 'invalid-decimal'],
    [`0.${'1'.repeat(19)}`, 'invalid-decimal'],
  ])('rejects turnout %j as %s', (turnout, code) => {
    const input = validInput();
    groupAt(input, 0).turnout = turnout;
    expectIssue(input, `groups[0].turnout:${code}`);
  });

  it.each([0.5, Number.NaN, null, true])(
    'rejects a non-string fraction %j',
    (value) => {
      const input = validInput();
      groupAt(input, 0).validBallotRate = value;
      expectIssue(input, 'groups[0].validBallotRate:wrong-type');
    },
  );

  it.each(['0', '1', '0.0', '1.000'])(
    'accepts boundary fraction %j',
    (value) => {
      const input = validInput();
      groupAt(input, 0).participationFactor = value;
      expectValid(input);
    },
  );

  it('rejects an out-of-range threshold', () => {
    const input = validInput();
    at(input, 'rules').threshold = '1.5';
    expectIssue(input, 'rules.threshold:out-of-range');
  });

  it('rejects a weight above one', () => {
    const input = validInput();
    groupAt(input, 0).voteWeights = { P1: '1.6', P3: '-0.6' };
    expectIssue(input, 'groups[0].voteWeights.P1:out-of-range');
    expectIssue(input, 'groups[0].voteWeights.P3:out-of-range');
  });

  it.each(['0', '-5', 'abc'])('rejects population total %j', (value) => {
    const input = validInput();
    at(input, 'rules').populationTotal = value;
    const code = value === 'abc' ? 'invalid-decimal' : 'out-of-range';
    expectIssue(input, `rules.populationTotal:${code}`);
  });

  it.each([
    [0, 'out-of-range'],
    [LIMITS.maxSeatCount + 1, 'out-of-range'],
    [1.5, 'not-an-integer'],
    [Number.POSITIVE_INFINITY, 'not-an-integer'],
    ['120', 'wrong-type'],
  ])('rejects seat count %j as %s', (value, code) => {
    const input = validInput();
    at(input, 'rules').seatCount = value;
    expectIssue(input, `rules.seatCount:${code}`);
  });

  it('accepts one seat and the maximum seat count', () => {
    for (const seatCount of [1, LIMITS.maxSeatCount]) {
      const input = validInput();
      at(input, 'rules').seatCount = seatCount;
      expectValid(input);
    }
  });

  it('rejects an override outside one to seat count', () => {
    for (const value of [0, 121]) {
      const input = validInput();
      const rules = at(input, 'rules');
      rules.majorityMode = 'override';
      rules.majorityOverride = value;
      expectIssue(input, 'rules.majorityOverride:out-of-range');
    }
  });

  it('rejects inconsistent majority settings', () => {
    const withValue = validInput();
    at(withValue, 'rules').majorityOverride = 61;
    expectIssue(withValue, 'rules.majorityOverride:inconsistent-majority');

    const missingValue = validInput();
    at(missingValue, 'rules').majorityMode = 'override';
    expectIssue(missingValue, 'rules.majorityOverride:inconsistent-majority');
  });

  it('rejects unknown enum values', () => {
    const input = validInput();
    at(input, 'rules').majorityMode = 'absolute';
    at(input, 'rules').allocationMethod = 'dhondt';
    groupAt(input, 0).votingMode = 'mixed';
    expectIssue(input, 'rules.majorityMode:invalid-enum');
    expectIssue(input, 'rules.allocationMethod:invalid-enum');
    expectIssue(input, 'groups[0].votingMode:invalid-enum');
  });

  it('rejects a non-integer tie-break order', () => {
    const input = validInput();
    partyAt(input, 0).tieBreakOrder = 1.5;
    expectIssue(input, 'parties[0].tieBreakOrder:not-an-integer');
  });

  it('rejects a non-boolean government flag', () => {
    const input = validInput();
    partyAt(input, 0).canJoinGovernment = 'yes';
    expectIssue(input, 'parties[0].canJoinGovernment:wrong-type');
  });

  it('rejects overlong names and notes', () => {
    const input = validInput();
    partyAt(input, 0).name = 'x'.repeat(LIMITS.nameLength + 1);
    input.notes = 'x'.repeat(LIMITS.notesLength + 1);
    expectIssue(input, 'parties[0].name:too-long');
    expectIssue(input, 'notes:too-long');
  });

  it('accepts names at the length limit and keeps markup as text', () => {
    const input = validInput();
    partyAt(input, 0).name = 'x'.repeat(LIMITS.nameLength);
    partyAt(input, 1).name = '<script>alert(1)</script>';
    const result = validateScenario(input);
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.scenario.parties[1]?.name).toBe('<script>alert(1)</script>');
  });

  it('rejects a non-object vote weight map', () => {
    const input = validInput();
    groupAt(input, 0).voteWeights = ['0.6'];
    expectIssue(input, 'groups[0].voteWeights:wrong-type');
  });
});

describe('entity notes', () => {
  function blockAt(value: Json, index: number): Json {
    return (value.blocks as Json[])[index] as Json;
  }

  function withoutEntityNotes(): Json {
    const input = validInput();
    for (const list of ['groups', 'parties', 'blocks']) {
      for (const entity of input[list] as Json[]) {
        delete entity.notes;
      }
    }
    return input;
  }

  it('treats absent group, party and block notes as empty', () => {
    const scenario = buildScenario(withoutEntityNotes());
    const notes = [
      ...scenario.groups,
      ...scenario.parties,
      ...scenario.blocks,
    ].map((entity) => entity.notes);
    expect(notes).toEqual(Array.from({ length: 8 }, () => ''));
  });

  it('keeps notes as given, in any script and with line breaks', () => {
    const input = validInput();
    groupAt(input, 0).notes = 'Line 1\nLine 2';
    partyAt(input, 1).notes = 'Заметка';
    blockAt(input, 0).notes = 'הערה 1';
    const scenario = buildScenario(input);
    expect(scenario.groups[0]?.notes).toBe('Line 1\nLine 2');
    expect(scenario.parties[1]?.notes).toBe('Заметка');
    expect(scenario.blocks[0]?.notes).toBe('הערה 1');
  });

  it.each([
    ['groups[0].notes', (input: Json) => (groupAt(input, 0).notes = 5)],
    ['parties[0].notes', (input: Json) => (partyAt(input, 0).notes = null)],
    ['blocks[0].notes', (input: Json) => (blockAt(input, 0).notes = [])],
  ])('rejects non-string %s', (path, spoil) => {
    const input = validInput();
    spoil(input);
    expectIssue(input, `${path}:wrong-type`);
  });

  it('rejects notes over the limit and accepts notes at it', () => {
    const input = validInput();
    groupAt(input, 1).notes = 'x'.repeat(LIMITS.notesLength + 1);
    partyAt(input, 2).notes = 'x'.repeat(LIMITS.notesLength);
    blockAt(input, 1).notes = 'x'.repeat(LIMITS.notesLength + 1);
    const result = validateScenario(input);
    expect(issues(result).sort()).toEqual([
      'blocks[1].notes:too-long',
      'groups[1].notes:too-long',
    ]);
  });

  it('prints notes right after the name of every entity', () => {
    const printed = JSON.parse(
      serializeScenario(buildScenario(withoutEntityNotes())),
    ) as { groups: Json[]; parties: Json[]; blocks: Json[] };
    for (const entity of [
      printed.groups[0]!,
      printed.parties[0]!,
      printed.blocks[0]!,
    ]) {
      expect(Object.keys(entity).slice(0, 3)).toEqual(['id', 'name', 'notes']);
      expect(entity.notes).toBe('');
    }
  });

  it('survives export and import and never changes the seats', () => {
    const plain = buildScenario(validInput());
    const input = validInput();
    groupAt(input, 0).notes = '</script><script>alert(1)</script>';
    partyAt(input, 3).notes = 'Unassigned list';
    blockAt(input, 1).notes = 'Block\tnote';
    const noted = buildScenario(input);
    const parsed = parseScenarioJson(serializeScenario(noted));
    if (!parsed.ok) {
      throw new Error(JSON.stringify(parsed.issues));
    }
    expect(parsed.scenario).toEqual(noted);
    expect(parsed.scenario.groups[0]?.notes).toBe(
      '</script><script>alert(1)</script>',
    );
    expect(serializeResult(runScenario(parsed.scenario))).toBe(
      serializeResult(runScenario(plain)),
    );
  });
});

describe('totals', () => {
  function withShares(first: string, second: string): Json {
    const input = validInput();
    groupAt(input, 0).populationShare = first;
    groupAt(input, 1).populationShare = second;
    return input;
  }

  it('accepts population shares within the 1e-9 tolerance', () => {
    expectValid(withShares('0.6', '0.399999999'));
    expectValid(withShares('0.6', '0.400000001'));
  });

  it('rejects population shares outside the tolerance', () => {
    expectIssue(withShares('0.6', '0.3999999989'), 'groups:invalid-total');
    expectIssue(withShares('0.6', '0.4000000011'), 'groups:invalid-total');
  });

  it('does not normalize shares silently', () => {
    const result = validateScenario(withShares('0.6', '0.399999999'));
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    if (result.scenario.inputMode !== 'groups') {
      throw new Error('expected a group-mode scenario');
    }
    expect(result.scenario.groups[1]?.populationShare).toBe('0.399999999');
  });

  it('rejects vote weights not summing to one', () => {
    const input = validInput();
    groupAt(input, 0).voteWeights = { P1: '0.6', P3: '0.3' };
    expectIssue(input, 'groups[0].voteWeights:invalid-total');
  });

  it('rejects an empty weight map as an invalid total', () => {
    const input = validInput();
    groupAt(input, 0).voteWeights = {};
    expectIssue(input, 'groups[0].voteWeights:invalid-total');
  });

  it('decides the tolerance exactly at the boundary', () => {
    const input = validInput();
    groupAt(input, 0).voteWeights = {
      P1: '0.6',
      P3: '0.3',
      P4: '0.099999999',
    };
    expectValid(input);
  });
});

describe('coalition rules', () => {
  function withPairs(field: string, pairs: unknown): Json {
    const input = validInput();
    at(input, 'coalitionRules')[field] = pairs;
    return input;
  }

  it.each([[['P1']], [['P1', 'P1']], [['P1', 'P2', 'P3']], ['P1-P2']])(
    'rejects malformed pair %j',
    (pair) => {
      expectIssue(
        withPairs('incompatiblePartyPairs', [pair]),
        'coalitionRules.incompatiblePartyPairs[0]:invalid-pair',
      );
    },
  );

  it('rejects a pair naming an unknown party', () => {
    expectIssue(
      withPairs('incompatiblePartyPairs', [['P1', 'P9']]),
      'coalitionRules.incompatiblePartyPairs[0]:dangling-reference',
    );
  });

  it('rejects a block pair naming an unknown block', () => {
    expectIssue(
      withPairs('incompatibleBlockPairs', [['B1', 'B9']]),
      'coalitionRules.incompatibleBlockPairs[0]:dangling-reference',
    );
  });

  it('rejects a party id used in a block pair', () => {
    expectIssue(
      withPairs('incompatibleBlockPairs', [['B1', 'P1']]),
      'coalitionRules.incompatibleBlockPairs[0]:dangling-reference',
    );
  });

  it('rejects an unordered duplicate pair', () => {
    expectIssue(
      withPairs('incompatiblePartyPairs', [
        ['P1', 'P3'],
        ['P3', 'P1'],
      ]),
      'coalitionRules.incompatiblePartyPairs[1]:duplicate-pair',
    );
  });

  it('rejects an override that contradicts an explicit incompatible pair', () => {
    expectIssue(
      withPairs('compatiblePartyOverrides', [['P3', 'P1']]),
      'coalitionRules.compatiblePartyOverrides[0]:conflicting-pair',
    );
  });

  it('keeps pair order as given', () => {
    const input = withPairs('incompatiblePartyPairs', [
      ['P3', 'P1'],
      ['P2', 'P4'],
    ]);
    const result = validateScenario(input);
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.scenario.coalitionRules.incompatiblePartyPairs).toEqual([
      ['P3', 'P1'],
      ['P2', 'P4'],
    ]);
  });
});

describe('party refusals', () => {
  function withRefusals(refusals: unknown): Json {
    const input = validInput();
    at(input, 'coalitionRules').partyRefusals = refusals;
    return input;
  }

  function validated(input: Json): Scenario {
    const result = validateScenario(input);
    expect(issues(result)).toEqual([]);
    if (!result.ok) {
      throw new Error('invalid');
    }
    return result.scenario;
  }

  it('keeps each refusal with its direction, in the given order', () => {
    const scenario = validated(
      withRefusals([
        ['P4', 'P2'],
        ['P2', 'P4'],
        ['P3', 'P1'],
      ]),
    );
    expect(scenario.coalitionRules.partyRefusals).toEqual([
      ['P4', 'P2'],
      ['P2', 'P4'],
      ['P3', 'P1'],
    ]);
  });

  it('reads an absent refusal list as empty and prints it after the overrides', () => {
    const input = validInput();
    delete at(input, 'coalitionRules').partyRefusals;
    const scenario = validated(input);
    expect(scenario.coalitionRules.partyRefusals).toEqual([]);
    expect(Object.keys(scenario.coalitionRules)).toEqual([
      'incompatiblePartyPairs',
      'incompatibleBlockPairs',
      'compatiblePartyOverrides',
      'partyRefusals',
    ]);
  });

  it.each([[['P1']], [['P1', 'P1']], [['P1', 'P2', 'P3']], ['P1-P2']])(
    'rejects malformed refusal %j',
    (refusal) => {
      expectIssue(
        withRefusals([refusal]),
        'coalitionRules.partyRefusals[0]:invalid-pair',
      );
    },
  );

  it('rejects a refusal naming an unknown party or a block', () => {
    expectIssue(
      withRefusals([['P1', 'P9']]),
      'coalitionRules.partyRefusals[0]:dangling-reference',
    );
    expectIssue(
      withRefusals([['B1', 'P1']]),
      'coalitionRules.partyRefusals[0]:dangling-reference',
    );
  });

  it('rejects the same refusal twice but accepts the reverse direction', () => {
    expectIssue(
      withRefusals([
        ['P2', 'P4'],
        ['P2', 'P4'],
      ]),
      'coalitionRules.partyRefusals[1]:duplicate-pair',
    );
    expectValid(
      withRefusals([
        ['P2', 'P4'],
        ['P4', 'P2'],
      ]),
    );
  });

  it('rejects a refusal list that is not an array', () => {
    expectIssue(
      withRefusals('P1-P2'),
      'coalitionRules.partyRefusals:wrong-type',
    );
  });

  it.each([
    ['the same direction', ['P2', 'P4']],
    ['the reverse direction', ['P4', 'P2']],
  ])('rejects an override of a refused pair in %s', (_name, override) => {
    const input = withRefusals([['P2', 'P4']]);
    at(input, 'coalitionRules').compatiblePartyOverrides = [override];
    expectIssue(
      input,
      'coalitionRules.compatiblePartyOverrides[0]:conflicting-pair',
    );
  });

  it('accepts a refusal of a pair that is also explicitly incompatible', () => {
    const scenario = validated(withRefusals([['P3', 'P1']]));
    expect(scenario.coalitionRules.incompatiblePartyPairs).toEqual([
      ['P1', 'P3'],
    ]);
    expect(scenario.coalitionRules.partyRefusals).toEqual([['P3', 'P1']]);
  });

  it('survives export and import byte for byte and keeps the results', () => {
    const scenario = buildScenario(
      withRefusals([
        ['P4', 'P1'],
        ['P1', 'P4'],
      ]),
    );
    const text = serializeScenario(scenario);
    expect(text).toContain('"partyRefusals": [');
    const imported = parseScenarioJson(text);
    expect(imported.ok).toBe(true);
    if (!imported.ok) {
      return;
    }
    expect(imported.scenario).toEqual(scenario);
    expect(serializeScenario(imported.scenario)).toBe(text);
    expect(serializeResult(runScenario(imported.scenario))).toBe(
      serializeResult(runScenario(scenario)),
    );
  });
});

describe('JSON import', () => {
  it('rejects malformed JSON', () => {
    expect(issues(parseScenarioJson('{"schemaVersion":'))).toEqual([
      ':invalid-json',
    ]);
  });

  it('measures the size limit in UTF-8 bytes', () => {
    const characters = LIMITS.jsonBytes / 2 + 1;
    const text = JSON.stringify({ notes: 'я'.repeat(characters) });
    expect(text.length).toBeLessThan(LIMITS.jsonBytes);
    expect(issues(parseScenarioJson(text))).toEqual([':too-large']);
  });

  it('accepts valid JSON text', () => {
    const result = parseScenarioJson(JSON.stringify(validInput()));
    expect(result.ok).toBe(true);
  });

  it('validates parsed JSON like an object', () => {
    const input = validInput();
    input.schemaVersion = SCHEMA_VERSION + 1;
    expect(issues(parseScenarioJson(JSON.stringify(input)))).toEqual([
      'schemaVersion:unsupported-version',
    ]);
  });
});

describe('scenario export', () => {
  const HOSTILE_NAME = '</script><script>alert(1)</script>';

  function roundTrip(scenario: Scenario): Scenario {
    const result = parseScenarioJson(serializeScenario(scenario));
    if (!result.ok) {
      throw new Error(JSON.stringify(result.issues));
    }
    return result.scenario;
  }

  function tieInput(): Json {
    return scenarioInput({
      parties: [partyInput('P1', null, 2), partyInput('P2', null, 1)],
      groups: [groupInput('G1', '1', { P1: '0.5', P2: '0.5' })],
      rules: rulesInput({ seatCount: 3 }),
    });
  }

  it('prints the validator field order with two-space indentation', () => {
    const scenario = buildScenario(validInput());
    const text = serializeScenario(scenario);
    expect(text).toBe(`${JSON.stringify(scenario, null, 2)}\n`);
    expect(Object.keys(JSON.parse(text) as Json)).toEqual([
      'schemaVersion',
      'id',
      'name',
      'notes',
      'inputMode',
      'rules',
      'groups',
      'parties',
      'blocks',
      'coalitionRules',
    ]);
  });

  it('ends with exactly one newline', () => {
    const text = serializeScenario(buildScenario(validInput()));
    expect(text.endsWith('}\n')).toBe(true);
    expect(text.endsWith('\n\n')).toBe(false);
  });

  it('prints only validated fields, weights in allowed party order', () => {
    const input = validInput();
    input.extra = 'dropped';
    const groups = input.groups as Json[];
    groups[0]!.voteWeights = { P4: '0.1', P3: '0.3', P1: '0.6' };
    const text = serializeScenario(buildScenario(input));
    expect(text).not.toContain('extra');
    const printed = JSON.parse(text) as { groups: Json[] };
    expect(Object.keys(printed.groups[0]!.voteWeights as Json)).toEqual([
      'P1',
      'P3',
      'P4',
    ]);
  });

  it.each([
    ['the documented example', () => validInput()],
    ['the Section 8 baseline', () => section8Input('1')],
    ['Section 8 with Group 3 turnout zero', () => section8Input('0')],
    [
      'Section 8 with an 18-digit turnout',
      () => section8Input('0.426523297491039426'),
    ],
    ['an exact remainder tie', tieInput],
  ])('%s survives export and import unchanged', (_name, input) => {
    const scenario = buildScenario(input());
    const text = serializeScenario(scenario);
    const imported = roundTrip(scenario);
    expect(imported).toEqual(scenario);
    expect(serializeScenario(imported)).toBe(text);
    expect(serializeResult(runScenario(imported))).toBe(
      serializeResult(runScenario(scenario)),
    );
  });

  it('keeps the tie-break winner and party order after the round trip', () => {
    const scenario = roundTrip(buildScenario(tieInput()));
    expect(scenario.parties.map((party) => party.id)).toEqual(['P1', 'P2']);
    const allocation = runScenario(scenario).allocation;
    expect(
      allocation.parties.map((party) => [party.partyId, party.seats]),
    ).toEqual([
      ['P1', 1],
      ['P2', 2],
    ]);
  });

  it('keeps __proto__ and constructor party IDs as ordinary own keys', () => {
    const input = scenarioInput({
      parties: [
        partyInput('__proto__', null, 1),
        partyInput('constructor', null, 2),
      ],
      groups: [
        groupInput('G1', '1', {
          ['__proto__']: '0.6',
          constructor: '0.4',
        } as Record<string, string>),
      ],
      coalitionRules: {
        incompatiblePartyPairs: [['__proto__', 'constructor']],
        incompatibleBlockPairs: [],
        compatiblePartyOverrides: [],
        partyRefusals: [['constructor', '__proto__']],
      },
    });
    const text = JSON.stringify(input);
    expect(text).toContain('"__proto__":"0.6"');
    const parsed = parseScenarioJson(text);
    if (!parsed.ok) {
      throw new Error(JSON.stringify(parsed.issues));
    }
    const scenario = roundTrip(parsed.scenario);
    if (scenario.inputMode !== 'groups') {
      throw new Error('expected a group-mode round trip');
    }
    const weights = scenario.groups[0]!.voteWeights;
    expect(Object.getPrototypeOf(weights)).toBe(Object.prototype);
    expect(Object.keys(weights)).toEqual(['__proto__', 'constructor']);
    expect(Object.getOwnPropertyDescriptor(weights, '__proto__')?.value).toBe(
      '0.6',
    );
    expect(scenario.coalitionRules.incompatiblePartyPairs).toEqual([
      ['__proto__', 'constructor'],
    ]);
    expect(scenario.coalitionRules.partyRefusals).toEqual([
      ['constructor', '__proto__'],
    ]);
    expect(({} as Json).polluted).toBeUndefined();
    expect(
      runScenario(scenario).allocation.parties.map((party) => party.seats),
    ).toEqual([72, 48]);
  });

  it('carries script-tag names and notes as plain text', () => {
    const input = validInput();
    input.name = HOSTILE_NAME;
    input.notes = HOSTILE_NAME;
    const scenario = roundTrip(buildScenario(input));
    expect(scenario.name).toBe(HOSTILE_NAME);
    expect(scenario.notes).toBe(HOSTILE_NAME);
  });
});
