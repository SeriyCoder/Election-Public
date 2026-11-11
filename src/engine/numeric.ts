/** Exact percent entry, totals and proportional rebalance for scenario inputs. */
import {
  compare,
  div,
  floor,
  isNegative,
  isZero,
  mul,
  parseDecimal,
  rational,
  sub,
  sum,
  toDecimalString,
  type Rational,
} from './rational';
import { MAX_EXACT_INTEGER_DIGITS } from './schema';

/** Rebalanced fractions are rounded to this many decimal places. */
export const REBALANCE_DIGITS = 18;

export interface RebalanceRow {
  readonly key: string;
  readonly value: unknown;
  readonly locked: boolean;
}

export interface RebalancedValue {
  readonly key: string;
  readonly value: string;
}

export interface ExactFractionParts {
  readonly numerator: string;
  readonly denominator: string;
}

const PERCENT_PATTERN = /^-?[0-9]+(?:[.,][0-9]{1,16})?$/;
const COUNT_PATTERN = /^[1-9][0-9]{0,4}$/;
const HUNDRED = rational(100n);
const SCALE = 10n ** BigInt(REBALANCE_DIGITS);

function parse(value: unknown): Rational | null {
  if (typeof value !== 'string') {
    return null;
  }
  try {
    return parseDecimal(value);
  } catch {
    return null;
  }
}

export function percentToFraction(text: string): string | null {
  const trimmed = text.trim();
  if (!PERCENT_PATTERN.test(trimmed)) {
    return null;
  }
  const percent = parse(trimmed.replace(',', '.'));
  return percent === null ? null : toDecimalString(div(percent, HUNDRED));
}

export function percentToExactFraction(
  text: string,
): ExactFractionParts | null {
  const percent = parsePercent(text);
  if (percent === null) {
    return null;
  }
  const value = div(percent, HUNDRED);
  return {
    numerator: value.num.toString(),
    denominator: value.den.toString(),
  };
}

export function fractionParts(value: Rational): ExactFractionParts {
  return {
    numerator: value.num.toString(),
    denominator: value.den.toString(),
  };
}

export function fractionToPercent(value: unknown): string | null {
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    const parts = value as Readonly<Record<string, unknown>>;
    const numerator = parts.numerator;
    const denominator = parts.denominator;
    if (
      typeof numerator !== 'string' ||
      typeof denominator !== 'string' ||
      numerator.length > MAX_EXACT_INTEGER_DIGITS ||
      denominator.length > MAX_EXACT_INTEGER_DIGITS ||
      !/^[0-9]+$/.test(numerator) ||
      !/^[0-9]+$/.test(denominator) ||
      /^0+$/.test(denominator)
    ) {
      return null;
    }
    const percent = mul(
      rational(BigInt(numerator), BigInt(denominator)),
      HUNDRED,
    );
    return toDecimalString(parseDecimal(roundToPlaces(percent, 16)));
  }
  const fraction = parse(value);
  return fraction === null ? null : toDecimalString(mul(fraction, HUNDRED));
}

export function sumFractions(values: readonly unknown[]): string | null {
  const parsed: Rational[] = [];
  for (const value of values) {
    const fraction = parse(value);
    if (fraction === null) {
      return null;
    }
    parsed.push(fraction);
  }
  return toDecimalString(sum(parsed));
}

export function parseCount(text: string): number | null {
  const trimmed = text.trim();
  return COUNT_PATTERN.test(trimmed) ? (JSON.parse(trimmed) as number) : null;
}

