import { percentStops, roundExactPercents, roundToPlaces } from './numeric';
import {
  compare,
  div,
  isPositive,
  isZero,
  mul,
  parseDecimal,
  rational,
  sum,
  toDecimalString,
  type Rational,
} from './rational';
import { COUNT_PLACES, PERCENT_PLACES } from './report';
import type { Group, GroupScenario, PartyScenario, Scenario } from './schema';
import { partyModeGroupPopulations, type VoteResult } from './votes';

export {
  beginPartyComposition,
  clearPartyComposition,
  editCompositionShare,
  type CompositionEditFailure,
  type CompositionEditResult,
} from './compositionEdit';

/** A list or a block whose electorate is broken down by group. */
export interface CompositionTarget {
  readonly kind: 'party' | 'block';
  readonly id: string;
}

/**
 * `potential`: group population × the group's weight for the list, before
 * turnout. `valid`: the list's valid votes from each group.
 */
export type CompositionBasis = 'potential' | 'valid';

export interface CompositionRow {
  readonly groupId: string;
  readonly amount: Rational;
  /** Share of the target's total; null when the total is zero. */
  readonly share: Rational | null;
}

export interface PartyCompositionRow {
  readonly groupId: string;
  readonly amount: Rational | null;
  readonly share: Rational | null;
}

export interface Composition {
  readonly target: CompositionTarget;
  readonly basis: CompositionBasis;
  readonly rows: readonly CompositionRow[];
  readonly total: Rational;
}

export interface PartyComposition {
  readonly target: CompositionTarget;
  readonly basis: CompositionBasis;
  readonly rows: readonly PartyCompositionRow[];
  readonly total: Rational | null;
  readonly unknownAmount: Rational | null;
  readonly unknownShare: Rational | null;
}

const ZERO = rational(0n);
const HUNDRED = rational(100n);

function targetParties(
  scenario: Scenario,
  target: CompositionTarget,
): ReadonlySet<string> {
  if (target.kind === 'party') {
    if (!scenario.parties.some((party) => party.id === target.id)) {
      throw new RangeError(`Unknown party ${target.id}`);
    }
    return new Set([target.id]);
  }
  if (!scenario.blocks.some((block) => block.id === target.id)) {
    throw new RangeError(`Unknown block ${target.id}`);
  }
  return new Set(
    scenario.parties
      .filter((party) => party.blockId === target.id)
      .map((party) => party.id),
  );
}

function potentialWeight(group: Group, parties: ReadonlySet<string>): Rational {
  return sum(
    group.allowedPartyIds
      .filter((partyId) => parties.has(partyId))
      .map((partyId) => parseDecimal(group.voteWeights[partyId] ?? '0')),
  );
}

/**
 * Who makes up the electorate of a list or a block, one row per group in
 * scenario order. `votes` is the vote result of the year being shown.
 */
export function electorateComposition(
  scenario: GroupScenario,
  votes: VoteResult,
  target: CompositionTarget,
  basis: CompositionBasis,
): Composition;

