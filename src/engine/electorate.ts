/**
 * The electorate described by party: from each party's share of the votes,
 * the groups its voters come from and each group's turnout, the size of each
 * group and how it divides its votes, and the reverse. Exact rationals
 * throughout; only the results are rounded, with sums kept at exactly 100.
 */
import { parsePercent, roundExactPercents } from './numeric';
import {
  compare,
  div,
  isNegative,
  isZero,
  mul,
  rational,
  sum,
  type Rational,
} from './rational';

export interface DerivedElectorate {
  /** Percent of the population per group, group order. */
  readonly populationShares: readonly string[];
  /** Percent of each group's votes per party: [group][party]. */
  readonly voteWeights: readonly (readonly string[])[];
}

export interface DescribedElectorate {
  /** Percent of the votes per party, party order. */
  readonly partyShares: readonly string[];
  /** Percent of each party's voters per group: [party][group]. */
  readonly compositions: readonly (readonly string[])[];
}

export interface VoterMix {
  /** Known contributions in percent of all valid votes, or null if none is known. */
  readonly groups: readonly string[] | null;
  /** Percent of all valid votes whose group is unknown. */
  readonly unknown: string;
  /** Whether every positive-vote party has a known composition. */
  readonly complete: boolean;
}

/** Derived values are rounded to this many decimals of a percent. */
export const ELECTORATE_PLACES = 4;

const HUNDRED = rational(100n);
const ZERO = rational(0n);
const ONE = rational(1n);

/** Percents in 0..100, or null when one is not. */
function percents(texts: readonly string[]): Rational[] | null {
  const values: Rational[] = [];
  for (const text of texts) {
    const value = parsePercent(text);
    if (value === null || isNegative(value) || compare(value, HUNDRED) > 0) {
      return null;
    }
    values.push(value);
  }
  return values;
}

/** Percents in 0..100 summing to exactly 100, or null. */
function whole(texts: readonly string[]): Rational[] | null {
  const values = percents(texts);
  return values === null ||
    values.length === 0 ||
    compare(sum(values), HUNDRED) !== 0
    ? null
    : values;
}

/** Rows of equal length `width`, each summing to exactly 100, or null. */
function wholeRows(
  rows: readonly (readonly string[])[],
  width: number,
): Rational[][] | null {
  const values: Rational[][] = [];
  for (const row of rows) {
    const parsed = row.length === width ? whole(row) : null;
    if (parsed === null) {
      return null;
    }
    values.push(parsed);
  }
  return values;
}

type PartyCompositions = readonly (readonly string[] | null)[];

function partyRows(
  shares: readonly Rational[],
  compositions: PartyCompositions,
  groups: number,
): (Rational[] | null)[] | null {
  if (groups === 0 || compositions.length !== shares.length) {
    return null;
  }
  const rows: (Rational[] | null)[] = [];
  for (const composition of compositions) {
    if (composition === null) {
      rows.push(null);
      continue;
    }
    const row = composition.length === groups ? whole(composition) : null;
    if (row === null) {
      return null;
    }
    rows.push(row);
  }
  return rows;
}

function completeRows(
  shares: readonly Rational[],
  compositions: PartyCompositions,
  groups: number,
): Rational[][] | null {
  const rows = partyRows(shares, compositions, groups);
  if (
    rows === null ||
    rows.some((row, party) => row === null && !isZero(shares[party]!))
  ) {
    return null;
  }
  return rows.map((row) => row ?? Array.from({ length: groups }, () => ZERO));
}

/** Known group contributions use the whole valid-vote total as denominator. */
export function describeVoterMix(
  shares: readonly string[],
  compositions: PartyCompositions,
  groups: number,
  places: number,
): VoterMix | null {
  const partyShares = whole(shares);
  if (partyShares === null) {
    return null;
  }
  const rows = partyRows(partyShares, compositions, groups);
  if (rows === null) {
    return null;
  }
  const known = Array.from({ length: groups }, (_, group) =>
    sum(
      partyShares.map((share, party) =>
        rows[party] === null
          ? ZERO
          : div(mul(share, rows[party]![group]!), HUNDRED),
      ),
    ),
  );
  const unknown = sum(
    partyShares.map((share, party) => (rows[party] === null ? share : ZERO)),
  );
  const rounded = roundExactPercents([...known, unknown], places);
  return {
    groups: compare(unknown, HUNDRED) === 0 ? null : rounded.slice(0, groups),
    unknown: rounded[groups]!,
    complete: isZero(unknown),
  };
}

/** Parts in proportion to `values`, as rounded percents; even when all are 0. */
function proportions(values: readonly Rational[], places: number): string[] {
  const total = sum(values);
  const exact = isZero(total)
    ? values.map(() => div(HUNDRED, rational(BigInt(values.length))))
    : values.map((value) => div(mul(value, HUNDRED), total));
  return roundExactPercents(exact, places);
}

