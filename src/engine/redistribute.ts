import {
  div,
  isNegative,
  isZero,
  mul,
  rational,
  sub,
  sum,
  type Rational,
} from './rational';

export interface ShareRow {
  readonly value: Rational;
  readonly locked: boolean;
}

export type ShareRedistribution =
  | { readonly ok: true; readonly values: readonly Rational[] }
  | {
      readonly ok: false;
      readonly reason: 'locked-total-exceeded' | 'no-unlocked-recipient';
    };

/** Adjusts one exact share while preserving other locks and the exact total. */
export function redistributeShares(
  rows: readonly ShareRow[],
  selected: number,
  requested: Rational,
): ShareRedistribution {
  if (
    !Number.isSafeInteger(selected) ||
    selected < 0 ||
    selected >= rows.length
  ) {
    throw new RangeError('Selected share row is outside the input');
  }
  const lockedTotal = sum(
    rows.flatMap((row, index) =>
      index !== selected && row.locked ? [row.value] : [],
    ),
  );
  const remaining = sub(sub(rational(1n), requested), lockedTotal);
  if (isNegative(remaining)) {
    return { ok: false, reason: 'locked-total-exceeded' };
  }
  const unlocked = rows.filter(
    (row, index) => index !== selected && !row.locked,
  );
  if (unlocked.length === 0 && !isZero(remaining)) {
    return { ok: false, reason: 'no-unlocked-recipient' };
  }
  const previousTotal = sum(unlocked.map((row) => row.value));
  const count = rational(BigInt(unlocked.length));
  return {
    ok: true,
    values: rows.map((row, index) => {
      if (index === selected) {
        return requested;
      }
      if (row.locked) {
        return row.value;
      }
      return isZero(previousTotal)
        ? div(remaining, count)
        : div(mul(remaining, row.value), previousTotal);
    }),
  };
}
