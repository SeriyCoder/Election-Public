import { isDraft, type Draft } from './edit';
import { buildLinkedBasis } from './linkedTurnout';
import { fractionParts, parsePercent, roundToPlaces } from './numeric';
import {
  add,
  compare,
  div,
  fromInteger,
  isZero,
  mul,
  parseDecimal,
  rational,
  sub,
  sum,
  toDecimalString,
  type Rational,
} from './rational';
import {
  LIMITS,
  MAX_EXACT_INTEGER_DIGITS,
  SCHEMA_VERSION,
  validateScenario,
} from './schema';

export interface PanelData {
  readonly partyIds: readonly string[];
  readonly groupIds: readonly string[];
  readonly shares: readonly Rational[];
  readonly compositions: readonly (readonly Rational[] | null)[];
  readonly turnouts: readonly Rational[];
}
export type PanelEdit =
  | { readonly ok: true; readonly draft: Draft }
  | {
      readonly ok: false;
      readonly reason: string;
      readonly ids: readonly string[];
    };
export type Smoothing =
  | {
      readonly ok: true;
      readonly rows: readonly (readonly Rational[])[];
      readonly matched: boolean;
      readonly groups: readonly string[];
    }
  | {
      readonly ok: false;
      readonly reason: string;
      readonly ids: readonly string[];
    };
export interface PanelPopulation {
  readonly shares: readonly Rational[];
  readonly turnout: Rational;
  readonly splits: readonly (readonly Rational[] | null)[];
  readonly voterShares: readonly Rational[];
}
export function panelPercent(value: Rational): string {
  return toDecimalString(
    parseDecimal(roundToPlaces(mul(value, rational(100n)), 16)),
  );
}
/** Display-only rounding of an exact decimal percent text; never decides anything. */
export function panelDisplay(text: string, places = 1): string {
  return roundToPlaces(parseDecimal(text), places);
}
/** Display-only: where a slider track's coloured part ends, 0–100 with one decimal. */
export function panelTrackPosition(
  text: string,
  min: number,
  max: number,
): string {
  if (!/^-?\d+(\.\d+)?$/.test(text) || max <= min) return '0';
  const low = fromInteger(min);
  const position = div(
    mul(sub(parseDecimal(text), low), rational(100n)),
    sub(fromInteger(max), low),
  );
  if (compare(position, rational(0n)) < 0) return '0';
  if (compare(position, rational(100n)) > 0) return '100';
  return roundToPlaces(position, 1);
}
export function panelSlices(values: readonly Rational[]) {
  let stop = rational(0n);
  return values.map((value) => {
    const start = panelPercent(stop);
    stop = add(stop, value);
    return { start, end: panelPercent(stop), size: panelPercent(value) };
  });
}
export function panelTotals(
  data: PanelData,
  locks: readonly string[],
  previous?: PanelData | null,
) {
  const total = sum(data.shares);
  return {
    total: panelPercent(total),
    balanced: compare(total, ONE) === 0,
    rows: data.compositions.map((row, p) => {
      if (row === null) return null;
      const value = sum(row);
      const locked = sum(
        row.filter((_, g) =>
          locks.includes(`${data.partyIds[p]}:${data.groupIds[g]}`),
        ),
      );
      return {
        total: panelPercent(value),
        over: compare(value, ONE) > 0,
        balanced: compare(value, ONE) === 0,
        gap: panelPercent(sub(value, ONE)),
        locked: panelPercent(locked),
        movable: panelPercent(sub(value, locked)),
        shifts: row.map((cell, g) =>
          panelPercent(sub(cell, previous?.compositions[p]?.[g] ?? cell)),
        ),
      };
    }),
  };
}
export function populationGaps(
  population: PanelPopulation,
  reference: readonly Rational[] | null,
  turnouts?: readonly Rational[],
) {
  return population.shares.map((share, g) => ({
    share: panelPercent(share),
    voters: panelPercent(population.voterShares[g]!),
    gap: reference?.[g] ? panelPercent(sub(share, reference[g]!)) : null,
    reference: reference?.[g] ? panelPercent(reference[g]!) : null,
    gapStart: reference?.[g]
      ? panelPercent(compare(share, reference[g]!) < 0 ? share : reference[g]!)
      : null,
    gapWidth: reference?.[g]
      ? panelPercent(
          compare(share, reference[g]!) < 0
            ? sub(reference[g]!, share)
            : sub(share, reference[g]!),
        )
      : null,
    shortfall: reference?.[g] ? compare(share, reference[g]!) < 0 : false,
    cast: turnouts ? panelPercent(mul(share, turnouts[g]!)) : null,
    abstaining: turnouts
      ? panelPercent(mul(share, sub(ONE, turnouts[g]!)))
      : null,
  }));
}
export function panelReference(
  input: unknown,
  ids: readonly string[],
): readonly Rational[] | null {
  if (!isDraft(input)) return null;
  const model = record(input.linkedModel);
  const basis = record(model?.groups);
  const data = readPanel(input);
  const inferred = data && panelPopulation(data);
  const values = ids.map((id) => {
    const saved = record(basis?.[id]);
    const stored =
      saved?.populationShare ??
      input.groups.find((group) => group.id === id)?.populationShare;
    return stored !== undefined
      ? panelFraction(stored)
      : inferred && data
        ? (inferred.shares[data.groupIds.indexOf(id)] ?? null)
        : null;
  });
  if (values.some((value) => value === null || compare(value, ZERO) < 0))
    return null;
  const shares = values as Rational[];
  return compare(sum(shares), ONE) === 0 ? shares : null;
}
export function panelAbstention(turnout: Rational): string {
  return panelPercent(sub(ONE, turnout));
}
export function largestPopulationGap(
  population: PanelPopulation,
  reference: readonly Rational[] | null,
): number | null {
  if (!reference || reference.length !== population.shares.length) return null;
  let largest: number | null = null;
  let magnitude = ZERO;
  population.shares.forEach((value, index) => {
    const difference = sub(value, reference[index]!);
    const absolute =
      compare(difference, ZERO) < 0 ? sub(ZERO, difference) : difference;
    if (compare(absolute, magnitude) > 0) {
      largest = index;
      magnitude = absolute;
    }
  });
  return largest;
}
const ZERO = rational(0n);
const ONE = rational(1n);
const GRID = 10n ** 12n;
const failed = (
  reason: string,
  ids: readonly string[] = [],
): Extract<PanelEdit, { ok: false }> => ({ ok: false, reason, ids });
const record = (value: unknown): Readonly<Record<string, unknown>> | null =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Readonly<Record<string, unknown>>)
    : null;
