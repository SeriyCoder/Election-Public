import { isDraft, type Draft } from './edit';
import { transferLinkedVotes, type LinkedFlowGroup } from './linkedFlow';
import { fractionParts, parsePercent } from './numeric';
import { editPartyShare, type PartyShareEditFailure } from './partyShares';
import {
  compare,
  div,
  isPositive,
  isZero,
  mul,
  parseDecimal,
  rational,
  sub,
  sum,
  type Rational,
} from './rational';
import {
  SCHEMA_VERSION,
  validateScenario,
  type ExactFraction,
  type LinkedGroup,
  type LinkedModel,
  type PartyScenario,
  type ValidationIssue,
} from './schema';

export type LinkedEditFailure =
  | PartyShareEditFailure
  | 'unknown-group'
  | 'unknown-party-composition'
  | 'unknown-population'
  | 'inconsistent-demographics'
  | 'suspended-model'
  | 'turnout-overflow'
  | 'forbidden-transfer'
  | 'search-limit';

export type LinkedEditResult =
  | { readonly ok: true; readonly draft: Draft }
  | {
      readonly ok: false;
      readonly reason: LinkedEditFailure;
      readonly issues: readonly ValidationIssue[];
    };

type Ready = {
  readonly ok: true;
  readonly draft: Draft;
  readonly scenario: PartyScenario;
};
type Context = Ready | Extract<LinkedEditResult, { readonly ok: false }>;

const ZERO = rational(0n);
const ONE = rational(1n);
const HUNDRED = rational(100n);

function refused(
  reason: LinkedEditFailure,
  issues: readonly ValidationIssue[] = [],
): Extract<LinkedEditResult, { readonly ok: false }> {
  return { ok: false, reason, issues };
}

function object(value: unknown): Readonly<Record<string, unknown>> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('A validated scenario must contain an object');
  }
  return value as Readonly<Record<string, unknown>>;
}

function fraction(value: ExactFraction): Rational {
  return rational(BigInt(value.numerator), BigInt(value.denominator));
}

function context(input: unknown): Context {
  const validation = validateScenario(input);
  if (!validation.ok) return refused('invalid-scenario', validation.issues);
  if (validation.scenario.inputMode !== 'parties') {
    return refused('party-mode-required');
  }
  if (!isDraft(input)) {
    throw new Error('A valid party scenario must also be an editable draft');
  }
  return { ok: true, draft: input, scenario: validation.scenario };
}

function migrated(state: Ready): Draft {
  let original = state.draft;
  if (
    state.draft.schemaVersion !== SCHEMA_VERSION &&
    Object.hasOwn(state.draft, 'linkedModel')
  ) {
    const { linkedModel, ...rest } = state.draft;
    let legacyKey = 'legacyV4LinkedModel';
    while (Object.hasOwn(rest, legacyKey)) legacyKey += '_';
    original = { ...rest, [legacyKey]: linkedModel };
  }
  return {
    ...original,
    schemaVersion: SCHEMA_VERSION,
    inputMode: 'parties',
    rules: {
      ...object(original.rules),
      overallTurnout: state.scenario.rules.overallTurnout,
    },
    groups: original.groups.map((group, index) => ({
      ...group,
      turnout: state.scenario.groups[index]!.turnout,
    })),
  };
}

function withModel(draft: Draft, model: LinkedModel): Draft {
  const original =
    typeof draft.linkedModel === 'object' &&
    draft.linkedModel !== null &&
    !Array.isArray(draft.linkedModel)
      ? object(draft.linkedModel)
      : {};
  const originalGroups =
    typeof original.groups === 'object' &&
    original.groups !== null &&
    !Array.isArray(original.groups)
      ? object(original.groups)
      : {};
  return {
    ...draft,
    linkedModel: {
      ...original,
      state: model.state,
      groups: Object.fromEntries(
        Object.entries(model.groups).map(([id, row]) => {
          const previous = originalGroups[id];
          return [
            id,
            {
              ...(typeof previous === 'object' &&
              previous !== null &&
              !Array.isArray(previous)
                ? object(previous)
                : {}),
              ...row,
            },
          ];
        }),
      ),
    },
  };
}