export function rebalance(
  rows: readonly RebalanceRow[],
  target = '1',
): readonly RebalancedValue[] | null {
  const total = parse(target);
  if (rows.length === 0 || total === null) {
    return null;
  }
  const parsed: Rational[] = [];
  for (const row of rows) {
    const value = parse(row.value);
    if (value === null || isNegative(value)) {
      return null;
    }
    parsed.push(value);
  }
  const unlocked = rows.flatMap((row, index) => (row.locked ? [] : [index]));
  if (unlocked.length === 0) {
    return null;
  }
  const locked = sum(parsed.filter((_, index) => rows[index]!.locked));
  const remaining = sub(total, locked);
  if (isNegative(remaining)) {
    return null;
  }
  const base = sum(unlocked.map((index) => parsed[index]!));
  const count = rational(BigInt(unlocked.length));
  const scale = rational(SCALE);
  const units = new Map<number, bigint>();
  const remainders: { index: number; rest: Rational }[] = [];
  let assigned = 0n;
  for (const index of unlocked) {
    const exact = isZero(base)
      ? div(remaining, count)
      : div(mul(parsed[index]!, remaining), base);
    const scaled = mul(exact, scale);
    const whole = floor(scaled);
    units.set(index, whole);
    assigned += whole;
    remainders.push({ index, rest: sub(scaled, rational(whole)) });
  }
  let leftover = floor(mul(remaining, scale)) - assigned;
  remainders.sort((a, b) => compare(b.rest, a.rest) || a.index - b.index);
  for (const { index } of remainders) {
    if (leftover <= 0n) {
      break;
    }
    units.set(index, (units.get(index) ?? 0n) + 1n);
    leftover -= 1n;
  }
  return rows.map((row, index) => {
    const value = units.get(index);
    return {
      key: row.key,
      value:
        value === undefined
          ? (row.value as string)
          : toDecimalString(rational(value, SCALE)),
    };
  });
}

/** The fraction of a percent text inside [min, max] percent, or null. */
export function percentWithin(
  text: string,
  min: string,
  max: string,
): string | null {
  const percent = parsePercent(text);
  const low = parse(min);
  const high = parse(max);
  if (percent === null || low === null || high === null) {
    return null;
  }
  if (compare(percent, low) < 0 || compare(percent, high) > 0) {
    return null;
  }
  return toDecimalString(div(percent, HUNDRED));
}

/** 100 minus the sum of percent texts, as an ASCII decimal; null if one is invalid. */
export function percentRemainder(texts: readonly string[]): string | null {
  const parsed: Rational[] = [];
  for (const text of texts) {
    const percent = parsePercent(text);
    if (percent === null) {
      return null;
    }
    parsed.push(percent);
  }
  return toDecimalString(sub(HUNDRED, sum(parsed)));
}

/** Whole percents summing to 100, split evenly with the larger parts first. */
export function evenPercents(count: number): readonly string[] {
  if (!Number.isSafeInteger(count) || count < 1 || count > 100) {
    throw new RangeError(
      `count must be an integer from 1 to 100, got ${count}`,
    );
  }
  const parts = BigInt(count);
  const base = 100n / parts;
  const larger = 100n % parts;
  return Array.from({ length: count }, (_, index) =>
    (BigInt(index) < larger ? base + 1n : base).toString(),
  );
}

/** The exact value of a percent text (dot or comma), or null when it is not one. */
export function parsePercent(text: string): Rational | null {
  const trimmed = text.trim();
  return PERCENT_PATTERN.test(trimmed)
    ? parse(trimmed.replace(',', '.'))
    : null;
}

/**
 * Percent texts summing to exactly 100 rounded to `places` decimals with the
 * sum kept at 100; null when a text is invalid or the texts do not sum to 100.
 */
export function roundPercents(
  texts: readonly string[],
  places: number,
): readonly string[] | null {
  checkPlaces(places);
  const parsed: Rational[] = [];
  for (const text of texts) {
    const percent = parsePercent(text);
    if (percent === null || isNegative(percent)) {
      return null;
    }
    parsed.push(percent);
  }
  if (parsed.length === 0 || compare(sum(parsed), HUNDRED) !== 0) {
    return null;
  }
  return roundExactPercents(parsed, places);
}

/**
 * Exact non-negative percents summing to exactly 100, rounded to `places`
 * decimals by largest remainder (ties to the lower index), as canonical
 * decimal texts summing to exactly 100.
 */
