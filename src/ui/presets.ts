import { STANDARD_VALID_BALLOT_RATE } from '../engine/edit';
import { HISTORICAL_2022, historical2022Input } from '../engine/historical2022';
import { SCHEMA_VERSION } from '../engine/schema';
import { catalogListColor, EXAMPLE_LISTS } from './catalog';

export type PresetId =
  | 'baseline'
  | 'turnoutZero'
  | 'share7'
  | 'share8'
  | 'split'
  | 'multiBlock'
  | 'israelExample'
  | 'historical2022';

/** Section 8 rows first, in table order, then the extra examples. */
export const PRESETS: readonly PresetId[] = [
  'baseline',
  'turnoutZero',
  'share7',
  'share8',
  'split',
  'multiBlock',
  'israelExample',
  'historical2022',
];

type Json = Record<string, unknown>;

const SCENARIO_ID: Readonly<Record<PresetId, string>> = {
  baseline: 'baseline',
  turnoutZero: 'turnout-zero',
  share7: 'share-7',
  share8: 'share-8',
  split: 'split',
  multiBlock: 'multi-block',
  israelExample: 'israel-example',
  historical2022: 'historical-2022',
};

// Section 8.1 inverse t = 0.85 s / (0.15 (1 - s)), truncated to 18 decimals:
// 119/279 for s = 7% and 34/69 for s = 8%.
const GROUP_3_TURNOUT = {
  turnoutZero: '0',
  share7: '0.426523297491039426',
  share8: '0.492753623188405797',
} as const;

const shares = ['0.38', '0.42', '0.15', '0.05'] as const;
const colors = ['#1f77b4', '#d62728', '#2ca02c', '#9467bd'] as const;

/**
 * Section 8 baseline: one restricted cohort and one party per block. Names are
 * empty, so the interface shows its own default labels in every language.
 */
function baseline(): Json {
  return {
    schemaVersion: SCHEMA_VERSION,
    inputMode: 'groups',
    id: SCENARIO_ID.baseline,
    name: '',
    notes: '',
    rules: {
      populationTotal: '1000000',
      seatCount: 120,
      majorityMode: 'default',
      majorityOverride: null,
      threshold: '0',
      allocationMethod: 'hamilton',
    },
    groups: shares.map((share, index) => {
      const partyId = `P${index + 1}`;
      return {
        id: `G${index + 1}`,
        name: '',
        populationShare: share,
        growthRate: '0',
        turnout: '1',
        turnoutChange: '0',
        validBallotRate: STANDARD_VALID_BALLOT_RATE,
        participationFactor: '1',
        votingMode: 'restricted',
        allowedPartyIds: [partyId],
        voteWeights: { [partyId]: '1' },
      };
    }),
    parties: shares.map((_, index) => ({
      id: `P${index + 1}`,
      name: '',
      color: colors[index],
      blockId: `B${index + 1}`,
      tieBreakOrder: index + 1,
      canJoinGovernment: index !== 2,
    })),
    blocks: shares.map((_, index) => ({
      id: `B${index + 1}`,
      name: '',
      color: colors[index],
    })),
    coalitionRules: {
      incompatiblePartyPairs: [['P1', 'P2']],
      incompatibleBlockPairs: [],
      compatiblePartyOverrides: [],
      partyRefusals: [],
    },
  };
}

function replaceGroup(input: Json, index: number, fields: Json): Json[] {
  return (input.groups as Json[]).map((group, position) =>
    position === index ? { ...group, ...fields } : group,
  );
}

/** Section 8 row: the baseline with only Group 3 turnout changed. */
function group3Turnout(id: keyof typeof GROUP_3_TURNOUT) {
  return (): Json => {
    const input = baseline();
    return {
      ...input,
      id: SCENARIO_ID[id],
      groups: replaceGroup(input, 2, { turnout: GROUP_3_TURNOUT[id] }),
    };
  };
}

/** Group 3 votes across opposing blocks: 60% P3, 30% P1, 10% P2. */
function split(): Json {
  const input = baseline();
  return {
    ...input,
    id: SCENARIO_ID.split,
    groups: replaceGroup(input, 2, {
      votingMode: 'open',
      allowedPartyIds: ['P3', 'P1', 'P2'],
      voteWeights: { P3: '0.6', P1: '0.3', P2: '0.1' },
    }),
  };
}