function commit(draft: Draft): LinkedEditResult {
  const validation = validateScenario(draft);
  if (!validation.ok) {
    return refused(
      validation.issues.some((issue) => issue.code === 'too-long')
        ? 'precision-limit'
        : 'invalid-result',
      validation.issues,
    );
  }
  return { ok: true, draft };
}

function percent(text: string): Rational | null {
  const parsed = typeof text === 'string' ? parsePercent(text) : null;
  if (
    parsed === null ||
    compare(parsed, ZERO) < 0 ||
    compare(parsed, HUNDRED) > 0
  ) {
    return null;
  }
  return div(parsed, HUNDRED);
}

/** Builds assumptions only from complete, consistent party composition data. */
export function buildLinkedBasis(input: unknown): LinkedEditResult {
  const state = context(input);
  if (!state.ok) return state;
  const { scenario } = state;
  if (scenario.linkedModel?.state === 'current') return commit(migrated(state));
  const currentOverall = fraction(scenario.rules.overallTurnout);
  if (
    scenario.groups.length === 0 ||
    isZero(parseDecimal(scenario.rules.validBallotRate)) ||
    isZero(parseDecimal(scenario.rules.populationTotal))
  ) {
    return refused('unknown-population');
  }
  if (
    scenario.parties.some(
      (party) =>
        isPositive(fraction(party.voteShare)) && party.composition === null,
    )
  ) {
    return refused('unknown-party-composition');
  }
  const previous = scenario.linkedModel;
  const usingSavedProfile = isZero(currentOverall);
  if (usingSavedProfile && previous?.state !== 'suspended') {
    return refused('unknown-population');
  }
  let turnouts = scenario.groups.map((group) => {
    const saved = previous?.groups[group.id]?.lastNonzeroTurnout;
    return usingSavedProfile && saved !== undefined
      ? fraction(saved)
      : fraction(group.turnout);
  });
  let rescaled = false;
  if (!usingSavedProfile && previous?.state === 'suspended') {
    const weighted = (profile: readonly Rational[]) =>
      sum(
        scenario.groups.map((group, index) => {
          const row = previous.groups[group.id];
          return row === undefined
            ? ZERO
            : mul(fraction(row.populationShare), profile[index]!);
        }),
      );
    let profileOverall = weighted(turnouts);
    if (isZero(profileOverall)) {
      turnouts = scenario.groups.map((group) => {
        const saved = previous.groups[group.id]?.lastNonzeroTurnout;
        return saved === undefined ? fraction(group.turnout) : fraction(saved);
      });
      profileOverall = weighted(turnouts);
      rescaled = true;
    }
    if (isZero(profileOverall)) return refused('unknown-population');
    if (compare(profileOverall, currentOverall) !== 0) {
      const factor = div(currentOverall, profileOverall);
      turnouts = turnouts.map((turnout, index) =>
        previous.groups[scenario.groups[index]!.id] === undefined
          ? turnout
          : mul(turnout, factor),
      );
      if (turnouts.some((turnout) => compare(turnout, ONE) > 0)) {
        return refused('turnout-overflow');
      }
      rescaled = true;
    }
  }
  const overall = usingSavedProfile
    ? sum(
        scenario.groups.map((group, index) => {
          const row = previous?.groups[group.id];
          return row === undefined
            ? ZERO
            : mul(fraction(row.populationShare), turnouts[index]!);
        }),
      )
    : currentOverall;
  if (isZero(overall)) return refused('unknown-population');
  const rows: [string, LinkedGroup][] = [];
  for (const [index, group] of scenario.groups.entries()) {
    const turnout = turnouts[index]!;
    const contributions = scenario.parties.map((party) =>
      party.composition === null
        ? ZERO
        : mul(
            fraction(party.voteShare),
            fraction(party.composition[group.id]!),
          ),
    );
    const total = sum(contributions);
    const prior = previous?.groups[group.id];
    if (isZero(turnout)) {
      if (
        prior === undefined ||
        scenario.parties.some(
          (party) => !Object.hasOwn(prior.preferences, party.id),
        )
      ) {
        return refused('unknown-population');
      }
      if (isPositive(total)) return refused('inconsistent-demographics');
      rows.push([
        group.id,
        {
          ...prior,
          lastNonzeroTurnout: usingSavedProfile
            ? prior.lastNonzeroTurnout
            : fractionParts(turnout),
        },
      ]);
      continue;
    }
    const populationShare = div(mul(overall, total), turnout);
    const preferences = Object.fromEntries(
      scenario.parties.map((party, index) => [
        party.id,
        fractionParts(isZero(total) ? ZERO : div(contributions[index]!, total)),
      ]),
    );
    rows.push([
      group.id,
      {
        populationShare: fractionParts(populationShare),
        preferences,
        allowedPartyIds:
          prior?.allowedPartyIds ?? scenario.parties.map((party) => party.id),
        lastNonzeroTurnout: fractionParts(turnout),
      },
    ]);
  }
  if (
    compare(sum(rows.map(([, row]) => fraction(row.populationShare))), ONE) !==
    0
  ) {
    return refused('inconsistent-demographics');
  }
  const draft = migrated(state);
  return commit(
    withModel(
      rescaled
        ? {
            ...draft,
            groups: draft.groups.map((group, index) => ({
              ...group,
              turnout: fractionParts(turnouts[index]!),
            })),
          }
        : draft,
      { state: 'current', groups: Object.fromEntries(rows) },
    ),
  );
}