export function roundExactPercents(
  values: readonly Rational[],
  places: number,
): string[] {
  checkPlaces(places);
  const scale = rational(10n ** BigInt(places));
  const units: bigint[] = [];
  const rests: { index: number; rest: Rational }[] = [];
  values.forEach((value, index) => {
    const scaled = mul(value, scale);
    const whole = floor(scaled);
    units.push(whole);
    rests.push({ index, rest: sub(scaled, rational(whole)) });
  });
  let leftover =
    floor(mul(HUNDRED, scale)) -
    units.reduce((total, unit) => total + unit, 0n);
  rests.sort((a, b) => compare(b.rest, a.rest) || a.index - b.index);
  for (const { index } of rests) {
    if (leftover <= 0n) {
      break;
    }
    units[index] = (units[index] ?? 0n) + 1n;
    leftover -= 1n;
  }
  return units.map((unit) =>
    toDecimalString(rational(unit, 10n ** BigInt(places))),
  );
}

/**
 * Non-negative percent texts (dot or comma) scaled exactly in proportion to a
 * sum of 100 and rounded to `places` decimals by largest remainder; null when
 * a text is invalid or negative, the list is empty or every value is 0.
 *
 * Values at the `locked` indices keep their exact value and only the others
 * share what is left of 100; null when the locked values exceed 100, have
 * more than `places` decimals, or leave a positive rest with nothing unlocked
 * above 0 to scale.
 */
export function scalePercents(
  texts: readonly string[],
  places: number,
  locked: readonly number[] = [],
): readonly string[] | null {
  checkPlaces(places);
  const parsed: Rational[] = [];
  for (const text of texts) {
    const percent = parsePercent(text);
    if (percent === null || isNegative(percent)) {
      return null;
    }
    parsed.push(percent);
  }
  if (parsed.length === 0) {
    return null;
  }
  const isLocked = (index: number) => locked.includes(index);
  const fixed = sum(parsed.filter((_, index) => isLocked(index)));
  const free = sum(parsed.filter((_, index) => !isLocked(index)));
  const rest = sub(HUNDRED, fixed);
  if (isNegative(rest) || (isZero(free) && !isZero(rest))) {
    return null;
  }
  const factor = isZero(free) ? rational(0n) : div(rest, free);
  const scaled = parsed.map((value, index) =>
    isLocked(index) ? value : mul(value, factor),
  );
  const rounded = roundExactPercents(scaled, places);
  return rounded.every(
    (text, index) =>
      !isLocked(index) ||
      compare(parseDecimal(text), parsed[index] ?? rational(0n)) === 0,
  )
    ? rounded
    : null;
}

/**
 * Cumulative ends of the slices of a pie, in percent with at most two
 * decimals: an invalid or negative text counts as 0, and slices summing to
 * more than 100 are scaled to a full circle.
 */
export function percentStops(texts: readonly string[]): readonly string[] {
  const parsed = texts.map((text) => {
    const percent = parsePercent(text);
    return percent === null || isNegative(percent) ? rational(0n) : percent;
  });
  const total = sum(parsed);
  const factor =
    compare(total, HUNDRED) > 0 ? div(HUNDRED, total) : rational(1n);
  let end = rational(0n);
  return parsed.map((value) => {
    end = sum([end, mul(value, factor)]);
    return toDecimalString(parseDecimal(roundToPlaces(end, 2)));
  });
}

function checkPlaces(places: number): void {
  if (!Number.isSafeInteger(places) || places < 0) {
    throw new RangeError(
      `places must be a non-negative integer, got ${places}`,
    );
  }
}

/** Rounds half away from zero to exactly `places` decimal places. */
export function roundToPlaces(value: Rational, places: number): string {
  if (!Number.isSafeInteger(places) || places < 0) {
    throw new RangeError(
      `places must be a non-negative integer, got ${places}`,
    );
  }
  const negative = value.num < 0n;
  const scaled = (negative ? -value.num : value.num) * 10n ** BigInt(places);
  let units = scaled / value.den;
  if ((scaled % value.den) * 2n >= value.den) {
    units += 1n;
  }
  const digits = units.toString().padStart(places + 1, '0');
  const whole = digits.slice(0, digits.length - places);
  const fraction = places === 0 ? '' : `.${digits.slice(-places)}`;
  const sign = negative && units !== 0n ? '-' : '';
  return `${sign}${whole}${fraction}`;
}
