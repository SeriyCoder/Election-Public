import type { Locale } from '.';

const formatters = new Map<Locale, Intl.NumberFormat>();
const separators = new Map<Locale, string>();

const DECIMAL_PATTERN = /^(-?)(0|[1-9][0-9]*)(?:\.([0-9]+))?$/;

function integerFormatter(locale: Locale): Intl.NumberFormat {
  let formatter = formatters.get(locale);
  if (formatter === undefined) {
    formatter = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 });
    formatters.set(locale, formatter);
  }
  return formatter;
}

function decimalSeparator(locale: Locale): string {
  let separator = separators.get(locale);
  if (separator === undefined) {
    separator =
      new Intl.NumberFormat(locale)
        .formatToParts(1.5)
        .find((part) => part.type === 'decimal')?.value ?? '.';
    separators.set(locale, separator);
  }
  return separator;
}

/** The only place locale number formatting is allowed; integers only. */
export function formatInteger(locale: Locale, value: number): string {
  if (!Number.isInteger(value)) {
    throw new RangeError(`formatInteger expects an integer, got ${value}`);
  }
  return integerFormatter(locale).format(value);
}

/**
 * Formats an ASCII decimal string for the locale without float conversion:
 * the integer part is grouped as a big integer, fractional digits are kept.
 */
export function formatDecimal(locale: Locale, text: string): string {
  const match = DECIMAL_PATTERN.exec(text);
  if (match === null) {
    throw new RangeError(`formatDecimal expects a decimal string, got ${text}`);
  }
  const [, sign = '', whole = '0', fraction] = match;
  const grouped = integerFormatter(locale).format(BigInt(whole));
  const tail =
    fraction === undefined ? '' : `${decimalSeparator(locale)}${fraction}`;
  return `${sign}${grouped}${tail}`;
}

/** The CLDR plural category of a whole count in the locale. */
export function pluralCategory(
  locale: Locale,
  count: number,
): Intl.LDMLPluralRule {
  return new Intl.PluralRules(locale).select(count);
}

/** A change with an explicit sign: `+` above zero, `-` below, none at zero. */
export function formatChange(locale: Locale, text: string): string {
  const formatted = formatDecimal(locale, text);
  return !text.startsWith('-') && /[1-9]/.test(text)
    ? `+${formatted}`
    : formatted;
}