/** Availability is evaluated without creating or changing the stored basis. */
export function linkedTurnoutAvailability(
  input: unknown,
): 'ready' | LinkedEditFailure {
  const state = context(input);
  if (!state.ok) return state.reason;
  if (state.scenario.linkedModel?.state === 'suspended')
    return 'suspended-model';
  if (state.scenario.linkedModel?.state === 'current') return 'ready';
  const built = buildLinkedBasis(input);
  return built.ok ? 'ready' : built.reason;
}

function availableBasis(input: unknown): LinkedEditResult {
  const state = context(input);
  if (!state.ok) return state;
  if (state.scenario.linkedModel !== undefined) {
    return { ok: true, draft: state.draft };
  }
  const basis = buildLinkedBasis(input);
  if (basis.ok) return basis;
  switch (basis.reason) {
    case 'unknown-party-composition':
    case 'unknown-population':
    case 'inconsistent-demographics':
    case 'precision-limit':
      return { ok: true, draft: state.draft };
    default:
      return basis;
  }
}

export function editPartyShareWithAvailableBasis(
  input: unknown,
  partyId: string,
  percentText: string,
  lockedPartyIds: readonly string[],
): LinkedEditResult {
  const basis = availableBasis(input);
  return basis.ok
    ? editLinkedPartyShare(basis.draft, partyId, percentText, lockedPartyIds)
    : basis;
}

export function editOverallTurnoutWithAvailableBasis(
  input: unknown,
  percentText: string,
): LinkedEditResult {
  const basis = availableBasis(input);
  return basis.ok ? editLinkedOverallTurnout(basis.draft, percentText) : basis;
}

function matrix(
  scenario: PartyScenario,
  model: LinkedModel,
  turnouts: readonly Rational[],
): {
  readonly ballots: Rational[];
  readonly votes: Rational[][];
  readonly total: Rational;
} {
  const ballots = scenario.groups.map((group, index) =>
    mul(fraction(model.groups[group.id]!.populationShare), turnouts[index]!),
  );
  const votes = scenario.groups.map((group, index) =>
    scenario.parties.map((party) =>
      mul(
        ballots[index]!,
        fraction(model.groups[group.id]!.preferences[party.id]!),
      ),
    ),
  );
  return { ballots, votes, total: sum(ballots) };
}

