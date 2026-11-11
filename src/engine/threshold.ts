import {
  div,
  greaterThanOrEqual,
  isPositive,
  isZero,
  parseDecimal,
  rational,
  sum,
  type Rational,
} from './rational';
import type { Scenario } from './schema';
import type { VoteResult } from './votes';

export type QualificationStatus = 'qualified' | 'below-threshold' | 'no-votes';

export type NoAllocationReason = 'no-valid-votes' | 'no-party-qualifies';

export interface PartyQualification {
  readonly partyId: string;
  readonly votes: Rational;
  readonly status: QualificationStatus;
  readonly allocationShare: Rational | null;
}

export interface ThresholdResult {
  readonly threshold: Rational;
  readonly parties: readonly PartyQualification[];
  readonly qualifyingVotes: Rational;
  readonly belowThresholdVotes: Rational;
  readonly noAllocation: NoAllocationReason | null;
}

const ZERO = rational(0n);

export function applyThreshold(
  scenario: Scenario,
  votes: VoteResult,
): ThresholdResult {
  const threshold = parseDecimal(scenario.rules.threshold);

  const classified = votes.parties.map((party) => {
    let status: QualificationStatus = 'no-votes';
    if (isPositive(party.votes) && party.voteShare !== null) {
      status = greaterThanOrEqual(party.voteShare, threshold)
        ? 'qualified'
        : 'below-threshold';
    }
    return { partyId: party.partyId, votes: party.votes, status };
  });

  const totalOf = (status: QualificationStatus): Rational =>
    sum(
      classified
        .filter((party) => party.status === status)
        .map((party) => party.votes),
    );
  const qualifyingVotes = totalOf('qualified');
  const belowThresholdVotes = totalOf('below-threshold');

  let noAllocation: NoAllocationReason | null = null;
  if (isZero(votes.allValidVotes)) {
    noAllocation = 'no-valid-votes';
  } else if (isZero(qualifyingVotes)) {
    noAllocation = 'no-party-qualifies';
  }

  const parties = classified.map((party): PartyQualification => ({
    ...party,
    allocationShare:
      noAllocation !== null
        ? null
        : party.status === 'qualified'
          ? div(party.votes, qualifyingVotes)
          : ZERO,
  }));

  return {
    threshold,
    parties,
    qualifyingVotes,
    belowThresholdVotes,
    noAllocation,
  };
}