/** Block 1 holds parties 1 and 5; group 1 splits 70 / 30 inside it. */
function multiBlock(): Json {
  const input = baseline();
  return {
    ...input,
    id: SCENARIO_ID.multiBlock,
    groups: replaceGroup(input, 0, {
      allowedPartyIds: ['P1', 'P5'],
      voteWeights: { P1: '0.7', P5: '0.3' },
    }),
    parties: [
      ...(input.parties as Json[]),
      {
        id: 'P5',
        name: '',
        color: '#ff7f0e',
        blockId: 'B1',
        tieBreakOrder: 5,
        canJoinGovernment: true,
      },
    ],
  };
}

// Section 14.4 table: share of the electorate, then the weights in the order
// of EXAMPLE_LISTS (Likud, Yesh Atid, Avoda, Religious Zionism, Shas, Ra'am).
// Shares follow the Central Bureau of Statistics figures for 2022: eligible
// voters 77% Jews (Haredim 11% of all), 17% Arabs, 6% others (media release
// 342/2022); the other 66% of Jews split by the self-definition of Jews aged
// 20+ (secular 45.3, traditional 19.2 + 13.9, religious 10.7; 20 Sep 2022),
// one decimal, `other` the exact rest to 100%. Weights are assumptions for
// teaching, not survey results; zeros are editable, not bans.
export const EXAMPLE_GROUPS: readonly (readonly [
  string,
  string,
  readonly string[],
])[] = [
  ['secular', '0.336', ['0.25', '0.45', '0.2', '0.05', '0.05', '0']],
  ['traditional', '0.245', ['0.45', '0.2', '0.05', '0.15', '0.15', '0']],
  ['religious', '0.079', ['0.2', '0.05', '0', '0.55', '0.2', '0']],
  ['haredi', '0.11', ['0.1', '0.05', '0', '0.15', '0.7', '0']],
  ['arab', '0.17', ['0.1', '0.1', '0.05', '0', '0', '0.75']],
  ['other', '0.06', ['0.3', '0.35', '0.15', '0.1', '0.05', '0.05']],
];

/**
 * Section 14.4 Israeli educational example: six catalog groups and the six
 * catalog lists, 120 seats and a 3.25% threshold. Names stay empty, so the
 * interface shows the catalog names in its own language.
 */
function israelExample(): Json {
  return {
    schemaVersion: SCHEMA_VERSION,
    inputMode: 'groups',
    id: SCENARIO_ID.israelExample,
    name: '',
    notes: '',
    rules: {
      populationTotal: '1000000',
      seatCount: 120,
      majorityMode: 'default',
      majorityOverride: null,
      threshold: '0.0325',
      allocationMethod: 'hamilton',
    },
    groups: EXAMPLE_GROUPS.map(([id, share, weights]) => ({
      id,
      name: '',
      populationShare: share,
      growthRate: '0',
      // M7-19: the questionnaire's per-group turnout suggestion.
      turnout: id === 'haredi' ? '0.85' : '0.7',
      turnoutChange: '0',
      validBallotRate: STANDARD_VALID_BALLOT_RATE,
      participationFactor: '1',
      votingMode: 'open',
      allowedPartyIds: [...EXAMPLE_LISTS],
      voteWeights: Object.fromEntries(
        EXAMPLE_LISTS.map((party, index) => [party, weights[index] ?? '0']),
      ),
    })),
    parties: EXAMPLE_LISTS.map((id, index) => ({
      id,
      name: '',
      color: catalogListColor(id) ?? '#6B7280',
      blockId: null,
      tieBreakOrder: index + 1,
      canJoinGovernment: true,
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

const BUILDERS: Readonly<Record<PresetId, () => Json>> = {
  baseline,
  turnoutZero: group3Turnout('turnoutZero'),
  share7: group3Turnout('share7'),
  share8: group3Turnout('share8'),
  split,
  multiBlock,
  israelExample,
  historical2022: () =>
    historical2022Input(
      Object.fromEntries(
        HISTORICAL_2022.lists.map((entry) => [
          entry.id,
          catalogListColor(entry.id) ?? '#6B7280',
        ]),
      ),
    ),
};

/** A fresh scenario input; it stores no interface-language text. */
export function presetInput(id: PresetId): Json {
  return BUILDERS[id]();
}

/** The preset whose scenario ID this is, or null. */
export function presetIdOf(scenarioId: unknown): PresetId | null {
  return PRESETS.find((id) => SCENARIO_ID[id] === scenarioId) ?? null;
}

/** Returns a fresh copy of the Section 8 baseline scenario input. */
export function baselineInput(): Json {
  return presetInput('baseline');
}
