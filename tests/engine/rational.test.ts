import rationalSource from '../../src/engine/rational.ts?raw';
import { describe, expect, it } from 'vitest';
import {
  MAX_DECIMAL_LENGTH,
  MAX_FRACTION_DIGITS,
  RationalError,
  add,
  compare,
  div,
  equals,
  floor,
  fromInteger,
  greaterThan,
  greaterThanOrEqual,
  isNegative,
  isPositive,
  isZero,
  lessThan,
  lessThanOrEqual,
  mul,
  neg,
  parseDecimal,
  pow,
  rational,
  sub,
  sum,
  toDecimalString,
  toFractionString,
  type Rational,
} from '../../src/engine/rational';

function errorCode(action: () => unknown): string | undefined {
  try {
    action();
  } catch (error) {
    if (error instanceof RationalError) {
      return error.code;
    }
    throw error;
  }
  return undefined;
}

function fraction(value: Rational): string {
  return toFractionString(value);
}

// Deterministic generator so property tests are reproducible.
function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randomBigInt(next: () => number, maxAbs: number): bigint {
  const magnitude = BigInt(Math.floor(next() * maxAbs));
  return next() < 0.5 ? -magnitude : magnitude;
}

function randomRational(next: () => number): Rational {
  const den = BigInt(1 + Math.floor(next() * 1_000_000));
  return rational(randomBigInt(next, 1_000_000_000), next() < 0.5 ? den : -den);
}

describe('rational normalization', () => {
  it('reduces by the greatest common divisor and keeps the denominator positive', () => {
    const value = rational(6n, -4n);
    expect(value.num).toBe(-3n);
    expect(value.den).toBe(2n);
  });

  it('represents zero canonically as 0/1', () => {
    const value = rational(0n, -5n);
    expect(value.num).toBe(0n);
    expect(value.den).toBe(1n);
  });

  it('defaults the denominator to one', () => {
    expect(fraction(rational(7n))).toBe('7');
  });

  it('rejects a zero denominator', () => {
    expect(errorCode(() => rational(1n, 0n))).toBe('zero-denominator');
  });

  it('gives equal values identical fields', () => {
    const a = rational(10n, 20n);
    const b = rational(-3n, -6n);
    expect([a.num, a.den]).toEqual([b.num, b.den]);
  });

  it('returns immutable values', () => {
    const value = rational(1n, 2n);
    expect(Object.isFrozen(value)).toBe(true);
  });
});

describe('integer conversion', () => {
  it('converts safe integers and bigints exactly', () => {
    expect(fraction(fromInteger(120))).toBe('120');
    expect(fraction(fromInteger(-7n))).toBe('-7');
  });

  it('rejects non-integer, non-finite and unsafe numbers', () => {
    expect(errorCode(() => fromInteger(1.5))).toBe('not-a-safe-integer');
    expect(errorCode(() => fromInteger(Number.NaN))).toBe('not-a-safe-integer');
    expect(errorCode(() => fromInteger(Number.POSITIVE_INFINITY))).toBe(
      'not-a-safe-integer',
    );
    expect(errorCode(() => fromInteger(2 ** 53))).toBe('not-a-safe-integer');
  });
});

describe('exact arithmetic', () => {
  it('adds, subtracts, multiplies and divides without approximation', () => {
    const third = rational(1n, 3n);
    const sixth = rational(1n, 6n);
    expect(fraction(add(third, sixth))).toBe('1/2');
    expect(fraction(sub(third, sixth))).toBe('1/6');
    expect(fraction(mul(third, sixth))).toBe('1/18');
    expect(fraction(div(third, sixth))).toBe('2');
    expect(fraction(neg(third))).toBe('-1/3');
  });

  it('rejects division by zero', () => {
    expect(errorCode(() => div(rational(1n), rational(0n)))).toBe(
      'division-by-zero',
    );
  });

  it('sums an empty list to zero and a list exactly', () => {
    expect(fraction(sum([]))).toBe('0');
    expect(
      fraction(sum([rational(1n, 2n), rational(1n, 3n), rational(1n, 6n)])),
    ).toBe('1');
  });

  it('keeps large values exact beyond the safe-integer range', () => {
    const big = rational(10n ** 30n + 1n, 3n);
    expect(fraction(mul(big, rational(3n)))).toBe((10n ** 30n + 1n).toString());
  });
});

