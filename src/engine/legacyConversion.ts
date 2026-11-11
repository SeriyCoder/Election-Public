import { isStandardValidity, STANDARD_VALID_BALLOT_RATE } from './edit';
import { fractionParts } from './numeric';
import {
  compare,
  div,
  isZero,
  mul,
  parseDecimal,
  rational,
  sum,
} from './rational';
import {
  LIMITS,
  validateScenario,
  type CoalitionRules,
  type GroupScenario,
  type IdPair,
  type LinkedGroup,
  type PartyScenario,
  type Scenario,
  type ValidationIssue,
} from './schema';
import { computeVotes } from './votes';

export type LegacyConversionFailure =
  | 'invalid-scenario'
  | 'no-valid-votes'
  | 'unrepresentable-vote-matrix'
  | 'precision-limit'
  | 'pair-limit'
  | 'invalid-candidate';

export type LegacyConversionResult =
  | { readonly ok: true; readonly scenario: PartyScenario }
  | {
      readonly ok: false;
      readonly reason: LegacyConversionFailure;
      readonly issues: readonly ValidationIssue[];
    };

type Refusal = Extract<LegacyConversionResult, { readonly ok: false }>;

const ZERO = rational(0n);
const ONE = rational(1n);

export interface LegacyFeatures {
  readonly groupMode: boolean;
  readonly participation: boolean;
  readonly restrictions: boolean;
  readonly validity: boolean;
  readonly majority: boolean;
  readonly turnoutChange: boolean;
}

export function legacyFeatures(scenario: Scenario): LegacyFeatures {
  const groupMode = scenario.inputMode === 'groups';
  const legacyPairs =
    scenario.blocks.length > 0 ||
    scenario.parties.some((party) => party.blockId !== null) ||
    scenario.coalitionRules.incompatibleBlockPairs.length > 0 ||
    scenario.coalitionRules.compatiblePartyOverrides.length > 0;
  const linkedRestrictions =
    scenario.inputMode === 'parties' &&
    scenario.linkedModel !== undefined &&
    Object.values(scenario.linkedModel.groups).some(
      (group) => group.allowedPartyIds.length !== scenario.parties.length,
    );
  return {
    groupMode,
    participation:
      scenario.inputMode === 'groups' &&
      scenario.groups.some(
        (group) => compare(parseDecimal(group.participationFactor), ONE) !== 0,
      ),
    restrictions:
      legacyPairs ||
      linkedRestrictions ||
      (scenario.inputMode === 'groups' &&
        scenario.groups.some((group) => group.votingMode === 'restricted')),
    validity:
      scenario.inputMode === 'groups'
        ? scenario.groups.some(
            (group) => !isStandardValidity(group.validBallotRate),
          )
        : !isStandardValidity(scenario.rules.validBallotRate),
    majority: scenario.rules.majorityMode === 'override',
    turnoutChange: scenario.groups.some(
      (group) => !isZero(parseDecimal(group.turnoutChange)),
    ),
  };
}

export function hasLegacyFeatures(scenario: Scenario): boolean {
  return Object.values(legacyFeatures(scenario)).some(Boolean);
}

function refuse(
  reason: LegacyConversionFailure,
  issues: readonly ValidationIssue[] = [],
): Refusal {
  return { ok: false, reason, issues };
}

function pairKey(first: string, second: string): string {
  return first < second ? `${first}|${second}` : `${second}|${first}`;
}

function partyRules(scenario: Scenario): CoalitionRules | Refusal {
  const { coalitionRules, parties } = scenario;
  const incompatible: IdPair[] = [...coalitionRules.incompatiblePartyPairs];
  const added = new Set(incompatible.map(([a, b]) => pairKey(a, b)));
  const blocked = new Set(
    coalitionRules.incompatibleBlockPairs.map(([a, b]) => pairKey(a, b)),
  );
  const overrides = new Set(
    coalitionRules.compatiblePartyOverrides.map(([a, b]) => pairKey(a, b)),
  );
  for (const [index, first] of parties.entries()) {
    if (first.blockId === null) continue;
    for (const second of parties.slice(index + 1)) {
      if (second.blockId === null) continue;
      const key = pairKey(first.id, second.id);
      if (
        blocked.has(pairKey(first.blockId, second.blockId)) &&
        !overrides.has(key) &&
        !added.has(key)
      ) {
        incompatible.push([first.id, second.id]);
        added.add(key);
      }
    }
  }
  if (incompatible.length > LIMITS.pairs) return refuse('pair-limit');
  return {
    incompatiblePartyPairs: incompatible,
    incompatibleBlockPairs: [],
    compatiblePartyOverrides: [],
    partyRefusals: coalitionRules.partyRefusals.map(([a, b]) => [a, b]),
  };
}