function updateParties(
  draft: Draft,
  scenario: PartyScenario,
  votes: readonly (readonly Rational[])[],
  total: Rational,
): Draft {
  if (isZero(total)) return draft;
  const parties = scenario.parties.map((party, partyIndex) => {
    const column = votes.map((row) => row[partyIndex]!);
    const partyTotal = sum(column);
    return {
      id: party.id,
      voteShare: fractionParts(div(partyTotal, total)),
      composition: isZero(partyTotal)
        ? party.composition
        : Object.fromEntries(
            scenario.groups.map((group, index) => [
              group.id,
              fractionParts(div(column[index]!, partyTotal)),
            ]),
          ),
    };
  });
  return {
    ...draft,
    parties: draft.parties.map((party) => {
      const updated = parties.find((entry) => entry.id === party.id);
      if (updated === undefined)
        throw new Error('Party disappeared during linked edit');
      return {
        ...party,
        voteShare: updated.voteShare,
        composition: updated.composition,
      };
    }),
  };
}

function withTurnouts(
  state: Ready,
  model: LinkedModel,
  turnouts: readonly Rational[],
  remember: boolean,
): { readonly draft: Draft; readonly model: LinkedModel } {
  const rows = Object.fromEntries(
    state.scenario.groups.map((group, index) => [
      group.id,
      {
        ...model.groups[group.id]!,
        ...(remember
          ? { lastNonzeroTurnout: fractionParts(turnouts[index]!) }
          : {}),
      },
    ]),
  );
  const updated: LinkedModel = { state: 'current', groups: rows };
  const draft = withModel(
    {
      ...migrated(state),
      groups: state.draft.groups.map((group, index) => ({
        ...group,
        turnout: fractionParts(turnouts[index]!),
      })),
    },
    updated,
  );
  return { draft, model: updated };
}

export function editLinkedGroupTurnout(
  input: unknown,
  groupId: string,
  percentText: string,
): LinkedEditResult {
  let state = context(input);
  if (!state.ok) return state;
  if (!state.scenario.groups.some((group) => group.id === groupId)) {
    return refused('unknown-group');
  }
  const requested = percent(percentText);
  if (requested === null) return refused('invalid-percent');
  if (state.scenario.linkedModel?.state === 'suspended')
    return refused('suspended-model');
  if (state.scenario.linkedModel === undefined) {
    const built = buildLinkedBasis(input);
    if (!built.ok) return built;
    state = context(built.draft);
    if (!state.ok) return state;
  }
  const model = state.scenario.linkedModel;
  if (model === undefined || model.state !== 'current') {
    throw new Error('A successful linked basis must be current');
  }
  const turnouts = state.scenario.groups.map((group) =>
    group.id === groupId ? requested : fraction(group.turnout),
  );
  const calculated = matrix(state.scenario, model, turnouts);
  const updated = withTurnouts(
    state,
    model,
    turnouts,
    isPositive(calculated.total),
  );
  const next = updateParties(
    updated.draft,
    state.scenario,
    calculated.votes,
    calculated.total,
  );
  return commit({
    ...next,
    rules: {
      ...object(next.rules),
      overallTurnout: fractionParts(calculated.total),
    },
  });
}