export function panelFraction(value: unknown): Rational | null {
  try {
    if (typeof value === 'string')
      return value.length <= MAX_EXACT_INTEGER_DIGITS
        ? parseDecimal(value)
        : null;
    const row = record(value);
    if (
      typeof row?.numerator !== 'string' ||
      typeof row.denominator !== 'string' ||
      row.numerator.length > MAX_EXACT_INTEGER_DIGITS ||
      row.denominator.length > MAX_EXACT_INTEGER_DIGITS ||
      !/^\d+$/.test(row.numerator) ||
      !/^[1-9]\d*$/.test(row.denominator)
    )
      return null;
    return rational(BigInt(row.numerator), BigInt(row.denominator));
  } catch {
    return null;
  }
}
function percent(text: string): Rational | null {
  if (text.length > MAX_EXACT_INTEGER_DIGITS) return null;
  const parsed = parsePercent(text);
  return parsed === null ||
    compare(parsed, ZERO) < 0 ||
    compare(parsed, rational(100n)) > 0
    ? null
    : div(parsed, rational(100n));
}
export function readPanel(input: unknown): PanelData | null {
  if (
    !isDraft(input) ||
    input.inputMode !== 'parties' ||
    input.parties.length === 0 ||
    input.parties.length > LIMITS.parties ||
    input.groups.length > LIMITS.groups
  )
    return null;
  const shares = input.parties.map((party) => panelFraction(party.voteShare));
  const turnouts = input.groups.map((group) => panelFraction(group.turnout));
  if (
    shares.some((value) => value === null || compare(value, ZERO) < 0) ||
    turnouts.some(
      (value) =>
        value === null || compare(value, ZERO) < 0 || compare(value, ONE) > 0,
    )
  )
    return null;
  const compositions: (Rational[] | null)[] = [];
  for (const party of input.parties) {
    if (party.composition === null) {
      compositions.push(null);
      continue;
    }
    const row = record(party.composition);
    if (!row) return null;
    const values = input.groups.map((group) => panelFraction(row[group.id]));
    if (
      values.some(
        (value) =>
          value === null || compare(value, ZERO) < 0 || compare(value, ONE) > 0,
      )
    )
      return null;
    compositions.push(values as Rational[]);
  }
  return {
    partyIds: input.parties.map((p) => p.id),
    groupIds: input.groups.map((g) => g.id),
    shares: shares as Rational[],
    turnouts: turnouts as Rational[],
    compositions,
  };
}
export function panelPopulation(data: PanelData): PanelPopulation | null {
  if (
    !data.groupIds.length ||
    compare(sum(data.shares), ONE) !== 0 ||
    data.turnouts.some(isZero) ||
    data.compositions.some((row, p) =>
      row === null ? !isZero(data.shares[p]!) : compare(sum(row), ONE) !== 0,
    )
  )
    return null;
  const contributions = data.groupIds.map((_, g) =>
    data.shares.map((share, p) =>
      mul(share, data.compositions[p]?.[g] ?? ZERO),
    ),
  );
  const voterShares = contributions.map(sum);
  const populations = voterShares.map((votes, g) =>
    div(votes, data.turnouts[g]!),
  );
  const total = sum(populations);
  if (isZero(total)) return null;
  return {
    shares: populations.map((value) => div(value, total)),
    turnout: div(ONE, total),
    splits: contributions.map((row, g) =>
      isZero(voterShares[g]!)
        ? null
        : row.map((value) => div(value, voterShares[g]!)),
    ),
    voterShares,
  };
}
function unlinked(input: Draft): Draft {
  const model = record(input.linkedModel);
  return {
    ...input,
    ...(model ? { linkedModel: { ...model, state: 'suspended' } } : {}),
    schemaVersion: SCHEMA_VERSION,
    groups: input.groups.map((group) => ({
      ...group,
      turnout: fractionParts(panelFraction(group.turnout)!),
    })),
  };
}
export function restorePanelCompositions(
  input: unknown,
  previous: PanelData,
): PanelEdit {
  const current = readPanel(input);
  if (
    !current ||
    !isDraft(input) ||
    current.groupIds.join('\0') !== previous.groupIds.join('\0') ||
    current.partyIds.join('\0') !== previous.partyIds.join('\0')
  )
    return failed('unknown-entity');
  return {
    ok: true,
    draft: finalize({
      ...unlinked(input),
      parties: input.parties.map((party, p) => ({
        ...party,
        composition:
          previous.compositions[p] === null
            ? null
            : Object.fromEntries(
                current.groupIds.map((id, g) => [
                  id,
                  fractionParts(previous.compositions[p]![g]!),
                ]),
              ),
      })),
    }),
  };
}
export function restorePanelRules(input: unknown, source: unknown): PanelEdit {
  if (!isDraft(input) || !isDraft(source)) return failed('invalid-scenario');
  const parties = new Set(input.parties.map((party) => party.id));
  const blocks = new Set(input.blocks.map((block) => block.id));
  return {
    ok: true,
    draft: {
      ...input,
      coalitionRules: Object.fromEntries(
        Object.entries(source.coalitionRules).map(([field, value]) => {
          const known = field === 'incompatibleBlockPairs' ? blocks : parties;
          return [
            field,
            Array.isArray(value)
              ? value.filter(
                  (pair: unknown) =>
                    Array.isArray(pair) &&
                    pair.length === 2 &&
                    pair.every(
                      (id: unknown) => typeof id === 'string' && known.has(id),
                    ),
                )
              : value,
          ];
        }),
      ),
    },
  };
}
function finalize(input: Draft): Draft {
  const data = readPanel(input);
  const population = data ? panelPopulation(data) : null;
  return population
    ? {
        ...input,
        rules: {
          ...record(input.rules),
          overallTurnout: fractionParts(population.turnout),
        },
      }
    : input;
}
/**
 * Explicit rebuild of a suspended linked basis from the panel's current party
 * votes, compositions and group turnouts, with overall turnout derived from
 * them. Saved destination restrictions are kept; refusals mutate nothing.
 */
