import {
  add,
  compare,
  div,
  equals,
  fromInteger,
  isPositive,
  isZero,
  mul,
  parseDecimal,
  pow,
  rational,
  sub,
  sum,
  type Rational,
} from './rational';
import {
  LIMITS,
  type ExactFraction,
  type GroupScenario,
  type PartyScenario,
  type Scenario,
} from './schema';

const ZERO = rational(0n);
const ONE = rational(1n);

export interface PartyContribution {
  readonly partyId: string;
  readonly votes: Rational;
}

export interface GroupVotes {
  readonly groupId: string;
  readonly population: Rational;
  readonly available: Rational;
  readonly unavailable: Rational;
  readonly cast: Rational;
  readonly abstaining: Rational;
  readonly valid: Rational;
  readonly invalid: Rational;
  readonly contributions: readonly PartyContribution[];
}

export interface PartyVotes {
  readonly partyId: string;
  readonly votes: Rational;
  readonly voteShare: Rational | null;
}

export interface VoteTotals {
  readonly population: Rational;
  readonly available: Rational;
  readonly unavailable: Rational;
  readonly cast: Rational;
  readonly abstaining: Rational;
  readonly valid: Rational;
  readonly invalid: Rational;
}

export interface VoteResult {
  readonly groups: readonly GroupVotes[];
  /** Known projected party-mode populations, in scenario group order. */
  readonly groupPopulations?: readonly Rational[];
  readonly parties: readonly PartyVotes[];
  readonly totals: VoteTotals;
  readonly allValidVotes: Rational;
  readonly turnout: Rational;
}

export type ProjectionUnavailableReason =
  | 'unknown-party-composition'
  | 'unknown-population'
  | 'inconsistent-demographics'
  | 'suspended-model';

export interface ProjectionUnavailable {
  readonly kind: 'unavailable';
  readonly reason: ProjectionUnavailableReason;
}

export type VoteComputation = VoteResult | ProjectionUnavailable;

function clampUnit(value: Rational): Rational {
  if (compare(value, ZERO) < 0) {
    return ZERO;
  }
  return compare(value, ONE) > 0 ? ONE : value;
}

/** Refuses a year that is not an integer from 0 to LIMITS.projectionYears. */
export function checkYear(year: number): void {
  if (
    !Number.isSafeInteger(year) ||
    year < 0 ||
    year > LIMITS.projectionYears
  ) {
    throw new RangeError(
      `Year must be an integer from 0 to ${LIMITS.projectionYears}`,
    );
  }
}

/** The turnout input of year `year`: turnout + year · turnoutChange in [0, 1]. */
export function groupTurnout(
  group: {
    readonly turnout: string | ExactFraction;
    readonly turnoutChange: string;
  },
  year = 0,
): Rational {
  checkYear(year);
  return clampUnit(
    add(
      typeof group.turnout === 'string'
        ? parseDecimal(group.turnout)
        : exactFraction(group.turnout),
      mul(fromInteger(year), parseDecimal(group.turnoutChange)),
    ),
  );
}

function exactFraction(value: {
  readonly numerator: string;
  readonly denominator: string;
}): Rational {
  return rational(BigInt(value.numerator), BigInt(value.denominator));
}

function unavailable(
  reason: ProjectionUnavailableReason,
): ProjectionUnavailable {
  return { kind: 'unavailable', reason };
}

interface PartyModeGroups {
  readonly preferences: readonly (readonly Rational[])[];
  readonly populations: readonly Rational[];
}

