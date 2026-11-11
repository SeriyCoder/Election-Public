import { isDraft, type Draft } from './edit';
import { fractionParts, parsePercent } from './numeric';
import { compare, div, rational } from './rational';
import { redistributeShares } from './redistribute';
import {
  validateScenario,
  type ExactFraction,
  type PartyModeParty,
  type PartyScenario,
  type ValidationIssue,
} from './schema';

export type CompositionEditFailure =
  | 'invalid-scenario'
  | 'party-mode-required'
  | 'unknown-party'
  | 'unknown-group'
  | 'no-groups'
  | 'already-known'
  | 'composition-unknown'
  | 'invalid-percent'
  | 'no-unlocked-recipient'
  | 'precision-limit'
  | 'invalid-result';

export type CompositionEditResult =
  | { readonly ok: true; readonly draft: Draft }
  | {
      readonly ok: false;
      readonly reason: CompositionEditFailure;
      readonly issues: readonly ValidationIssue[];
    };

type Context =
  | {
      readonly ok: true;
      readonly draft: Draft;
      readonly scenario: PartyScenario;
      readonly party: PartyModeParty;
    }
  | Extract<CompositionEditResult, { readonly ok: false }>;

const ZERO = rational(0n);
const HUNDRED = rational(100n);

function refused(
  reason: CompositionEditFailure,
  issues: readonly ValidationIssue[] = [],
): Extract<CompositionEditResult, { readonly ok: false }> {
  return { ok: false, reason, issues };
}

function context(input: unknown, partyId: string): Context {
  const validation = validateScenario(input);
  if (!validation.ok) {
    return refused('invalid-scenario', validation.issues);
  }
  if (validation.scenario.inputMode !== 'parties') {
    return refused('party-mode-required');
  }
  const party = validation.scenario.parties.find((item) => item.id === partyId);
  if (party === undefined) {
    return refused('unknown-party');
  }
  if (!isDraft(input)) {
    throw new Error('A valid party scenario must also be an editable draft');
  }
  return { ok: true, draft: input, scenario: validation.scenario, party };
}

function applyComposition(
  state: Extract<Context, { readonly ok: true }>,
  composition: Readonly<Record<string, ExactFraction>> | null,
): CompositionEditResult {
  const linked = state.draft.linkedModel;
  const suspended =
    state.scenario.linkedModel?.state === 'current' &&
    typeof linked === 'object' &&
    linked !== null &&
    !Array.isArray(linked)
      ? { linkedModel: { ...linked, state: 'suspended' } }
      : {};
  const draft: Draft = {
    ...state.draft,
    ...suspended,
    parties: state.draft.parties.map((party) =>
      party.id === state.party.id ? { ...party, composition } : party,
    ),
  };
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

export function beginPartyComposition(
  input: unknown,
  partyId: string,
): CompositionEditResult {
  const state = context(input, partyId);
  if (!state.ok) return state;
  if (state.party.composition !== null) return refused('already-known');
  if (state.scenario.groups.length === 0) return refused('no-groups');
  const share = fractionParts(
    rational(1n, BigInt(state.scenario.groups.length)),
  );
  const composition = Object.fromEntries(
    state.scenario.groups.map((group) => [group.id, { ...share }]),
  );
  return applyComposition(state, composition);
}

export function editCompositionShare(
  input: unknown,
  partyId: string,
  groupId: string,
  percentText: string,
): CompositionEditResult {
  const state = context(input, partyId);
  if (!state.ok) return state;
  const composition = state.party.composition;
  if (composition === null) return refused('composition-unknown');
  const selected = state.scenario.groups.findIndex(
    (group) => group.id === groupId,
  );
  if (selected < 0) return refused('unknown-group');
  const percent =
    typeof percentText === 'string' ? parsePercent(percentText) : null;
  if (
    percent === null ||
    compare(percent, ZERO) < 0 ||
    compare(percent, HUNDRED) > 0
  ) {
    return refused('invalid-percent');
  }
  const redistributed = redistributeShares(
    state.scenario.groups.map((group) => {
      const share = composition[group.id]!;
      return {
        value: rational(BigInt(share.numerator), BigInt(share.denominator)),
        locked: false,
      };
    }),
    selected,
    div(percent, HUNDRED),
  );
  if (!redistributed.ok) {
    if (redistributed.reason === 'locked-total-exceeded') {
      throw new Error('An unlocked composition cannot exceed its locked total');
    }
    return refused(redistributed.reason);
  }
  const updated = Object.fromEntries(
    state.scenario.groups.map((group, index) => [
      group.id,
      fractionParts(redistributed.values[index]!),
    ]),
  );
  return applyComposition(state, updated);
}

export function clearPartyComposition(
  input: unknown,
  partyId: string,
): CompositionEditResult {
  const state = context(input, partyId);
  return state.ok ? applyComposition(state, null) : state;
}