export function editLinkedOverallTurnout(
  input: unknown,
  percentText: string,
): LinkedEditResult {
  const state = context(input);
  if (!state.ok) return state;
  const requested = percent(percentText);
  if (requested === null) return refused('invalid-percent');
  const model = state.scenario.linkedModel;
  if (model === undefined || model.state === 'suspended') {
    const draft = migrated(state);
    return commit({
      ...draft,
      rules: {
        ...object(draft.rules),
        overallTurnout: fractionParts(requested),
      },
    });
  }
  const current = fraction(state.scenario.rules.overallTurnout);
  const profile = state.scenario.groups.map((group) =>
    isZero(current)
      ? fraction(model.groups[group.id]!.lastNonzeroTurnout)
      : fraction(group.turnout),
  );
  const baseline = matrix(state.scenario, model, profile).total;
  if (isZero(baseline) && !isZero(requested))
    return refused('unknown-population');
  const turnouts = isZero(baseline)
    ? profile
    : profile.map((turnout) => mul(turnout, div(requested, baseline)));
  if (turnouts.some((turnout) => compare(turnout, ONE) > 0)) {
    return refused('turnout-overflow');
  }
  const updated = withTurnouts(state, model, turnouts, isPositive(requested));
  return commit({
    ...updated.draft,
    rules: {
      ...object(updated.draft.rules),
      overallTurnout: fractionParts(requested),
    },
  });
}

export function editLinkedPartyShare(
  input: unknown,
  partyId: string,
  percentText: string,
  lockedPartyIds: readonly string[],
): LinkedEditResult {
  const state = context(input);
  if (!state.ok) return state;
  const adjusted = editPartyShare(
    { ...state.scenario, linkedModel: undefined },
    partyId,
    percentText,
    lockedPartyIds,
  );
  if (!adjusted.ok) return refused(adjusted.reason, adjusted.issues);
  const model = state.scenario.linkedModel;
  const base = migrated(state);
  if (model === undefined || model.state === 'suspended') {
    return commit({
      ...base,
      parties: base.parties.map((party, index) => ({
        ...party,
        voteShare: adjusted.scenario.parties[index]!.voteShare,
      })),
    });
  }
  const current = fraction(state.scenario.rules.overallTurnout);
  const turnouts = state.scenario.groups.map((group) =>
    isZero(current)
      ? fraction(model.groups[group.id]!.lastNonzeroTurnout)
      : fraction(group.turnout),
  );
  const before = matrix(state.scenario, model, turnouts);
  if (isZero(before.total)) return refused('unknown-population');
  const changes = Object.fromEntries(
    state.scenario.parties.map((party, index) => [
      party.id,
      mul(
        before.total,
        sub(
          fraction(adjusted.scenario.parties[index]!.voteShare),
          fraction(party.voteShare),
        ),
      ),
    ]),
  );
  const groups: LinkedFlowGroup[] = state.scenario.groups.map(
    (group, index) => ({
      id: group.id,
      total: before.ballots[index]!,
      votes: Object.fromEntries(
        state.scenario.parties.map((party, partyIndex) => [
          party.id,
          before.votes[index]![partyIndex]!,
        ]),
      ),
      allowedPartyIds: model.groups[group.id]!.allowedPartyIds,
    }),
  );
  const transferred = transferLinkedVotes(groups, changes);
  if (!transferred.ok) return refused(transferred.reason);
  const votes = state.scenario.groups.map((group) =>
    state.scenario.parties.map(
      (party) => transferred.votes[group.id]![party.id]!,
    ),
  );
  const updatedModel: LinkedModel = {
    state: 'current',
    groups: Object.fromEntries(
      state.scenario.groups.map((group, index) => [
        group.id,
        {
          ...model.groups[group.id]!,
          preferences: isZero(before.ballots[index]!)
            ? model.groups[group.id]!.preferences
            : Object.fromEntries(
                state.scenario.parties.map((party, partyIndex) => [
                  party.id,
                  fractionParts(
                    div(votes[index]![partyIndex]!, before.ballots[index]!),
                  ),
                ]),
              ),
        },
      ]),
    ),
  };
  return commit(
    updateParties(
      withModel(base, updatedModel),
      state.scenario,
      votes,
      before.total,
    ),
  );
}