function derivePartyModeGroups(
  scenario: PartyScenario,
  baseVotes: readonly PartyContribution[],
  validRate: Rational,
): PartyModeGroups | ProjectionUnavailable {
  if (
    baseVotes.length !== scenario.parties.length ||
    scenario.parties.some(
      (party, index) => baseVotes[index]?.partyId !== party.id,
    )
  ) {
    throw new RangeError('Baseline votes must match the scenario party order');
  }
  if (scenario.linkedModel?.state === 'suspended') {
    return unavailable('suspended-model');
  }
  if (scenario.linkedModel?.state === 'current') {
    const model = scenario.linkedModel;
    const population = parseDecimal(scenario.rules.populationTotal);
    return {
      populations: scenario.groups.map((group) =>
        mul(population, exactFraction(model.groups[group.id]!.populationShare)),
      ),
      preferences: scenario.groups.map((group) =>
        scenario.parties.map((party) =>
          exactFraction(model.groups[group.id]!.preferences[party.id]!),
        ),
      ),
    };
  }
  if (
    isZero(exactFraction(scenario.rules.overallTurnout)) ||
    isZero(validRate)
  ) {
    return unavailable('unknown-population');
  }
  if (
    scenario.parties.some(
      (party) =>
        isPositive(exactFraction(party.voteShare)) &&
        party.composition === null,
    )
  ) {
    return unavailable('unknown-party-composition');
  }
  if (scenario.groups.length === 0) {
    return unavailable('unknown-population');
  }

  const groupShares = scenario.groups.map((group) =>
    scenario.parties.map((party, index) => {
      const composition = party.composition;
      const share =
        composition === null ? ZERO : exactFraction(composition[group.id]!);
      return mul(baseVotes[index]!.votes, share);
    }),
  );
  const groupTurnouts = scenario.groups.map((group) => groupTurnout(group, 0));
  const populations: Rational[] = [];
  for (let index = 0; index < scenario.groups.length; index += 1) {
    const groupValid = sum(groupShares[index]!);
    const turnout = groupTurnouts[index]!;
    if (isZero(turnout)) {
      return unavailable('unknown-population');
    }
    const groupCast = div(groupValid, validRate);
    populations.push(div(groupCast, turnout));
  }
  if (!equals(sum(populations), parseDecimal(scenario.rules.populationTotal))) {
    return unavailable('inconsistent-demographics');
  }
  return {
    populations,
    preferences: groupShares.map((shares) => {
      const total = sum(shares);
      return shares.map((share) => (isZero(total) ? ZERO : div(share, total)));
    }),
  };
}

function projectPartyPopulations(
  scenario: PartyScenario,
  populations: readonly Rational[],
  year: number,
): readonly Rational[] {
  return scenario.groups.map((group, index) =>
    mul(
      populations[index]!,
      pow(add(ONE, parseDecimal(group.growthRate)), year),
    ),
  );
}

/** Known party-mode populations, using the same assumptions as the projection. */
export function partyModeGroupPopulations(
  scenario: PartyScenario,
  baseVotes: readonly PartyContribution[],
  year: number,
):
  | {
      readonly baseline: readonly Rational[];
      readonly current: readonly Rational[];
    }
  | ProjectionUnavailable {
  checkYear(year);
  const groups = derivePartyModeGroups(
    scenario,
    baseVotes,
    parseDecimal(scenario.rules.validBallotRate),
  );
  if ('kind' in groups) {
    return groups;
  }
  return {
    baseline: groups.populations,
    current: projectPartyPopulations(scenario, groups.populations, year),
  };
}

function partyModeVotes(
  scenario: PartyScenario,
  year: number,
): VoteComputation {
  const population = parseDecimal(scenario.rules.populationTotal);
  const turnout = exactFraction(scenario.rules.overallTurnout);
  const validRate = parseDecimal(scenario.rules.validBallotRate);
  const cast = mul(population, turnout);
  const valid = mul(cast, validRate);
  const invalid = sub(cast, valid);
  const totalVotes = scenario.parties.map((party) => ({
    partyId: party.id,
    votes: mul(valid, exactFraction(party.voteShare)),
  }));
  const allValidVotes = sum(totalVotes.map((party) => party.votes));
  const parties: PartyVotes[] = totalVotes.map((party, index) => ({
    ...party,
    voteShare: isZero(allValidVotes)
      ? null
      : exactFraction(scenario.parties[index]!.voteShare),
  }));

  if (year > 0) {
    return projectPartyMode(scenario, year, totalVotes, validRate);
  }

  return {
    groups: [],
    parties,
    totals: {
      population,
      available: population,
      unavailable: ZERO,
      cast,
      abstaining: sub(population, cast),
      valid,
      invalid,
    },
    allValidVotes,
    turnout: isZero(population) ? ZERO : div(cast, population),
  };
}

