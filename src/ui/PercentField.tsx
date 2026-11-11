import { useState } from 'preact/hooks';
import {
  fractionToPercent,
  parseCount,
  percentToFraction,
} from '../engine/numeric';

/** How a stored value is shown and how typed text maps back to it. */
export interface FieldCodec {
  readonly show: (value: unknown) => string;
  readonly read: (text: string) => unknown;
}

function plain(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }
  return typeof value === 'string' ? value : String(value);
}

export const PERCENT: FieldCodec = {
  show: (value) => fractionToPercent(value) ?? plain(value),
  read: (text) => percentToFraction(text) ?? text,
};

export const COUNT: FieldCodec = {
  show: plain,
  read: (text) => parseCount(text) ?? text,
};

export const DECIMAL: FieldCodec = {
  show: plain,
  read: (text) => text.trim(),
};

export interface ValueFieldProps {
  readonly value: unknown;
  readonly codec?: FieldCodec;
  readonly onCommit: (text: string) => void;
  readonly attributes: Readonly<Record<string, string>>;
  readonly label: string;
  readonly disabled?: boolean;
  readonly className?: string;
}

/**
 * Keeps the typed text while it still maps to the stored value, so "12,"
 * or "0.50" are not rewritten under the cursor; any outside change wins.
 */
export function ValueField({
  value,
  codec = PERCENT,
  onCommit,
  attributes,
  label,
  disabled = false,
  className = 'field__input field__input--number',
}: ValueFieldProps) {
  const [typed, setTyped] = useState<string | null>(null);
  const shown =
    typed !== null && (codec.read(typed) === value || typed === value)
      ? typed
      : codec.show(value);
  return (
    <input
      {...attributes}
      class={className}
      type="text"
      inputMode="decimal"
      dir="ltr"
      aria-label={label}
      disabled={disabled}
      value={shown}
      onInput={(event) => {
        const text = event.currentTarget.value;
        setTyped(text);
        onCommit(text);
      }}
    />
  );
}
