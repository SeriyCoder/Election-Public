import {
  SCHEMA_VERSION,
  validateScenario,
  type GroupScenario,
} from '../../../src/engine/schema';
import { parseDecimal } from '../../../src/engine/rational';

export type Json = Record<string, unknown>;

export function buildScenario(input: Json): GroupScenario {
  const result = validateScenario(input);
  if (!result.ok) {
    const detail = result.issues
      .map((issue) => `${issue.path}:${issue.code}`)
      .join(', ');
    throw new Error(`Invalid test scenario: ${detail}`);
  }
  if (result.scenario.inputMode !== 'groups') {
    throw new Error('Expected a group-mode test scenario');
  }
  return result.scenario;
}

export function partyInput(
  id: string,
  blockId: string | null,
  tieBreakOrder: number,
  canJoinGovernment = true,
): Json {
  return {
    id,
    name: `Party ${id}`,
    color: '#336699',
    blockId,
    tieBreakOrder,
    canJoinGovernment,
  };
}

export function groupInput(
  id: string,
  populationShare: string,
  voteWeights: Record<string, string>,
  options: {
    turnout?: string;
    validBallotRate?: string;
    participationFactor?: string;
    votingMode?: 'restricted' | 'open';
    allowedPartyIds?: string[];
    growthRate?: string;
    turnoutChange?: string;
  } = {},
): Json {
  return {
    id,
    name: `Group ${id}`,
    populationShare,
    ...(options.growthRate === undefined
      ? {}
      : { growthRate: options.growthRate }),
    turnout: options.turnout ?? '1',
    ...(options.turnoutChange === undefined
      ? {}
      : { turnoutChange: options.turnoutChange }),
    validBallotRate: options.validBallotRate ?? '1',
    participationFactor: options.participationFactor ?? '1',
    votingMode: options.votingMode ?? 'open',
    allowedPartyIds: options.allowedPartyIds ?? Object.keys(voteWeights),
    voteWeights,
  };
}

export function rulesInput(overrides: Json = {}): Json {
  return {
    populationTotal: '1000000',
    seatCount: 120,
    majorityMode: 'default',
    majorityOverride: null,
    threshold: '0',
    allocationMethod: 'hamilton',
    ...overrides,
  };
}

export function scenarioInput(parts: {
  groups: Json[];
  parties: Json[];
  blocks?: Json[];
  rules?: Json;
  coalitionRules?: Json;
}): Json {
  return {
    schemaVersion: SCHEMA_VERSION,
    inputMode: 'groups',
    id: 'test',
    name: 'Test scenario',
    notes: '',
    rules: parts.rules ?? rulesInput(),
    groups: parts.groups,
    parties: parts.parties,
    blocks: parts.blocks ?? [],
    coalitionRules: {
      incompatiblePartyPairs: [],
      incompatibleBlockPairs: [],
      compatiblePartyOverrides: [],
      partyRefusals: [],
      ...parts.coalitionRules,
    },
  };
}

export function partyModeInput(
  shares: readonly (readonly [string, string])[],
  options: {
    populationTotal?: string;
    turnout?: string;
    validBallotRate?: string;
    threshold?: string;
    seatCount?: number;
  } = {},
): Json {
  const turnout = parseDecimal(options.turnout ?? '1');
  return {
    schemaVersion: 4,
    inputMode: 'parties',
    id: 'party-mode-test',
    name: 'Party mode test',
    notes: '',
    rules: {
      populationTotal: options.populationTotal ?? '1000',
      seatCount: options.seatCount ?? 120,
      majorityMode: 'default',
      majorityOverride: null,
      threshold: options.threshold ?? '0.0325',
      allocationMethod: 'hamilton',
      overallTurnout: {
        numerator: turnout.num.toString(),
        denominator: turnout.den.toString(),
      },
      validBallotRate: options.validBallotRate ?? '0.999',
    },
    groups: [],
    parties: shares.map(([numerator, denominator], index) => ({
      id: `P${index + 1}`,
      name: `Party ${index + 1}`,
      notes: '',
      color: '#336699',
      blockId: null,
      tieBreakOrder: index + 1,
      canJoinGovernment: true,
      voteShare: { numerator, denominator },
      composition: null,
    })),
    blocks: [],
    coalitionRules: {
      incompatiblePartyPairs: [],
      incompatibleBlockPairs: [],
      compatiblePartyOverrides: [],
      partyRefusals: [],
    },
  };
}

/** Paired shares sum to one but may gain distinct denominators when reduced. */
export function partyModeBudgetExpansionInput(digits: number): Json {
  const shares: [string, string][] = [];
  for (let index = 0; index < 20; index += 1) {
    const p = 10n ** BigInt(digits - 1) + 1001n + 2n * BigInt(index);
    const denominator = String(20n * p);
    shares.push(['1', denominator], [String(p - 1n), denominator]);
  }
  return partyModeInput(shares, { threshold: '0' });
}

/** Ten parties and eight groups, with canonical denominators near the limit. */
export function partyModeBudgetCompositionInput(): Json {
  const input = partyModeInput(
    Array.from({ length: 10 }, () => ['1', '10'] as const),
    { threshold: '0' },
  );
  const groups = Array.from({ length: 8 }, (_, index) => ({
    id: `G${index + 1}`,
    name: `Group ${index + 1}`,
    notes: '',
    growthRate: index === 1 ? '0.1' : '0',
    turnout: '1',
    turnoutChange: '0',
  }));
  const parties = (input.parties as Json[]).map((party, index) => {
    const composition: Record<string, Json> = {};
    for (let pair = 0; pair < 4; pair += 1) {
      const p = 10n ** 24n + 1001n + 2n * BigInt(index * 4 + pair);
      const denominator = String(4n * p);
      composition[`G${pair * 2 + 1}`] = { numerator: '1', denominator };
      composition[`G${pair * 2 + 2}`] = {
        numerator: String(p - 1n),
        denominator,
      };
    }
    return { ...party, composition };
  });
  return { ...input, groups, parties };
}

/** A known 1,000-person group grows by 10%; a second group is known empty. */
export function partyModeKnownPopulationInput(): Json {
  const input = partyModeInput([['1', '1']], {
    populationTotal: '1000',
    turnout: '1',
  });
  return {
    ...input,
    groups: [
      {
        id: 'G1',
        name: 'Group 1',
        notes: '',
        growthRate: '0.1',
        turnout: '1',
        turnoutChange: '0',
      },
      {
        id: 'G2',
        name: 'Group 2',
        notes: '',
        growthRate: '0.2',
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
  };
}

/** Section 8 preset: one restricted cohort and one party per block. */
export function section8Input(group3Turnout = '1'): Json {
  const shares = ['0.38', '0.42', '0.15', '0.05'];
  return scenarioInput({
    blocks: shares.map((_, index) => ({
      id: `B${index + 1}`,
      name: `Block ${index + 1}`,
      color: '#224466',
    })),
    parties: shares.map((_, index) =>
      partyInput(`P${index + 1}`, `B${index + 1}`, index + 1, index !== 2),
    ),
    groups: shares.map((share, index) =>
      groupInput(
        `G${index + 1}`,
        share,
        { [`P${index + 1}`]: '1' },
        {
          votingMode: 'restricted',
          turnout: index === 2 ? group3Turnout : '1',
        },
      ),
    ),
    coalitionRules: { incompatiblePartyPairs: [['P1', 'P2']] },
  });
}

export function section8Scenario(group3Turnout = '1'): GroupScenario {
  return buildScenario(section8Input(group3Turnout));
}