function projectPartyMode(
  scenario: PartyScenario,
  year: number,
  baseVotes: readonly PartyContribution[],
  validRate: Rational,
): VoteComputation {
  const groups = derivePartyModeGroups(scenario, baseVotes, validRate);
  if ('kind' in groups) {
    return groups;
  }
  const { preferences, populations } = groups;
  const projectedPopulations = projectPartyPopulations(
    scenario,
    populations,
    year,
  );
  const projectedGroupCast = scenario.groups.map((group, index) =>
    mul(projectedPopulations[index]!, groupTurnout(group, year)),
  );
  const projectedGroupValid = projectedGroupCast.map((cast) =>
    mul(cast, validRate),
  );
  const parties: PartyVotes[] = scenario.parties.map((party, partyIndex) => {
    const votes = sum(
      scenario.groups.map((_, groupIndex) => {
        return mul(
          projectedGroupValid[groupIndex]!,
          preferences[groupIndex]![partyIndex]!,
        );
      }),
    );
    return {
      partyId: party.id,
      votes,
      voteShare: null,
    };
  });
  const allValidVotes = sum(parties.map((party) => party.votes));
  const normalized = parties.map((party) => ({
    ...party,
    voteShare: isZero(allValidVotes) ? null : div(party.votes, allValidVotes),
  }));
  const cast = sum(projectedGroupCast);
  const population = sum(projectedPopulations);
  const invalid = sub(cast, allValidVotes);
  return {
    groups: [],
    parties: normalized,
    groupPopulations: projectedPopulations,
    totals: {
      population,
      available: population,
      unavailable: ZERO,
      cast,
      abstaining: sub(population, cast),
      valid: allValidVotes,
      invalid,
    },
    allValidVotes,
    turnout: isZero(population) ? ZERO : div(cast, population),
  };
}

/**
 * Votes for year `year` (Section 14.2): each group's year-0 population grows
 * by (1 + growthRate)^year and its turnout moves by year · turnoutChange,
 * clamped to [0, 1]. Year 0 is the present-day scenario.
 */
function computeGroupVotes(scenario: GroupScenario, year: number): VoteResult {
  checkYear(year);
  const populationTotal = parseDecimal(scenario.rules.populationTotal);
  const partyTotals = new Map<string, Rational[]>(
    scenario.parties.map((party) => [party.id, []]),
  );

  const groups = scenario.groups.map((group): GroupVotes => {
    const population = mul(
      mul(populationTotal, parseDecimal(group.populationShare)),
      pow(add(ONE, parseDecimal(group.growthRate)), year),
    );
    const turnout = groupTurnout(group, year);
    const available = mul(population, parseDecimal(group.participationFactor));
    const cast = mul(available, turnout);
    const valid = mul(cast, parseDecimal(group.validBallotRate));
    const contributions = group.allowedPartyIds.map((partyId) => {
      const weight = Object.hasOwn(group.voteWeights, partyId)
        ? parseDecimal(group.voteWeights[partyId] ?? '0')
        : ZERO;
      const votes = mul(valid, weight);
      partyTotals.get(partyId)?.push(votes);
      return { partyId, votes };
    });
    return {
      groupId: group.id,
      population,
      available,
      unavailable: sub(population, available),
      cast,
      abstaining: sub(available, cast),
      valid,
      invalid: sub(cast, valid),
      contributions,
    };
  });

  const partyVotes = scenario.parties.map((party) => ({
    partyId: party.id,
    votes: sum(partyTotals.get(party.id) ?? []),
  }));
  const allValidVotes = sum(partyVotes.map((entry) => entry.votes));
  const parties = partyVotes.map((entry): PartyVotes => ({
    ...entry,
    voteShare: isZero(allValidVotes) ? null : div(entry.votes, allValidVotes),
  }));

  const total = (pick: (group: GroupVotes) => Rational): Rational =>
    sum(groups.map(pick));
  const totals: VoteTotals = {
    population: total((group) => group.population),
    available: total((group) => group.available),
    unavailable: total((group) => group.unavailable),
    cast: total((group) => group.cast),
    abstaining: total((group) => group.abstaining),
    valid: total((group) => group.valid),
    invalid: total((group) => group.invalid),
  };

  return {
    groups,
    parties,
    totals,
    allValidVotes,
    turnout: isZero(totals.population)
      ? ZERO
      : div(totals.cast, totals.population),
  };
}

export function computeVotes(scenario: Scenario): VoteResult;
export function computeVotes(scenario: Scenario, year: 0): VoteResult;
export function computeVotes(scenario: GroupScenario, year: number): VoteResult;
export function computeVotes(
  scenario: PartyScenario,
  year: number,
): VoteComputation;
export function computeVotes(scenario: Scenario, year: number): VoteComputation;
export function computeVotes(scenario: Scenario, year = 0): VoteComputation {
  checkYear(year);
  return scenario.inputMode === 'parties'
    ? partyModeVotes(scenario, year)
    : computeGroupVotes(scenario, year);
}