export function electorateComposition(
  scenario: PartyScenario,
  votes: VoteResult,
  target: CompositionTarget,
  basis: CompositionBasis,
): PartyComposition;
export function electorateComposition(
  scenario: Scenario,
  votes: VoteResult,
  target: CompositionTarget,
  basis: CompositionBasis,
): Composition | PartyComposition;
export function electorateComposition(
  scenario: Scenario,
  votes: VoteResult,
  target: CompositionTarget,
  basis: CompositionBasis,
): Composition | PartyComposition {
  if (scenario.inputMode === 'groups') {
    const parties = targetParties(scenario, target);
    const amounts = scenario.groups.map((group, index) => {
      const groupVotes = votes.groups[index];
      if (groupVotes === undefined) {
        return { groupId: group.id, amount: ZERO };
      }
      const amount =
        basis === 'potential'
          ? mul(groupVotes.population, potentialWeight(group, parties))
          : sum(
              groupVotes.contributions
                .filter((entry) => parties.has(entry.partyId))
                .map((entry) => entry.votes),
            );
      return { groupId: group.id, amount };
    });
    const total = sum(amounts.map((entry) => entry.amount));
    return {
      target,
      basis,
      rows: amounts.map((entry) => ({
        ...entry,
        share: isZero(total) ? null : div(entry.amount, total),
      })),
      total,
    };
  }

  const partyIds = targetParties(scenario, target);
  const selected = scenario.parties.filter((party) => partyIds.has(party.id));
  const votesByParty = new Map(
    votes.parties.map((entry) => [entry.partyId, entry.votes]),
  );
  const total = sum(
    selected.map((party) => votesByParty.get(party.id) ?? ZERO),
  );
  if (basis === 'potential') {
    return {
      target,
      basis,
      rows: scenario.groups.map((group) => ({
        groupId: group.id,
        amount: null,
        share: null,
      })),
      total: null,
      unknownAmount: null,
      unknownShare: null,
    };
  }
  const unknownAmount = sum(
    selected.flatMap((party) =>
      party.composition === null ? [votesByParty.get(party.id) ?? ZERO] : [],
    ),
  );
  const entirelyUnknown =
    isPositive(total) && compare(unknownAmount, total) === 0;
  const rows = scenario.groups.map((group) => {
    if (entirelyUnknown) {
      return { groupId: group.id, amount: null, share: null };
    }
    const amount = sum(
      selected.flatMap((party) => {
        if (party.composition === null) {
          return [];
        }
        const share = party.composition[group.id];
        return share === undefined
          ? []
          : [
              mul(
                votesByParty.get(party.id) ?? ZERO,
                rational(BigInt(share.numerator), BigInt(share.denominator)),
              ),
            ];
      }),
    );
    return {
      groupId: group.id,
      amount,
      share: isZero(total) ? null : div(amount, total),
    };
  });
  return {
    target,
    basis,
    rows,
    total,
    unknownAmount,
    unknownShare: isZero(total) ? null : div(unknownAmount, total),
  };
}

/** The groups that give a target a positive exact share, and the largest. */
export interface VoteSources {
  /** Rows with a positive share, in scenario order. */
  readonly rows: readonly CompositionRow[];
  /** The row with the largest exact share, the first on a tie; null if none. */
  readonly top: CompositionRow | null;
}

export function voteSources(composition: Composition): VoteSources {
  const rows: CompositionRow[] = [];
  let top: { readonly row: CompositionRow; readonly share: Rational } | null =
    null;
  for (const row of composition.rows) {
    const { share } = row;
    if (share === null || !isPositive(share)) {
      continue;
    }
    rows.push(row);
    if (top === null || compare(share, top.share) > 0) {
      top = { row, share };
    }
  }
  return { rows, top: top === null ? null : top.row };
}

/** A rounded amount and its share of the target total as a percent. */
export interface CompositionCell {
  readonly amount: string | null;
  /** Null when the total of the basis is zero. */
  readonly share: string | null;
}

export interface CompositionReportRow {
  readonly groupId: string;
  readonly name: string;
  readonly potential: CompositionCell;
  readonly valid: CompositionCell;
}

/** Both bases side by side, rounded for display (Section 14.3). */
export interface CompositionReport {
  readonly target: CompositionTarget;
  /** The name of the list or the block. */
  readonly name: string;
  readonly rows: readonly CompositionReportRow[];
  readonly potentialTotal: string | null;
  readonly validTotal: string;
  readonly unknownComposition?: CompositionCell | null;
  readonly entirelyUnknown?: boolean;
  readonly hasValidVotes: boolean;
  readonly demographicState?:
    | 'consistent'
    | 'unknown-party-composition'
    | 'unknown-population'
    | 'inconsistent-demographics'
    | 'suspended-model';
}