/**
 * Group population shares and vote weights from party vote shares, party
 * compositions ([party][group]) and group turnouts, all percent texts. Null
 * when a count, a percent or a sum is wrong, or a group that votes has no
 * turnout.
 */
export function deriveElectorate(
  shares: readonly string[],
  compositions: PartyCompositions,
  turnouts: readonly string[],
): DerivedElectorate | null {
  const groups = turnouts.length;
  const partyShares = whole(shares);
  const turnoutValues = percents(turnouts);
  if (
    partyShares === null ||
    turnoutValues === null ||
    groups === 0 ||
    compositions.length !== partyShares.length
  ) {
    return null;
  }
  const rows = completeRows(partyShares, compositions, groups);
  if (rows === null) {
    return null;
  }
  const cast = turnoutValues.map((_, g) =>
    partyShares.map((share, p) => mul(share, rows[p]![g]!)),
  );
  const votes = cast.map((row) => sum(row));
  const sizes: Rational[] = [];
  for (let g = 0; g < groups; g += 1) {
    const turnout = turnoutValues[g]!;
    if (isZero(votes[g]!)) {
      sizes.push(ZERO);
    } else if (isZero(turnout)) {
      return null;
    } else {
      sizes.push(div(votes[g]!, turnout));
    }
  }
  return {
    populationShares: proportions(sizes, ELECTORATE_PLACES),
    voteWeights: cast.map((row) => proportions(row, ELECTORATE_PLACES)),
  };
}

/**
 * Overall turnout implied by party shares, party compositions and group
 * turnouts. Returns null when a zero-turnout group leaves its population
 * unknown or the questionnaire inputs are incomplete.
 */
export function deriveOverallTurnout(
  shares: readonly string[],
  compositions: PartyCompositions,
  turnouts: readonly string[],
): Rational | null {
  const partyShares = whole(shares);
  const turnoutValues = percents(turnouts);
  if (
    partyShares === null ||
    turnoutValues === null ||
    turnoutValues.length === 0 ||
    compositions.length !== partyShares.length
  ) {
    return null;
  }
  const rows = completeRows(partyShares, compositions, turnoutValues.length);
  if (rows === null) {
    return null;
  }

  const groupPopulation = turnoutValues.map((turnout, group) => {
    const turnoutFraction = div(turnout, HUNDRED);
    if (isZero(turnoutFraction)) {
      return null;
    }
    const votes = sum(
      partyShares.map((share, party) =>
        mul(div(share, HUNDRED), div(rows[party]![group]!, HUNDRED)),
      ),
    );
    return div(votes, turnoutFraction);
  });
  if (groupPopulation.some((population) => population === null)) {
    return null;
  }
  const population = sum(
    groupPopulation.filter((value): value is Rational => value !== null),
  );
  return isZero(population) ? null : div(ONE, population);
}

/**
 * Whether each group casts any votes, from party vote shares and party
 * compositions ([party][group]): some party with votes draws a positive part
 * of them from it. Texts that are not percents count as zero.
 */
export function castingGroups(
  shares: readonly string[],
  compositions: PartyCompositions,
  groups: number,
): readonly boolean[] {
  const positive = (text: string | undefined) => {
    const value = text === undefined ? null : parsePercent(text);
    return value !== null && !isNegative(value) && !isZero(value);
  };
  return Array.from({ length: groups }, (_, g) =>
    shares.some(
      (share, p) => positive(share) && positive(compositions[p]?.[g]),
    ),
  );
}

/**
 * Party vote shares and compositions from group population shares, turnouts
 * and vote weights ([group][party]), rounded to the given decimals. Null when
 * a count, a percent or a sum is wrong, or nobody votes.
 */
export function describeElectorate(
  populationShares: readonly string[],
  turnouts: readonly string[],
  voteWeights: readonly (readonly string[])[],
  sharePlaces: number,
  compositionPlaces: number,
): DescribedElectorate | null {
  const sizes = whole(populationShares);
  const turnoutValues = percents(turnouts);
  if (
    sizes === null ||
    turnoutValues === null ||
    turnoutValues.length !== sizes.length ||
    voteWeights.length !== sizes.length
  ) {
    return null;
  }
  const parties = voteWeights[0]?.length ?? 0;
  const weights = parties === 0 ? null : wholeRows(voteWeights, parties);
  if (weights === null) {
    return null;
  }
  const cast = Array.from({ length: parties }, (_, p) =>
    sizes.map((size, g) => mul(mul(size, turnoutValues[g]!), weights[g]![p]!)),
  );
  const votes = cast.map((row) => sum(row));
  if (isZero(sum(votes))) {
    return null;
  }
  return {
    partyShares: proportions(votes, sharePlaces),
    compositions: cast.map((row) => proportions(row, compositionPlaces)),
  };
}