describe('exact comparison', () => {
  it('orders values by exact cross-multiplication', () => {
    const third = rational(1n, 3n);
    const nearThird = parseDecimal('0.333333333333333333');
    expect(compare(third, nearThird)).toBe(1);
    expect(compare(nearThird, third)).toBe(-1);
    expect(compare(rational(2n, 4n), rational(1n, 2n))).toBe(0);
  });

  it('provides consistent predicate helpers at an exact boundary', () => {
    const threshold = parseDecimal('0.0325');
    const atThreshold = rational(13n, 400n);
    const below = sub(atThreshold, rational(1n, 10n ** 30n));
    expect(equals(atThreshold, threshold)).toBe(true);
    expect(greaterThanOrEqual(atThreshold, threshold)).toBe(true);
    expect(greaterThan(atThreshold, threshold)).toBe(false);
    expect(lessThan(below, threshold)).toBe(true);
    expect(lessThanOrEqual(atThreshold, threshold)).toBe(true);
  });

  it('classifies sign exactly', () => {
    expect(isZero(rational(0n, 9n))).toBe(true);
    expect(isPositive(rational(1n, 10n ** 40n))).toBe(true);
    expect(isNegative(rational(-1n, 10n ** 40n))).toBe(true);
    expect(isPositive(rational(0n))).toBe(false);
    expect(isNegative(rational(0n))).toBe(false);
  });
});

describe('mathematical floor', () => {
  it('rounds toward negative infinity for positive and negative values', () => {
    expect(floor(rational(7n, 2n))).toBe(3n);
    expect(floor(rational(-7n, 2n))).toBe(-4n);
    expect(floor(rational(4n, 2n))).toBe(2n);
    expect(floor(rational(-4n, 2n))).toBe(-2n);
    expect(floor(rational(0n))).toBe(0n);
  });

  it('floors a seat quota exactly at an integer boundary', () => {
    const quota = mul(rational(120n), parseDecimal('0.15'));
    expect(fraction(quota)).toBe('18');
    expect(floor(quota)).toBe(18n);
  });
});

describe('decimal-string parsing', () => {
  it('parses plain decimals exactly', () => {
    expect(fraction(parseDecimal('0.1'))).toBe('1/10');
    expect(fraction(parseDecimal('007.50'))).toBe('15/2');
    expect(fraction(parseDecimal('1'))).toBe('1');
    expect(fraction(parseDecimal('-2.25'))).toBe('-9/4');
    expect(fraction(parseDecimal('-0'))).toBe('0');
    expect(fraction(parseDecimal('0.000'))).toBe('0');
  });

  it('makes 0.1 + 0.2 equal 0.3 exactly', () => {
    expect(
      equals(
        add(parseDecimal('0.1'), parseDecimal('0.2')),
        parseDecimal('0.3'),
      ),
    ).toBe(true);
  });

  it(`accepts exactly ${MAX_FRACTION_DIGITS} fractional digits and rejects more`, () => {
    expect(fraction(parseDecimal(`0.${'0'.repeat(17)}1`))).toBe(
      `1/${10n ** 18n}`,
    );
    expect(errorCode(() => parseDecimal(`0.${'0'.repeat(18)}1`))).toBe(
      'too-many-fraction-digits',
    );
  });

  it(`accepts ${MAX_DECIMAL_LENGTH} characters and rejects longer input`, () => {
    const longest = '9'.repeat(MAX_DECIMAL_LENGTH);
    expect(fraction(parseDecimal(longest))).toBe(longest);
    expect(errorCode(() => parseDecimal(`${longest}9`))).toBe(
      'decimal-too-long',
    );
  });

  it.each([
    '',
    '+1',
    '1e3',
    '1E-3',
    ' 1',
    '1 ',
    '1,000',
    '1,5',
    '1_000',
    '1.',
    '.5',
    '-',
    '-.5',
    '--1',
    'NaN',
    'Infinity',
    '0x10',
    '\u0661',
    '\uff11',
    '1/2',
  ])('rejects malformed decimal %j', (text) => {
    expect(errorCode(() => parseDecimal(text))).toBe('invalid-decimal');
  });

  it('rejects a non-string value at runtime', () => {
    expect(errorCode(() => parseDecimal(0.1 as unknown as string))).toBe(
      'invalid-decimal',
    );
  });

  it('preserves a decimal string through a JSON round trip', () => {
    const text = JSON.parse(JSON.stringify({ share: '0.38' })) as {
      share: string;
    };
    expect(equals(parseDecimal(text.share), rational(19n, 50n))).toBe(true);
  });
});

describe('fraction strings', () => {
  it('formats canonical integer and fraction text', () => {
    expect(toFractionString(rational(3n, 2n))).toBe('3/2');
    expect(toFractionString(rational(-6n, 2n))).toBe('-3');
    expect(toFractionString(rational(0n, 7n))).toBe('0');
  });
});