export function rebuildPanelBasis(input: unknown): PanelEdit {
  if (!isDraft(input)) return failed('invalid-scenario');
  const saved = record(record(input.linkedModel)?.groups);
  const plain: Record<string, unknown> = { ...input };
  delete plain.linkedModel;
  const built = buildLinkedBasis(finalize(plain as Draft));
  if (!built.ok) return failed(built.reason);
  const model = record(built.draft.linkedModel);
  const groups = record(model?.groups);
  if (!model || !groups || !saved) return built;
  const partyIds = new Set(input.parties.map((party) => party.id));
  return {
    ok: true,
    draft: {
      ...built.draft,
      linkedModel: {
        ...model,
        groups: Object.fromEntries(
          Object.entries(groups).map(([id, row]) => {
            const kept = record(saved[id])?.allowedPartyIds;
            return [
              id,
              Array.isArray(kept)
                ? {
                    ...record(row),
                    allowedPartyIds: kept.filter((party) =>
                      partyIds.has(party as string),
                    ),
                  }
                : row,
            ];
          }),
        ),
      },
    },
  };
}
export function editPanelCell(
  input: unknown,
  party: string,
  group: string | null,
  text: string,
): PanelEdit {
  const data = readPanel(input);
  const value = percent(text);
  if (!data || !isDraft(input)) return failed('invalid-scenario');
  if (value === null) return failed('invalid-percent');
  if (
    !data.partyIds.includes(party) ||
    (group !== null && !data.groupIds.includes(group))
  )
    return failed('unknown-entity');
  const draft = unlinked(input);
  return {
    ok: true,
    draft: finalize({
      ...draft,
      parties: draft.parties.map((row) =>
        row.id !== party
          ? row
          : group === null
            ? { ...row, voteShare: fractionParts(value) }
            : {
                ...row,
                composition: {
                  ...Object.fromEntries(
                    data.groupIds.map((id) => [id, fractionParts(ZERO)]),
                  ),
                  ...record(row.composition),
                  [group]: fractionParts(value),
                },
              },
      ),
    }),
  };
}
function gcd(a: bigint, b: bigint): bigint {
  while (b !== 0n) [a, b] = [b, a % b];
  return a;
}
function lattice(values: readonly Rational[]): bigint | null {
  let unit = GRID;
  for (const value of values) {
    unit = (unit / gcd(unit, value.den)) * value.den;
    if (unit.toString().length > 180) return null;
  }
  return unit;
}
function normalize(
  row: readonly Rational[],
  free: readonly boolean[],
): readonly Rational[] | null {
  const fixed = sum(row.filter((_, i) => !free[i]));
  if (
    compare(fixed, ONE) > 0 ||
    (!free.some(Boolean) && compare(fixed, ONE) !== 0)
  )
    return null;
  if (compare(sum(row), ONE) === 0) return row;
  const unit = lattice([fixed]);
  if (unit === null) return null;
  const room = (unit * (ONE.num * fixed.den - fixed.num)) / fixed.den;
  const weights = row.map((value, i) =>
    free[i] ? (value.num * GRID * 2n + value.den) / (value.den * 2n) : 0n,
  );
  if (weights.reduce((a, b) => a + b, 0n) === 0n)
    weights.forEach((_, i) => {
      if (free[i]) weights[i] = 1n;
    });
  const total = weights.reduce((a, b) => a + b, 0n);
  if (total === 0n) return row;
  const placed = weights.map((weight) => (room * weight) / total);
  let left = room - placed.reduce((a, b) => a + b, 0n);
  const order = row
    .map((_, i) => i)
    .filter((i) => free[i])
    .sort((a, b) => {
      const diff =
        ((room * weights[b]!) % total) - ((room * weights[a]!) % total);
      return diff < 0n ? -1 : diff > 0n ? 1 : a - b;
    });
  for (const i of order) {
    if (left === 0n) break;
    placed[i] = placed[i]! + 1n;
    left -= 1n;
  }
  return row.map((value, i) => (free[i] ? rational(placed[i]!, unit) : value));
}
export function alignPanelVotes(
  input: unknown,
  locks: readonly string[],
): PanelEdit {
  const data = readPanel(input);
  if (!data || !isDraft(input)) return failed('invalid-scenario');
  const free = data.partyIds.map((id) => !locks.includes(id));
  const fixed = sum(data.shares.filter((_, p) => !free[p]));
  const movable = sum(data.shares.filter((_, p) => free[p]));
  const room = sub(ONE, fixed);
  const count = free.filter(Boolean).length;
  if (compare(room, ZERO) < 0 || (count === 0 && !isZero(room)))
    return failed('locked-total-exceeded', locks);
  const values = data.shares.map((share, p) =>
    !free[p]
      ? share
      : isZero(movable)
        ? div(room, rational(BigInt(count)))
        : mul(room, div(share, movable)),
  );
  if (
    values.some(
      (value) =>
        value.den.toString().length > MAX_EXACT_INTEGER_DIGITS ||
        value.num.toString().length > MAX_EXACT_INTEGER_DIGITS,
    )
  )
    return failed('precision-limit');
  const draft = unlinked(input);
  return {
    ok: true,
    draft: finalize({
      ...draft,
      parties: draft.parties.map((party, p) => ({
        ...party,
        voteShare: fractionParts(values[p]!),
      })),
    }),
  };
}
/** One exact 0.25-point stepper move of a percent text, kept within 0–100. */
export function stepPanelPercent(
  text: string,
  direction: 1 | -1,
): string | null {
  const value = parsePercent(text);
  const hundred = rational(100n);
  if (
    value === null ||
    compare(value, rational(0n)) < 0 ||
    compare(value, hundred) > 0
  )
    return null;
  const moved = add(value, rational(BigInt(direction), 4n));
  const clamped =
    compare(moved, rational(0n)) < 0
      ? rational(0n)
      : compare(moved, hundred) > 0
        ? hundred
        : moved;
  return toDecimalString(clamped);
}
export function unusualGrowth(value: string): boolean {
  const rate = parseDecimal(value);
  return (
    compare(rate, rational(1n, 40n)) > 0 ||
    compare(rate, rational(-1n, 200n)) < 0
  );
}
export function smoothPanel(
  data: PanelData,
  reference: readonly Rational[],
  locks: readonly string[],
): Smoothing {
  const { shares, compositions, groupIds, partyIds, turnouts } = data;
  if (compare(sum(shares), ONE) !== 0) return failed('unbalanced-votes');
  if (
    reference.length !== groupIds.length ||
    !reference.length ||
    compare(sum(reference), ONE) !== 0
  )
    return failed('unknown-population');
  const missing = partyIds.filter((_, p) => compositions[p] === null);
  if (missing.length) return failed('unknown-party-composition', missing);
  const free = partyIds.map((id) =>
    groupIds.map((group) => !locks.includes(`${id}:${group}`)),
  );
  const rows = compositions.map((row, p) => normalize(row!, free[p]!));
  const impossible = partyIds.filter((_, p) => rows[p] === null);
  if (impossible.length) return failed('locked-total-exceeded', impossible);
  const normalized = rows as readonly (readonly Rational[])[];
  const weight = reference.map((value, g) => mul(value, turnouts[g]!));
  const total = sum(weight);
  if (isZero(total) || turnouts.some(isZero))
    return failed('unknown-population');
  const target = weight.map((value) => div(value, total));
  const column = (values: readonly (readonly Rational[])[], g: number) =>
    sum(shares.map((share, p) => mul(share, values[p]![g]!)));
  const mismatch = (values: readonly (readonly Rational[])[]) =>
    groupIds.filter((_, g) => compare(column(values, g), target[g]!) !== 0);
  if (
    mismatch(compositions as readonly (readonly Rational[])[]).length === 0 &&
    compositions.every((row) => compare(sum(row!), ONE) === 0)
  ) {
    return {
      ok: true,
      rows: compositions as readonly (readonly Rational[])[],
      matched: true,
      groups: [],
    };
  }
  const fallback = (): Smoothing => ({
    ok: true,
    rows: normalized,
    matched: false,
    groups: mismatch(normalized),
  });
  const locked = groupIds.map((_, g) =>
    sum(
      shares.map((share, p) =>
        free[p]![g] ? ZERO : mul(share, normalized[p]![g]!),
      ),
    ),
  );
  const need = target.map((value, g) => sub(value, locked[g]!));
  if (need.some((value) => compare(value, ZERO) < 0)) return fallback();
  const supply = shares.map((share, p) =>
    mul(share, sub(ONE, sum(normalized[p]!.filter((_, g) => !free[p]![g])))),
  );
  const unit = lattice([...need, ...supply]);
  if (unit === null) return failed('precision-limit');
  const units = (value: Rational): bigint => (value.num * unit) / value.den;
  const needs = need.map(units);
  const supplies = supply.map(units);
  const flow = shares.map((share, p) =>
    groupIds.map((_, g) =>
      free[p]![g] ? units(mul(share, normalized[p]![g]!)) : 0n,
    ),
  );
  const columnUnits = (g: number) => flow.reduce((a, row) => a + row[g]!, 0n);
  const rowUnits = (p: number) => flow[p]!.reduce((a, b) => a + b, 0n);
  groupIds.forEach((_, g) => {
    const present = columnUnits(g);
    if (present > needs[g]!)
      flow.forEach((row) => {
        row[g] = (row[g]! * needs[g]!) / present;
      });
  });
  let visits = 0;
  for (let iteration = 0; iteration < 10000; iteration += 1) {
    const fromParty = new Map<number, number | null>();
    const fromGroup = new Map<number, number>();
    const queue: { party: boolean; at: number }[] = [];
    shares.forEach((_, p) => {
      if (supplies[p]! > rowUnits(p)) {
        fromParty.set(p, null);
        queue.push({ party: true, at: p });
      }
    });
    let end: number | null = null;
    for (let cursor = 0; cursor < queue.length && end === null; cursor += 1) {
      const node = queue[cursor]!;
      if (node.party) {
        for (let g = 0; g < groupIds.length; g += 1) {
          visits += 1;
          if (visits > 1_000_000) return failed('search-limit');
          if (!free[node.at]![g] || fromGroup.has(g)) continue;
          fromGroup.set(g, node.at);
          if (needs[g]! > columnUnits(g)) {
            end = g;
            break;
          }
          queue.push({ party: false, at: g });
        }
      } else {
        for (let p = 0; p < shares.length; p += 1) {
          visits += 1;
          if (visits > 1_000_000) return failed('search-limit');
          if (fromParty.has(p) || flow[p]![node.at]! === 0n) continue;
          fromParty.set(p, node.at);
          queue.push({ party: true, at: p });
        }
      }
    }
    if (end === null) break;
    let g = end;
    let amount = needs[end]! - columnUnits(end);
    const steps: { p: number; g: number; back: boolean }[] = [];
    for (;;) {
      const p = fromGroup.get(g)!;
      steps.push({ p, g, back: false });
      const back = fromParty.get(p)!;
      if (back === null) {
        const room = supplies[p]! - rowUnits(p);
        if (room < amount) amount = room;
        break;
      }
      steps.push({ p, g: back, back: true });
      if (flow[p]![back]! < amount) amount = flow[p]![back]!;
      g = back;
    }
    for (const step of steps)
      flow[step.p]![step.g] =
        flow[step.p]![step.g]! + (step.back ? -amount : amount);
  }
  if (needs.some((value, g) => value !== columnUnits(g))) return fallback();
  const result = normalized.map((row, p) =>
    row.map((value, g) =>
      free[p]![g] && !isZero(shares[p]!)
        ? div(rational(flow[p]![g]!, unit), shares[p]!)
        : value,
    ),
  );
  if (
    result.some((row) =>
      row.some(
        (value) => value.den.toString().length > MAX_EXACT_INTEGER_DIGITS,
      ),
    )
  )
    return failed('precision-limit');
  return { ok: true, rows: result, matched: true, groups: [] };
}
export function applyPanelRows(
  input: unknown,
  rows: readonly (readonly Rational[])[],
): PanelEdit {
  const data = readPanel(input);
  if (
    !data ||
    !isDraft(input) ||
    rows.length !== data.partyIds.length ||
    rows.some(
      (row) =>
        row.length !== data.groupIds.length || compare(sum(row), ONE) !== 0,
    )
  )
    return failed('invalid-scenario');
  const draft = unlinked(input);
  const next = finalize({
    ...draft,
    parties: draft.parties.map((party, p) => ({
      ...party,
      composition: Object.fromEntries(
        data.groupIds.map((id, g) => [id, fractionParts(rows[p]![g]!)]),
      ),
    })),
  });
  const validation = validateScenario(next);
  return validation.ok
    ? { ok: true, draft: next }
    : failed(
        validation.issues.some((issue) => issue.code === 'too-long')
          ? 'precision-limit'
          : 'invalid-result',
      );
}
export function correctPanelTurnout(
  input: unknown,
  values: Readonly<Record<string, string>>,
): PanelEdit {
  if (!isDraft(input) || !readPanel(input)) return failed('invalid-scenario');
  const parsed = input.groups.map((group) =>
    values[group.id] === undefined
      ? panelFraction(group.turnout)
      : percent(values[group.id]!),
  );
  if (parsed.some((value) => value === null)) return failed('invalid-percent');
  const draft = unlinked(input);
  const next = finalize({
    ...draft,
    groups: draft.groups.map((group, g) => ({
      ...group,
      turnout: fractionParts(parsed[g]!),
    })),
  });
  const checked = validateScenario(next);
  return checked.ok ? { ok: true, draft: next } : failed('invalid-result');
}