function displayCell(
  row: CompositionRow | PartyCompositionRow | undefined,
): CompositionCell {
  if (row === undefined) {
    return { amount: roundToPlaces(ZERO, COUNT_PLACES), share: null };
  }
  return {
    amount:
      row.amount === null ? null : roundToPlaces(row.amount, COUNT_PLACES),
    share:
      row.share === null
        ? null
        : roundToPlaces(mul(row.share, HUNDRED), PERCENT_PLACES),
  };
}

export function buildCompositionReport(
  scenario: Scenario,
  votes: VoteResult,
  target: CompositionTarget,
): CompositionReport {
  const potential = electorateComposition(scenario, votes, target, 'potential');
  const valid = electorateComposition(scenario, votes, target, 'valid');
  const name =
    target.kind === 'party'
      ? scenario.parties.find((party) => party.id === target.id)?.name
      : scenario.blocks.find((block) => block.id === target.id)?.name;
  const demographics =
    scenario.inputMode === 'parties'
      ? partyModeGroupPopulations(scenario, votes.parties, 0)
      : null;
  return {
    target,
    name: name ?? target.id,
    rows: scenario.groups.map((group, index) => ({
      groupId: group.id,
      name: group.name,
      potential: displayCell(potential.rows[index]),
      valid: displayCell(valid.rows[index]),
    })),
    potentialTotal:
      potential.total === null
        ? null
        : roundToPlaces(potential.total, COUNT_PLACES),
    validTotal:
      valid.total === null ? '—' : roundToPlaces(valid.total, COUNT_PLACES),
    hasValidVotes: valid.total !== null && isPositive(valid.total),
    ...(demographics === null
      ? {}
      : {
          demographicState:
            'kind' in demographics ? demographics.reason : 'consistent',
        }),
    ...('unknownAmount' in valid && valid.total !== null
      ? {
          entirelyUnknown:
            valid.unknownAmount !== null &&
            isPositive(valid.total) &&
            compare(valid.unknownAmount, valid.total) === 0,
        }
      : {}),
    ...(valid.total === null
      ? {}
      : {
          unknownComposition:
            'unknownAmount' in valid &&
            valid.unknownAmount !== null &&
            isPositive(valid.unknownAmount)
              ? {
                  amount: roundToPlaces(valid.unknownAmount, COUNT_PLACES),
                  share:
                    valid.unknownShare === null
                      ? null
                      : roundToPlaces(
                          mul(valid.unknownShare, HUNDRED),
                          PERCENT_PLACES,
                        ),
                }
              : null,
        }),
  };
}

export interface CompositionDisplayRow {
  readonly groupId: string;
  readonly inputPercent: string;
  readonly roundedPercent: string;
  readonly pieEnd: string;
  readonly approximate: boolean;
}

/** Display text and pie boundaries, without changing the exact stored shares. */
export function partyCompositionDisplay(
  scenario: PartyScenario,
  partyId: string,
): readonly CompositionDisplayRow[] | null {
  const party = scenario.parties.find((entry) => entry.id === partyId);
  if (party === undefined) {
    throw new RangeError(`Unknown party ${partyId}`);
  }
  if (party.composition === null) {
    return null;
  }
  const composition = party.composition;
  const values = scenario.groups.map((group) => {
    const share = composition[group.id];
    if (share === undefined) {
      throw new RangeError(`Missing composition for group ${group.id}`);
    }
    return mul(
      rational(BigInt(share.numerator), BigInt(share.denominator)),
      HUNDRED,
    );
  });
  const rounded = roundExactPercents(values, PERCENT_PLACES);
  const stops = percentStops(rounded);
  return scenario.groups.map((group, index) => {
    const value = values[index]!;
    const inputPercent = toDecimalString(
      parseDecimal(roundToPlaces(value, 16)),
    );
    return {
      groupId: group.id,
      inputPercent,
      roundedPercent: rounded[index]!,
      pieEnd: stops[index]!,
      approximate: compare(parseDecimal(inputPercent), value) !== 0,
    };
  });
}
