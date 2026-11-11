import {
  add,
  compare,
  div,
  isZero,
  mul,
  parseDecimal,
  pow,
  rational,
  sub,
  sum,
  toDecimalString,
  type Rational,
} from './rational';
import { fractionParts, parsePercent, roundToPlaces } from './numeric';
import { runSeats, type SeatResult } from './run';
import { allocateSeats } from './allocate';
import { applyThreshold } from './threshold';
import type { PartyScenario, Scenario } from './schema';
import {
  checkYear,
  groupTurnout,
  partyModeGroupPopulations,
  type ProjectionUnavailable,
  type VoteResult,
} from './votes';
import { panelFraction } from './panel';
import { panelPercent } from './panel';
import { buildFutureVisuals } from './futureRange';
import { LIMITS, MAX_EXACT_INTEGER_DIGITS } from './schema';

export interface SupporterBasis {
  readonly source: PartyScenario;
  readonly cohorts: readonly (readonly Rational[])[];
  readonly partyTurnouts: readonly (Rational | null)[];
}
export interface SupporterResult {
  readonly scenario: PartyScenario;
  readonly result: SeatResult;
  readonly rawShares: readonly Rational[];
  readonly partyTurnouts: readonly (Rational | null)[];
  readonly groupTurnouts: readonly (Rational | null)[];
  readonly populations: readonly Rational[];
}
const ZERO = rational(0n);
const ONE = rational(1n);
const HUNDRED = rational(100n);
export function populationTimeline(scenario: Scenario) {
  const baseline = runSeats(scenario);
  const visual = buildFutureVisuals(scenario, baseline, baseline).population
    .baseline;
  const at = (year: number) => {
    const amounts = visual.entries.map((entry, g) =>
      entry.amount === null
        ? null
        : mul(
            entry.amount,
            pow(add(ONE, parseDecimal(scenario.groups[g]!.growthRate)), year),
          ),
    );
    const total = amounts.some((amount) => amount === null)
      ? null
      : sum(amounts as Rational[]);
    const shares = amounts.map((amount) =>
      amount === null || total === null || isZero(total)
        ? null
        : div(amount, total),
    );
    return { total, shares };
  };
  const { total: baseTotal, shares: baseShares } = at(0);
  return Array.from({ length: LIMITS.projectionYears + 1 }, (_, year) => {
    const { total, shares } = at(year);
    return {
      year,
      reason: visual.reason,
      shares: shares.map((share) =>
        share === null ? null : panelPercent(share),
      ),
      points: shares.map((share) =>
        share === null ? null : `${year * 10},${panelPercent(sub(ONE, share))}`,
      ),
      delta: shares.map((share, g) => {
        const first = baseShares[g];
        return share === null || first === null || first === undefined
          ? null
          : panelPercent(sub(share, first));
      }),
      scale:
        total === null || baseTotal === null || isZero(baseTotal)
          ? null
          : panelPercent(div(total, baseTotal)),
    };
  });
}
export function freezeSupporters(
  scenario: Scenario,
): SupporterBasis | ProjectionUnavailable {
  if (scenario.inputMode !== 'parties')
    return { kind: 'unavailable', reason: 'unknown-population' };
  const votes = runSeats(scenario).votes;
  const populations = partyModeGroupPopulations(scenario, votes.parties, 0);
  if ('kind' in populations) return populations;
  const cohorts = scenario.parties.map((party, p) =>
    scenario.groups.map((group, g) => {
      const model =
        scenario.linkedModel?.state === 'current'
          ? scenario.linkedModel.groups[group.id]
          : null;
      if (model)
        return mul(
          populations.baseline[g]!,
          panelFraction(model.preferences[party.id])!,
        );
      const turnout = groupTurnout(group);
      return isZero(turnout)
        ? ZERO
        : div(
            mul(
              votes.parties[p]!.votes,
              panelFraction(party.composition?.[group.id]) ?? ZERO,
            ),
            mul(turnout, parseDecimal(scenario.rules.validBallotRate)),
          );
    }),
  );
  return {
    source: scenario,
    cohorts,
    partyTurnouts: cohorts.map((row) => {
      const eligible = sum(row);
      return isZero(eligible)
        ? null
        : div(
            sum(
              row.map((count, g) =>
                mul(count, groupTurnout(scenario.groups[g]!)),
              ),
            ),
            eligible,
          );
    }),
  };
}
export function runSupporters(
  basis: SupporterBasis,
  targets: Readonly<Record<string, string>>,
  year = 0,
): SupporterResult {
  checkYear(year);
  const { source, cohorts } = basis;
  for (const id of Object.keys(targets))
    if (!source.parties.some((party) => party.id === id))
      throw new RangeError('Unknown supporter party');
  const coefficients = source.parties.map((party, p) =>
    coefficientOf(basis, p, targets[party.id]),
  );
  const turnouts = coefficients.map((coefficient) =>
    source.groups.map((group) => turnoutAt(groupTurnout(group), coefficient)),
  );
  const factors = source.groups.map((group) =>
    pow(add(ONE, parseDecimal(group.growthRate)), year),
  );
  const presentCast = cohorts.map((row, p) =>
    row.map((count, g) => mul(count, turnouts[p]![g]!)),
  );
  const cast = presentCast.map((row) =>
    row.map((count, g) => mul(count, factors[g]!)),
  );
  const populations = source.groups.map((_, g) =>
    mul(sum(cohorts.map((row) => row[g]!)), factors[g]!),
  );
  const totalPopulation = sum(populations);
  const partyCast = cast.map(sum);
  const totalCast = sum(partyCast);
  const validRate = parseDecimal(source.rules.validBallotRate);
  const valid = mul(totalCast, validRate);
  const turnout = isZero(totalPopulation)
    ? ZERO
    : div(totalCast, totalPopulation);
  const groupTurnouts = source.groups.map((_, g) =>
    isZero(populations[g]!)
      ? null
      : div(sum(cast.map((row) => row[g]!)), populations[g]!),
  );
  const { linkedModel: _model, ...unlinked } = source;
  void _model;
  const scenario: PartyScenario = {
    ...unlinked,
    rules: { ...source.rules, overallTurnout: fractionParts(turnout) },
    groups: source.groups.map((group, g) => ({
      ...group,
      turnout: fractionParts(groupTurnouts[g] ?? ZERO),
      turnoutChange: '0',
    })),
    parties: source.parties.map((party, p) => ({
      ...party,
      voteShare: isZero(totalCast)
        ? party.voteShare
        : fractionParts(div(partyCast[p]!, totalCast)),
      composition: isZero(partyCast[p]!)
        ? party.composition
        : Object.fromEntries(
            source.groups.map((group, g) => [
              group.id,
              fractionParts(div(cast[p]![g]!, partyCast[p]!)),
            ]),
          ),
    })),
    ...(year === 0
      ? {
          linkedModel: {
            state: 'current' as const,
            groups: Object.fromEntries(
              source.groups.map((group, g) => {
                const population = populations[g]!;
                const groupCast = sum(presentCast.map((row) => row[g]!));
                return [
                  group.id,
                  {
                    populationShare: fractionParts(
                      div(
                        population,
                        parseDecimal(source.rules.populationTotal),
                      ),
                    ),
                    preferences: Object.fromEntries(
                      source.parties.map((party, p) => [
                        party.id,
                        fractionParts(
                          isZero(groupCast)
                            ? isZero(population)
                              ? ZERO
                              : div(cohorts[p]![g]!, population)
                            : div(presentCast[p]![g]!, groupCast),
                        ),
                      ]),
                    ),
                    allowedPartyIds:
                      source.linkedModel?.groups[group.id]?.allowedPartyIds ??
                      source.parties.map((party) => party.id),
                    lastNonzeroTurnout: fractionParts(groupTurnout(group)),
                  },
                ];
              }),
            ),
          },
        }
      : {}),
  };
  const votes: VoteResult = {
    groups: [],
    ...(year > 0 ? { groupPopulations: populations } : {}),
    parties: source.parties.map((party, p) => ({
      partyId: party.id,
      votes: mul(partyCast[p]!, validRate),
      voteShare: isZero(valid) ? null : div(partyCast[p]!, totalCast),
    })),
    totals: {
      population: totalPopulation,
      available: totalPopulation,
      unavailable: ZERO,
      cast: totalCast,
      abstaining: sub(totalPopulation, totalCast),
      valid,
      invalid: sub(totalCast, valid),
    },
    allValidVotes: valid,
    turnout,
  };
  const threshold = applyThreshold(source, votes);
  const baseCast = mul(
    parseDecimal(source.rules.populationTotal),
    panelFraction(source.rules.overallTurnout)!,
  );
  return {
    scenario,
    result: { votes, threshold, allocation: allocateSeats(source, threshold) },
    rawShares: presentCast.map((row) =>
      isZero(baseCast) ? ZERO : div(sum(row), baseCast),
    ),
    partyTurnouts: cohorts.map((row, p) => {
      const eligible = sum(row.map((count, g) => mul(count, factors[g]!)));
      return isZero(eligible) ? null : div(partyCast[p]!, eligible);
    }),
    groupTurnouts,
    populations,
  };
}