describe('generated properties', () => {
  it('satisfies field identities over seeded random rationals', () => {
    const next = seededRandom(20261028);
    for (let index = 0; index < 500; index += 1) {
      const a = randomRational(next);
      const b = randomRational(next);
      expect(equals(sub(add(a, b), b), a)).toBe(true);
      if (!isZero(b)) {
        expect(equals(div(mul(a, b), b), a)).toBe(true);
      }
      expect(compare(a, b)).toBe(-compare(b, a) || 0);
      const lower = rational(floor(a));
      expect(lessThanOrEqual(lower, a)).toBe(true);
      expect(lessThan(a, add(lower, rational(1n)))).toBe(true);
    }
  });

  it('parses generated decimal strings to the exact scaled integer', () => {
    const next = seededRandom(7);
    for (let index = 0; index < 500; index += 1) {
      const integerDigits = String(Math.floor(next() * 1_000_000_000));
      const fractionLength = Math.floor(next() * (MAX_FRACTION_DIGITS + 1));
      let fractionDigits = '';
      for (let digit = 0; digit < fractionLength; digit += 1) {
        fractionDigits += String(Math.floor(next() * 10));
      }
      const negative = next() < 0.5;
      const text = `${negative ? '-' : ''}${integerDigits}${
        fractionLength > 0 ? `.${fractionDigits}` : ''
      }`;
      const scaled = BigInt(integerDigits + fractionDigits);
      const expected = rational(
        negative ? -scaled : scaled,
        10n ** BigInt(fractionLength),
      );
      expect(equals(parseDecimal(text), expected)).toBe(true);
    }
  });

  it('produces identical fraction text on repeated evaluation', () => {
    const run = () =>
      fraction(
        div(mul(rational(120n), parseDecimal('0.38')), parseDecimal('0.85')),
      );
    expect(run()).toBe('912/17');
    expect(run()).toBe(run());
  });
});

describe('source constraints', () => {
  it('does not route rational decisions through floating point', () => {
    const source = rationalSource;
    for (const forbidden of [
      'parseFloat',
      'Number(',
      'Math.',
      'toFixed',
      'localeCompare',
      'toLocaleString',
    ]) {
      expect(source).not.toContain(forbidden);
    }
  });
});

describe('toDecimalString', () => {
  it.each([
    ['0', '0'],
    ['7', '7'],
    ['-0.25', '-0.25'],
    ['12.50', '12.5'],
    ['0.000000000000000001', '0.000000000000000001'],
    ['123456789012345678901234567890', '123456789012345678901234567890'],
  ])('prints %s as %s', (text, expected) => {
    expect(toDecimalString(parseDecimal(text))).toBe(expected);
  });

  it('prints an exact sum of two decimals', () => {
    expect(toDecimalString(add(parseDecimal('0.6'), parseDecimal('0.3')))).toBe(
      '0.9',
    );
    expect(toDecimalString(rational(1n, 8n))).toBe('0.125');
    expect(toDecimalString(rational(-7n, 20n))).toBe('-0.35');
  });

  it('round-trips through parseDecimal', () => {
    for (const text of ['0.1', '0.333', '42', '-3.14159']) {
      const value = parseDecimal(text);
      expect(equals(parseDecimal(toDecimalString(value)), value)).toBe(true);
    }
  });

  it.each([
    [1n, 3n],
    [2n, 7n],
    [1n, 6n],
  ])('refuses the non-terminating %d/%d', (num, den) => {
    expect(() => toDecimalString(rational(num, den))).toThrowError(
      expect.objectContaining({ code: 'non-terminating' }),
    );
  });
});

describe('integer power', () => {
  it('raises a fraction to a positive integer exactly', () => {
    expect(fraction(pow(rational(2n, 3n), 3))).toBe('8/27');
    expect(fraction(pow(parseDecimal('1.1'), 2))).toBe('121/100');
    expect(fraction(pow(parseDecimal('-0.5'), 3))).toBe('-1/8');
  });

  it('gives one for exponent zero, including zero to the zero', () => {
    expect(fraction(pow(parseDecimal('1.02'), 0))).toBe('1');
    expect(fraction(pow(rational(0n), 0))).toBe('1');
  });

  it('keeps twenty years of 2% growth exact', () => {
    const value = pow(parseDecimal('1.02'), 20);
    expect(value.num).toBe(51n ** 20n);
    expect(value.den).toBe(50n ** 20n);
  });

  it.each([-1, 1.5, Number.NaN, 1001])('rejects exponent %s', (exponent) => {
    expect(() => pow(rational(2n), exponent)).toThrow(RangeError);
  });
});
