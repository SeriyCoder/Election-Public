export interface Rational {
  readonly num: bigint;
  readonly den: bigint;
}

export type RationalErrorCode =
  | 'zero-denominator'
  | 'division-by-zero'
  | 'invalid-decimal'
  | 'decimal-too-long'
  | 'too-many-fraction-digits'
  | 'not-a-safe-integer'
  | 'non-terminating';

export class RationalError extends Error {
  readonly code: RationalErrorCode;

  constructor(code: RationalErrorCode, message: string) {
    super(message);
    this.name = 'RationalError';
    this.code = code;
  }
}

export const MAX_DECIMAL_LENGTH = 128;
export const MAX_FRACTION_DIGITS = 18;

const DECIMAL_PATTERN = /^(-?)([0-9]+)(?:\.([0-9]+))?$/;

function abs(value: bigint): bigint {
  return value < 0n ? -value : value;
}

function gcd(a: bigint, b: bigint): bigint {
  let x = abs(a);
  let y = abs(b);
  while (y !== 0n) {
    const next = x % y;
    x = y;
    y = next;
  }
  return x;
}

export function rational(num: bigint, den: bigint = 1n): Rational {
  if (den === 0n) {
    throw new RationalError('zero-denominator', 'Denominator must not be zero');
  }
  if (num === 0n) {
    return Object.freeze({ num: 0n, den: 1n });
  }
  const sign = den < 0n ? -1n : 1n;
  const divisor = gcd(num, den);
  return Object.freeze({
    num: (sign * num) / divisor,
    den: (sign * den) / divisor,
  });
}

export function fromInteger(value: number | bigint): Rational {
  if (typeof value === 'bigint') {
    return rational(value);
  }
  if (!Number.isSafeInteger(value)) {
    throw new RationalError(
      'not-a-safe-integer',
      `Expected a safe integer, received ${String(value)}`,
    );
  }
  return rational(BigInt(value));
}

export function parseDecimal(text: string): Rational {
  if (typeof text !== 'string') {
    throw new RationalError(
      'invalid-decimal',
      'Decimal value must be a string',
    );
  }
  if (text.length > MAX_DECIMAL_LENGTH) {
    throw new RationalError(
      'decimal-too-long',
      `Decimal text exceeds ${MAX_DECIMAL_LENGTH} characters`,
    );
  }
  const match = DECIMAL_PATTERN.exec(text);
  if (match === null) {
    throw new RationalError(
      'invalid-decimal',
      `Not a plain decimal number: ${JSON.stringify(text)}`,
    );
  }
  const negative = match[1] === '-';
  const integerDigits = match[2] ?? '';
  const fractionDigits = match[3] ?? '';
  if (fractionDigits.length > MAX_FRACTION_DIGITS) {
    throw new RationalError(
      'too-many-fraction-digits',
      `At most ${MAX_FRACTION_DIGITS} fractional digits are allowed`,
    );
  }
  const scaled = BigInt(integerDigits + fractionDigits);
  return rational(
    negative ? -scaled : scaled,
    10n ** BigInt(fractionDigits.length),
  );
}

export function add(a: Rational, b: Rational): Rational {
  return rational(a.num * b.den + b.num * a.den, a.den * b.den);
}

export function sub(a: Rational, b: Rational): Rational {
  return rational(a.num * b.den - b.num * a.den, a.den * b.den);
}

export function mul(a: Rational, b: Rational): Rational {
  return rational(a.num * b.num, a.den * b.den);
}

export function div(a: Rational, b: Rational): Rational {
  if (b.num === 0n) {
    throw new RationalError('division-by-zero', 'Division by zero');
  }
  return rational(a.num * b.den, a.den * b.num);
}

export function neg(a: Rational): Rational {
  return rational(-a.num, a.den);
}

const MAX_EXPONENT = 1000;

/** Exact `base^exponent` for an integer exponent 0–1000; `pow(x, 0)` is 1. */
export function pow(base: Rational, exponent: number): Rational {
  if (
    !Number.isSafeInteger(exponent) ||
    exponent < 0 ||
    exponent > MAX_EXPONENT
  ) {
    throw new RangeError(
      `Exponent must be an integer from 0 to ${MAX_EXPONENT}`,
    );
  }
  const power = BigInt(exponent);
  return rational(base.num ** power, base.den ** power);
}

export function sum(values: readonly Rational[]): Rational {
  let total = rational(0n);
  for (const value of values) {
    total = add(total, value);
  }
  return total;
}

export function compare(a: Rational, b: Rational): -1 | 0 | 1 {
  const left = a.num * b.den;
  const right = b.num * a.den;
  if (left < right) {
    return -1;
  }
  return left > right ? 1 : 0;
}

export function equals(a: Rational, b: Rational): boolean {
  return compare(a, b) === 0;
}

export function lessThan(a: Rational, b: Rational): boolean {
  return compare(a, b) < 0;
}

export function lessThanOrEqual(a: Rational, b: Rational): boolean {
  return compare(a, b) <= 0;
}

export function greaterThan(a: Rational, b: Rational): boolean {
  return compare(a, b) > 0;
}

export function greaterThanOrEqual(a: Rational, b: Rational): boolean {
  return compare(a, b) >= 0;
}

export function isZero(a: Rational): boolean {
  return a.num === 0n;
}

export function isPositive(a: Rational): boolean {
  return a.num > 0n;
}

export function isNegative(a: Rational): boolean {
  return a.num < 0n;
}

// BigInt division truncates toward zero; adjust negative non-integers down.
export function floor(a: Rational): bigint {
  const quotient = a.num / a.den;
  return a.num < 0n && quotient * a.den !== a.num ? quotient - 1n : quotient;
}

/** Exact decimal text; refuses values whose expansion does not terminate. */
export function toDecimalString(a: Rational): string {
  let rest = a.den;
  let twos = 0;
  let fives = 0;
  while (rest % 2n === 0n) {
    rest /= 2n;
    twos += 1;
  }
  while (rest % 5n === 0n) {
    rest /= 5n;
    fives += 1;
  }
  if (rest !== 1n) {
    throw new RationalError(
      'non-terminating',
      `${toFractionString(a)} has no finite decimal expansion`,
    );
  }
  const digits = twos > fives ? twos : fives;
  const scaled = (abs(a.num) * 10n ** BigInt(digits)) / a.den;
  const text = scaled.toString().padStart(digits + 1, '0');
  const integerPart = text.slice(0, text.length - digits);
  const fractionPart = text.slice(text.length - digits).replace(/0+$/, '');
  const sign = a.num < 0n ? '-' : '';
  return fractionPart === ''
    ? `${sign}${integerPart}`
    : `${sign}${integerPart}.${fractionPart}`;
}

export function toFractionString(a: Rational): string {
  return a.den === 1n ? a.num.toString() : `${a.num}/${a.den}`;
}
