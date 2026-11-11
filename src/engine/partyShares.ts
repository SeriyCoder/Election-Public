import { fractionParts, parsePercent } from './numeric';
import { compare, div, rational, type Rational } from './rational';
import { redistributeShares } from './redistribute';
import {
  validateScenario,
  type ExactFraction,
  type PartyScenario,
  type ValidationIssue,
} from './schema';

export type PartyShareEditFailure =
  | 'invalid-scenario'
  | 'party-mode-required'
  | 'unknown-party'
  | 'unknown-lock'
  | 'invalid-percent'
  | 'locked-total-exceeded'
  | 'no-unlocked-recipient'
  | 'precision-limit'
  | 'invalid-result';

export type PartyShareEditResult =
  | { readonly ok: true; readonly scenario: PartyScenario }
  | {
      readonly ok: false;
      readonly reason: PartyShareEditFailure;
      readonly issues: readonly ValidationIssue[];
    };

const ZERO = rational(0n);
const HUNDRED = rational(100n);

function fraction(value: ExactFraction): Rational {
  return rational(BigInt(value.numerator), BigInt(value.denominator));
}

function refused(
  reason: PartyShareEditFailure,
  issues: readonly ValidationIssue[] = [],
): PartyShareEditResult {
  return { ok: false, reason, issues };
}

/**
 * Produces a share-only candidate. Linked group edits must also update the
 * group-party matrix before committing the candidate to a workspace.
 */
export function editPartyShare(
  input: unknown,
  partyId: string,
  percentText: string,
  lockedPartyIds: readonly string[],
): PartyShareEditResult {
  const validation = validateScenario(input);
  if (!validation.ok) {
    return refused('invalid-scenario', validation.issues);
  }
  const scenario = validation.scenario;
  if (scenario.inputMode !== 'parties') {
    return refused('party-mode-required');
  }
  const ids = new Set(scenario.parties.map((party) => party.id));
  if (!ids.has(partyId)) {
    return refused('unknown-party');
  }
  if (
    !Array.isArray(lockedPartyIds) ||
    lockedPartyIds.some((id) => !ids.has(id))
  ) {
    return refused('unknown-lock');
  }
  const percent =
    typeof percentText === 'string' ? parsePercent(percentText) : null;
  if (
    percent === null ||
    compare(percent, ZERO) < 0 ||
    compare(percent, HUNDRED) > 0
  ) {
    return refused('invalid-percent');
  }

  const locked = new Set(lockedPartyIds);
  const requested = div(percent, HUNDRED);
  const redistributed = redistributeShares(
    scenario.parties.map((party) => ({
      value: fraction(party.voteShare),
      locked: locked.has(party.id),
    })),
    scenario.parties.findIndex((party) => party.id === partyId),
    requested,
  );
  if (!redistributed.ok) {
    return refused(redistributed.reason);
  }
  const parties = scenario.parties.map((party, index) => ({
    ...party,
    voteShare: fractionParts(redistributed.values[index]!),
  }));

  const result = validateScenario({ ...scenario, parties });
  if (!result.ok) {
    const reason = result.issues.some((issue) => issue.code === 'too-long')
      ? 'precision-limit'
      : 'invalid-result';
    return refused(reason, result.issues);
  }
  if (result.scenario.inputMode !== 'parties') {
    throw new Error('Validating a party-share edit changed the input mode');
  }
  return { ok: true, scenario: result.scenario };
}