/** Marks a stored supporter entry as an exact −1..+1 coefficient (M7-17). */
export const COEFFICIENT_PREFIX = 'coef:';
const COEFFICIENT_STEP = rational(1n, 20n);
const COEFFICIENT_PATTERN = /^[+-]?(?:[0-9]+(?:[.,][0-9]+)?)$/;
const MINUS_ONE = rational(-1n);

/** c ≥ 0 brings the share c of those who stayed home; c < 0 keeps the share −c of voters home. */
export function turnoutAt(turnout: Rational, coefficient: Rational): Rational {
  if (compare(coefficient, MINUS_ONE) < 0 || compare(coefficient, ONE) > 0)
    throw new RangeError('Supporter coefficient outside -1..+1');
  if (compare(turnout, ZERO) < 0 || compare(turnout, ONE) > 0)
    throw new RangeError('Turnout outside 0..1');
  return compare(coefficient, ZERO) >= 0
    ? add(turnout, mul(coefficient, sub(ONE, turnout)))
    : mul(turnout, add(ONE, coefficient));
}
function normalCoefficient(text: string): string | null {
  const trimmed = text.trim();
  if (
    trimmed.length > MAX_EXACT_INTEGER_DIGITS ||
    !COEFFICIENT_PATTERN.test(trimmed)
  )
    return null;
  return trimmed.replace(',', '.').replace(/^\+/, '');
}
export function parseCoefficient(text: string): Rational | null {
  const normal = normalCoefficient(text);
  if (normal === null) return null;
  const value = parseDecimal(normal);
  return compare(value, MINUS_ONE) < 0 || compare(value, ONE) > 0
    ? null
    : value;
}
/** The stored entry for a coefficient text, or null when the text is invalid. */
export function coefficientEntry(text: string): string | null {
  return parseCoefficient(text) === null
    ? null
    : `${COEFFICIENT_PREFIX}${normalCoefficient(text)!}`;
}
/** Exact decimal text with at least two places; a finite decimal stays exact. */
function placesText(value: Rational): string {
  const exact = toDecimalString(value);
  const point = exact.indexOf('.');
  const places = point < 0 ? 0 : exact.length - point - 1;
  return places >= 2 ? exact : roundToPlaces(value, 2);
}
export function stepCoefficient(
  text: string,
  direction: 1 | -1,
): string | null {
  const value = parseCoefficient(text);
  if (value === null) return null;
  const moved = add(
    value,
    direction > 0 ? COEFFICIENT_STEP : mul(COEFFICIENT_STEP, MINUS_ONE),
  );
  const clamped =
    compare(moved, ONE) > 0
      ? ONE
      : compare(moved, MINUS_ONE) < 0
        ? MINUS_ONE
        : moved;
  return placesText(clamped);
}
/** Display-only: signed, two places ("+0.25", "0.00", "-0.50"). */
export function coefficientText(value: Rational): string {
  const text = roundToPlaces(value, 2);
  return compare(value, ZERO) > 0 && !/^0\.00$/.test(text)
    ? `+${text}`
    : text === '-0.00'
      ? '0.00'
      : text;
}
function coefficientOf(
  basis: SupporterBasis,
  p: number,
  text: string | undefined,
): Rational {
  if (text === undefined) return ZERO;
  if (text.startsWith(COEFFICIENT_PREFIX)) {
    const value = parseCoefficient(text.slice(COEFFICIENT_PREFIX.length));
    if (value === null) throw new RangeError('Invalid supporter coefficient');
    return value;
  }
  if (text.length > MAX_EXACT_INTEGER_DIGITS)
    throw new RangeError('Supporter target precision limit');
  const value = parsePercent(text);
  if (
    value === null ||
    compare(value, ZERO) < 0 ||
    compare(value, rational(100n)) > 0
  )
    throw new RangeError('Invalid supporter target');
  const target = div(value, rational(100n));
  const current = basis.partyTurnouts[p];
  if (current === null || current === undefined)
    throw new RangeError('Unknown supporter population');
  const change = sub(target, current);
  return isZero(change)
    ? ZERO
    : div(change, compare(change, ZERO) > 0 ? sub(ONE, current) : current);
}
export interface SupporterRow {
  readonly partyId: string;
  /** The text for the coefficient field. */
  readonly field: string;
  /** Display-only coefficient, signed, two places. */
  readonly coefficient: string;
  /** Year-0 party turnout under the coefficient, percent, one place. */
  readonly turnout: string | null;
  /** The same turnout as an exact percent text. */
  readonly exact: string | null;
  /** The frozen base turnout of the party, percent, one place. */
  readonly base: string | null;
  readonly canDecrease: boolean;
  readonly canIncrease: boolean;
}
export function supporterRows(
  basis: SupporterBasis,
  targets: Readonly<Record<string, string>>,
): readonly SupporterRow[] {
  return basis.source.parties.map((party, p) => {
    const text = targets[party.id];
    const coefficient = coefficientOf(basis, p, text);
    const cohort = basis.cohorts[p]!;
    const eligible = sum(cohort);
    const turnout = isZero(eligible)
      ? null
      : div(
          sum(
            cohort.map((count, g) =>
              mul(
                count,
                turnoutAt(groupTurnout(basis.source.groups[g]!), coefficient),
              ),
            ),
          ),
          eligible,
        );
    const base = basis.partyTurnouts[p] ?? null;
    return {
      partyId: party.id,
      field:
        text === undefined
          ? '0.00'
          : text.startsWith(COEFFICIENT_PREFIX)
            ? text.slice(COEFFICIENT_PREFIX.length)
            : coefficientText(coefficient),
      coefficient: coefficientText(coefficient),
      turnout:
        turnout === null ? null : roundToPlaces(mul(turnout, HUNDRED), 1),
      exact: turnout === null ? null : panelPercent(turnout),
      base: base === null ? null : roundToPlaces(mul(base, HUNDRED), 1),
      canDecrease: compare(coefficient, MINUS_ONE) > 0,
      canIncrease: compare(coefficient, ONE) < 0,
    };
  });
}
export interface PopulationTrend {
  /** Top of the chart in percent: at least 40, rounded up to a multiple of 10. */
  readonly max: number;
  readonly grid: readonly { readonly value: number; readonly y: string }[];
  readonly years: readonly { readonly year: number; readonly x: string }[];
  /** One SVG path per group; a year without a share breaks the line. */
  readonly paths: readonly string[];
  readonly x: (year: number) => string;
}
const TREND_LEFT = rational(27n);
const TREND_STEP = rational(38n, 5n);
/** Display-only geometry of the prototype's 420×118 share chart. */
export function populationTrend(
  timeline: ReturnType<typeof populationTimeline>,
): PopulationTrend {
  let top = ZERO;
  for (const row of timeline)
    for (const share of row.shares)
      if (share !== null) {
        const value = parseDecimal(share);
        if (compare(value, top) > 0) top = value;
      }
  let max = 40;
  while (compare(top, rational(BigInt(max))) > 0) max += 10;
  const y = (percent: Rational) =>
    toDecimalString(
      parseDecimal(
        roundToPlaces(
          sub(
            rational(100n),
            div(mul(percent, rational(90n)), rational(BigInt(max))),
          ),
          3,
        ),
      ),
    );
  const x = (year: number) =>
    toDecimalString(add(TREND_LEFT, mul(TREND_STEP, rational(BigInt(year)))));
  const paths = (timeline[0]?.shares ?? []).map((_, g) => {
    let path = '';
    let open = false;
    for (const row of timeline) {
      const share = row.shares[g];
      if (share === null || share === undefined) {
        open = false;
        continue;
      }
      path += `${path === '' ? '' : ' '}${open ? 'L' : 'M'}${x(row.year)},${y(parseDecimal(share))}`;
      open = true;
    }
    return path;
  });
  return {
    max,
    grid: [0, max / 2, max].map((value) => ({
      value,
      y: y(rational(BigInt(value * 2), 2n)),
    })),
    years: [0, 10, 20, 30, 40, 50].map((year) => ({ year, x: x(year) })),
    paths,
    x,
  };
}