function groupCandidate(
  scenario: GroupScenario,
  coalitionRules: CoalitionRules,
): PartyScenario | Refusal {
  const votes = computeVotes(scenario);
  if (isZero(votes.allValidVotes) || isZero(votes.totals.cast)) {
    return refuse('no-valid-votes');
  }
  const populationShares = scenario.groups.map((group) =>
    parseDecimal(group.populationShare),
  );
  if (compare(sum(populationShares), ONE) !== 0) {
    return refuse('unrepresentable-vote-matrix');
  }
  const partyIds = scenario.parties.map((party) => party.id);
  const groupPreferences = scenario.groups.map((group) =>
    scenario.parties.map((party) =>
      Object.hasOwn(group.voteWeights, party.id)
        ? parseDecimal(group.voteWeights[party.id]!)
        : ZERO,
    ),
  );
  if (
    groupPreferences.some((preferences) => compare(sum(preferences), ONE) !== 0)
  ) {
    return refuse('unrepresentable-vote-matrix');
  }

  const matrix = votes.groups.map((group) => {
    const contributions = new Map(
      group.contributions.map(({ partyId, votes: value }) => [partyId, value]),
    );
    return partyIds.map((id) => contributions.get(id) ?? ZERO);
  });
  for (const [groupIndex, group] of votes.groups.entries()) {
    for (const [partyIndex, contribution] of matrix[groupIndex]!.entries()) {
      const candidate = mul(
        group.cast,
        groupPreferences[groupIndex]![partyIndex]!,
      );
      if (
        compare(
          mul(contribution, votes.totals.cast),
          mul(candidate, votes.allValidVotes),
        ) !== 0
      ) {
        return refuse('unrepresentable-vote-matrix');
      }
    }
  }

  const turnouts = scenario.groups.map((group) =>
    mul(parseDecimal(group.participationFactor), parseDecimal(group.turnout)),
  );
  const linkedGroups: [string, LinkedGroup][] = scenario.groups.map(
    (group, index) => [
      group.id,
      {
        populationShare: fractionParts(populationShares[index]!),
        preferences: Object.fromEntries(
          partyIds.map((id, partyIndex) => [
            id,
            fractionParts(groupPreferences[index]![partyIndex]!),
          ]),
        ),
        allowedPartyIds: [...partyIds],
        lastNonzeroTurnout: fractionParts(turnouts[index]!),
      },
    ],
  );
  return {
    ...scenario,
    inputMode: 'parties',
    rules: {
      ...scenario.rules,
      majorityMode: 'default',
      majorityOverride: null,
      overallTurnout: fractionParts(votes.turnout),
      validBallotRate: STANDARD_VALID_BALLOT_RATE,
    },
    groups: scenario.groups.map((group, index) => ({
      id: group.id,
      name: group.name,
      notes: group.notes,
      growthRate: group.growthRate,
      turnout: fractionParts(turnouts[index]!),
      turnoutChange: '0',
    })),
    parties: scenario.parties.map((party, partyIndex) => {
      const total = votes.parties[partyIndex]!.votes;
      return {
        ...party,
        blockId: null,
        voteShare: fractionParts(div(total, votes.allValidVotes)),
        composition: isZero(total)
          ? null
          : Object.fromEntries(
              scenario.groups.map((group, groupIndex) => [
                group.id,
                fractionParts(div(matrix[groupIndex]![partyIndex]!, total)),
              ]),
            ),
      };
    }),
    linkedModel: { state: 'current', groups: Object.fromEntries(linkedGroups) },
    blocks: [],
    coalitionRules,
  };
}

function normalizedPartyCandidate(
  scenario: PartyScenario,
  coalitionRules: CoalitionRules,
): PartyScenario {
  const partyIds = scenario.parties.map((party) => party.id);
  return {
    ...scenario,
    rules: {
      ...scenario.rules,
      majorityMode: 'default',
      majorityOverride: null,
      validBallotRate: STANDARD_VALID_BALLOT_RATE,
    },
    groups: scenario.groups.map((group) => ({ ...group, turnoutChange: '0' })),
    parties: scenario.parties.map((party) => ({ ...party, blockId: null })),
    ...(scenario.linkedModel === undefined
      ? {}
      : {
          linkedModel: {
            ...scenario.linkedModel,
            groups: Object.fromEntries(
              Object.entries(scenario.linkedModel.groups).map(([id, group]) => [
                id,
                { ...group, allowedPartyIds: [...partyIds] },
              ]),
            ),
          },
        }),
    blocks: [],
    coalitionRules,
  };
}

export function prepareLegacyConversion(
  input: unknown,
): LegacyConversionResult {
  const validation = validateScenario(input);
  if (!validation.ok) return refuse('invalid-scenario', validation.issues);
  const scenario = validation.scenario;
  const rules = partyRules(scenario);
  if ('ok' in rules) return rules;
  const candidate =
    scenario.inputMode === 'groups'
      ? groupCandidate(scenario, rules)
      : normalizedPartyCandidate(scenario, rules);
  if ('ok' in candidate) return candidate;
  const checked = validateScenario(candidate);
  if (!checked.ok) {
    return refuse(
      checked.issues.some((issue) => issue.code === 'too-long')
        ? 'precision-limit'
        : 'invalid-candidate',
      checked.issues,
    );
  }
  if (checked.scenario.inputMode !== 'parties') {
    return refuse('invalid-candidate');
  }
  return { ok: true, scenario: checked.scenario };
}
