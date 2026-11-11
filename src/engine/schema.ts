import {
  RationalError,
  compare,
  div,
  isNegative,
  isZero,
  mul,
  neg,
  parseDecimal,
  rational,
  sub,
  sum,
  type Rational,
} from './rational';

export const SCHEMA_VERSION = 5;

/** Older versions the validator still reads and returns as the current one. */
const MIGRATED_VERSIONS: readonly number[] = [1, 2, 3, 4];

export const MAX_EXACT_INTEGER_DIGITS = 256;
export const MAX_PARTY_DENOMINATOR_DIGITS = 2048;

export const LIMITS = Object.freeze({
  groups: 100,
  parties: 100,
  blocks: 50,
  pairs: 5000,
  nameLength: 200,
  notesLength: 10000,
  idLength: 64,
  maxSeatCount: 10000,
  jsonBytes: 2 * 1024 * 1024,
  projectionYears: 50,
});

export type IdPair = readonly [string, string];

export type MajorityMode = 'default' | 'override';
export type AllocationMethod = 'hamilton';
export type VotingMode = 'restricted' | 'open';

export interface Rules {
  readonly populationTotal: string;
  readonly seatCount: number;
  readonly majorityMode: MajorityMode;
  readonly majorityOverride: number | null;
  readonly threshold: string;
  readonly allocationMethod: AllocationMethod;
}

export interface PartyModeRules extends Rules {
  readonly overallTurnout: ExactFraction;
  readonly validBallotRate: string;
}

export interface Group {
  readonly id: string;
  readonly name: string;
  readonly notes: string;
  readonly populationShare: string;
  readonly growthRate: string;
  readonly turnout: string;
  readonly turnoutChange: string;
  readonly validBallotRate: string;
  readonly participationFactor: string;
  readonly votingMode: VotingMode;
  readonly allowedPartyIds: readonly string[];
  readonly voteWeights: Readonly<Record<string, string>>;
}

export interface PartyGroup {
  readonly id: string;
  readonly name: string;
  readonly notes: string;
  readonly growthRate: string;
  readonly turnout: ExactFraction;
  readonly turnoutChange: string;
}

export interface ExactFraction {
  readonly numerator: string;
  readonly denominator: string;
}

export interface LinkedGroup {
  readonly populationShare: ExactFraction;
  readonly preferences: Readonly<Record<string, ExactFraction>>;
  readonly allowedPartyIds: readonly string[];
  readonly lastNonzeroTurnout: ExactFraction;
}

export interface LinkedModel {
  readonly state: 'current' | 'suspended';
  readonly groups: Readonly<Record<string, LinkedGroup>>;
}

export interface Party {
  readonly id: string;
  readonly name: string;
  readonly notes: string;
  readonly color: string;
  readonly blockId: string | null;
  readonly tieBreakOrder: number;
  readonly canJoinGovernment: boolean;
}

export interface PartyModeParty extends Party {
  readonly voteShare: ExactFraction;
  readonly composition: Readonly<Record<string, ExactFraction>> | null;
}

export interface Block {
  readonly id: string;
  readonly name: string;
  readonly notes: string;
  readonly color: string;
}

export interface CoalitionRules {
  readonly incompatiblePartyPairs: readonly IdPair[];
  readonly incompatibleBlockPairs: readonly IdPair[];
  readonly compatiblePartyOverrides: readonly IdPair[];
  /** Directed: [the party that refuses, the party it refuses]. */
  readonly partyRefusals: readonly IdPair[];
}

interface ScenarioBase {
  readonly schemaVersion: typeof SCHEMA_VERSION;
  readonly id: string;
  readonly name: string;
  readonly notes: string;
  readonly blocks: readonly Block[];
  readonly coalitionRules: CoalitionRules;
}

export interface GroupScenario extends ScenarioBase {
  readonly inputMode: 'groups';
  readonly rules: Rules;
  readonly groups: readonly Group[];
  readonly parties: readonly Party[];
}

export interface PartyScenario extends ScenarioBase {
  readonly inputMode: 'parties';
  readonly rules: PartyModeRules;
  readonly groups: readonly PartyGroup[];
  readonly parties: readonly PartyModeParty[];
  readonly linkedModel?: LinkedModel;
}

export type Scenario = GroupScenario | PartyScenario;

export type IssueCode =
  | 'invalid-json'
  | 'too-large'
  | 'not-an-object'
  | 'unsupported-version'
  | 'invalid-version'
  | 'missing-field'
  | 'wrong-type'
  | 'not-an-integer'
  | 'invalid-id'
  | 'duplicate-id'
  | 'dangling-reference'
  | 'duplicate-reference'
  | 'invalid-color'
  | 'invalid-decimal'
  | 'out-of-range'
  | 'invalid-total'
  | 'too-many'
  | 'too-long'
  | 'invalid-enum'
  | 'inconsistent-majority'
  | 'empty-destinations'
  | 'disallowed-destination'
  | 'restricted-mixed-blocks'
  | 'invalid-pair'
  | 'duplicate-pair'
  | 'conflicting-pair';

export interface ValidationIssue {
  readonly path: string;
  readonly code: IssueCode;
  readonly message: string;
}

export type ValidationResult =
  | { readonly ok: true; readonly scenario: Scenario }
  | { readonly ok: false; readonly issues: readonly ValidationIssue[] };

type JsonObject = Record<string, unknown>;

const ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;
const COLOR_PATTERN = /^#[0-9A-Fa-f]{6}$/;
const ZERO = rational(0n);
const ONE = rational(1n);
const SUM_TOLERANCE = rational(1n, 1_000_000_000n);
const PAIR_FIELDS = [
  'incompatiblePartyPairs',
  'incompatibleBlockPairs',
  'compatiblePartyOverrides',
] as const;

type PairField = (typeof PAIR_FIELDS)[number] | 'partyRefusals';

interface FractionValue {
  readonly text: string;
  readonly value: Rational;
}

interface ExactFractionValue {
  readonly canonical: ExactFraction;
  readonly value: Rational;
}

interface FractionBounds {
  readonly min: Rational;
  readonly minInclusive: boolean;
  readonly max: Rational | null;
}

const UNIT_INTERVAL: FractionBounds = {
  min: ZERO,
  minInclusive: true,
  max: ONE,
};
const POSITIVE: FractionBounds = { min: ZERO, minInclusive: false, max: null };
const SIGNED_UNIT: FractionBounds = {
  min: neg(ONE),
  minInclusive: true,
  max: ONE,
};

class Context {
  readonly issues: ValidationIssue[] = [];

  report(path: string, code: IssueCode, message: string): void {
    this.issues.push({ path, code, message });
  }
}

function isRecord(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function child(path: string, key: string): string {
  return path === '' ? key : `${path}.${key}`;
}

function item(path: string, index: number): string {
  return `${path}[${index}]`;
}

function withinTolerance(total: Rational): boolean {
  const difference = sub(total, ONE);
  const magnitude = isNegative(difference) ? neg(difference) : difference;
  return compare(magnitude, SUM_TOLERANCE) <= 0;
}

function pairKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

function readPresent(
  ctx: Context,
  obj: JsonObject,
  path: string,
  key: string,
): { present: boolean; value: unknown } {
  if (!Object.hasOwn(obj, key)) {
    ctx.report(child(path, key), 'missing-field', `Field "${key}" is required`);
    return { present: false, value: undefined };
  }
  return { present: true, value: obj[key] };
}

function readString(
  ctx: Context,
  obj: JsonObject,
  path: string,
  key: string,
  maxLength: number,
): string {
  const field = readPresent(ctx, obj, path, key);
  if (!field.present) {
    return '';
  }
  if (typeof field.value !== 'string') {
    ctx.report(child(path, key), 'wrong-type', `"${key}" must be a string`);
    return '';
  }
  if (field.value.length > maxLength) {
    ctx.report(
      child(path, key),
      'too-long',
      `"${key}" exceeds ${maxLength} characters`,
    );
  }
  return field.value;
}

/** Like `readString`, but an absent field is an empty string, not an error. */
function readOptionalString(
  ctx: Context,
  obj: JsonObject,
  path: string,
  key: string,
  maxLength: number,
): string {
  return Object.hasOwn(obj, key)
    ? readString(ctx, obj, path, key, maxLength)
    : '';
}

function checkId(ctx: Context, value: unknown, path: string): string | null {
  if (typeof value !== 'string') {
    ctx.report(path, 'wrong-type', 'Identifier must be a string');
    return null;
  }
  if (!ID_PATTERN.test(value)) {
    ctx.report(
      path,
      'invalid-id',
      'Identifier must be 1 to 64 ASCII letters, digits, "_" or "-"',
    );
    return null;
  }
  return value;
}

function readId(
  ctx: Context,
  obj: JsonObject,
  path: string,
  key: string,
): string | null {
  const field = readPresent(ctx, obj, path, key);
  return field.present ? checkId(ctx, field.value, child(path, key)) : null;
}

function readColor(
  ctx: Context,
  obj: JsonObject,
  path: string,
  key: string,
): string {
  const field = readPresent(ctx, obj, path, key);
  if (!field.present) {
    return '';
  }
  if (typeof field.value !== 'string') {
    ctx.report(child(path, key), 'wrong-type', 'Color must be a string');
    return '';
  }
  if (!COLOR_PATTERN.test(field.value)) {
    ctx.report(child(path, key), 'invalid-color', 'Color must be #RRGGBB');
  }
  return field.value;
}

function checkFraction(
  ctx: Context,
  value: unknown,
  path: string,
  bounds: FractionBounds,
): FractionValue | null {
  if (typeof value !== 'string') {
    ctx.report(path, 'wrong-type', 'Value must be a decimal string');
    return null;
  }
  let parsed: Rational;
  try {
    parsed = parseDecimal(value);
  } catch (error) {
    if (error instanceof RationalError) {
      ctx.report(path, 'invalid-decimal', error.message);
      return null;
    }
    throw error;
  }
  const lower = compare(parsed, bounds.min);
  const belowMin = bounds.minInclusive ? lower < 0 : lower <= 0;
  const aboveMax = bounds.max !== null && compare(parsed, bounds.max) > 0;
  if (belowMin || aboveMax) {
    ctx.report(path, 'out-of-range', `Value ${value} is out of range`);
    return null;
  }
  return { text: value, value: parsed };
}

function readFraction(
  ctx: Context,
  obj: JsonObject,
  path: string,
  key: string,
  bounds: FractionBounds = UNIT_INTERVAL,
): FractionValue | null {
  const field = readPresent(ctx, obj, path, key);
  return field.present
    ? checkFraction(ctx, field.value, child(path, key), bounds)
    : null;
}

/** A signed yearly rate in [−1, 1]; an absent field reads as 0. */
function readOptionalFraction(
  ctx: Context,
  obj: JsonObject,
  path: string,
  key: string,
): string {
  if (!Object.hasOwn(obj, key)) {
    return '0';
  }
  return (
    checkFraction(ctx, obj[key], child(path, key), SIGNED_UNIT)?.text ?? ''
  );
}

function checkInteger(
  ctx: Context,
  value: unknown,
  path: string,
  min: number,
  max: number,
): number | null {
  if (typeof value !== 'number') {
    ctx.report(path, 'wrong-type', 'Value must be a number');
    return null;
  }
  if (!Number.isSafeInteger(value)) {
    ctx.report(path, 'not-an-integer', 'Value must be a safe integer');
    return null;
  }
  if (value < min || value > max) {
    ctx.report(path, 'out-of-range', `Value must be between ${min} and ${max}`);
    return null;
  }
  return value;
}

function readEnum<T extends string>(
  ctx: Context,
  obj: JsonObject,
  path: string,
  key: string,
  allowed: readonly T[],
): T | null {
  const field = readPresent(ctx, obj, path, key);
  if (!field.present) {
    return null;
  }
  const match = allowed.find((option) => option === field.value);
  if (match === undefined) {
    ctx.report(
      child(path, key),
      'invalid-enum',
      `"${key}" must be one of: ${allowed.join(', ')}`,
    );
    return null;
  }
  return match;
}

function readArray(
  ctx: Context,
  obj: JsonObject,
  path: string,
  key: string,
): unknown[] | null {
  const field = readPresent(ctx, obj, path, key);
  if (!field.present) {
    return null;
  }
  if (!Array.isArray(field.value)) {
    ctx.report(child(path, key), 'wrong-type', `"${key}" must be an array`);
    return null;
  }
  return field.value as unknown[];
}

function readRecord(
  ctx: Context,
  obj: JsonObject,
  path: string,
  key: string,
): JsonObject | null {
  const field = readPresent(ctx, obj, path, key);
  if (!field.present) {
    return null;
  }
  if (!isRecord(field.value)) {
    ctx.report(child(path, key), 'wrong-type', `"${key}" must be an object`);
    return null;
  }
  return field.value;
}

function checkCount(
  ctx: Context,
  list: readonly unknown[] | null,
  path: string,
  limit: number,
): void {
  if (list !== null && list.length > limit) {
    ctx.report(path, 'too-many', `At most ${limit} entries are allowed`);
  }
}

function asRecord(
  ctx: Context,
  value: unknown,
  path: string,
): JsonObject | null {
  if (!isRecord(value)) {
    ctx.report(path, 'wrong-type', 'Entry must be an object');
    return null;
  }
  return value;
}

function registerId(
  ctx: Context,
  id: string | null,
  seen: Set<string>,
  path: string,
): void {
  if (id === null) {
    return;
  }
  if (seen.has(id)) {
    ctx.report(path, 'duplicate-id', `Identifier "${id}" is used twice`);
    return;
  }
  seen.add(id);
}

function validateVersion(ctx: Context, root: JsonObject): boolean {
  const field = readPresent(ctx, root, '', 'schemaVersion');
  if (!field.present) {
    return false;
  }
  const version = field.value;
  if (
    version === SCHEMA_VERSION ||
    MIGRATED_VERSIONS.includes(version as number)
  ) {
    return true;
  }
  if (
    typeof version === 'number' &&
    Number.isSafeInteger(version) &&
    version > SCHEMA_VERSION
  ) {
    ctx.report(
      'schemaVersion',
      'unsupported-version',
      `Schema version ${version} is newer than supported version ${SCHEMA_VERSION}`,
    );
  } else {
    ctx.report(
      'schemaVersion',
      'invalid-version',
      `Schema version must be an integer from 1 to ${SCHEMA_VERSION}`,
    );
  }
  return false;
}

function validateRules(ctx: Context, root: JsonObject): Rules {
  const path = 'rules';
  const obj = readRecord(ctx, root, '', path);
  const fallback: Rules = {
    populationTotal: '',
    seatCount: 0,
    majorityMode: 'default',
    majorityOverride: null,
    threshold: '',
    allocationMethod: 'hamilton',
  };
  if (obj === null) {
    return fallback;
  }
  const populationTotal = readFraction(
    ctx,
    obj,
    path,
    'populationTotal',
    POSITIVE,
  );
  const seatField = readPresent(ctx, obj, path, 'seatCount');
  const seatCount = seatField.present
    ? checkInteger(
        ctx,
        seatField.value,
        child(path, 'seatCount'),
        1,
        LIMITS.maxSeatCount,
      )
    : null;
  const majorityMode = readEnum(ctx, obj, path, 'majorityMode', [
    'default',
    'override',
  ] as const);
  const overrideField = readPresent(ctx, obj, path, 'majorityOverride');
  const overridePath = child(path, 'majorityOverride');
  let majorityOverride: number | null = null;
  if (overrideField.present && majorityMode !== null) {
    if (majorityMode === 'default' && overrideField.value !== null) {
      ctx.report(
        overridePath,
        'inconsistent-majority',
        'Default majority mode requires majorityOverride to be null',
      );
    } else if (majorityMode === 'override' && overrideField.value === null) {
      ctx.report(
        overridePath,
        'inconsistent-majority',
        'Override majority mode requires a majorityOverride value',
      );
    } else if (majorityMode === 'override') {
      majorityOverride = checkInteger(
        ctx,
        overrideField.value,
        overridePath,
        1,
        seatCount ?? LIMITS.maxSeatCount,
      );
    }
  }
  const threshold = readFraction(ctx, obj, path, 'threshold');
  const allocationMethod = readEnum(ctx, obj, path, 'allocationMethod', [
    'hamilton',
  ] as const);
  return {
    populationTotal: populationTotal?.text ?? '',
    seatCount: seatCount ?? 0,
    majorityMode: majorityMode ?? 'default',
    majorityOverride,
    threshold: threshold?.text ?? '',
    allocationMethod: allocationMethod ?? 'hamilton',
  };
}

function validatePartyRules(ctx: Context, root: JsonObject): PartyModeRules {
  const rules = validateRules(ctx, root);
  const obj = isRecord(root.rules) ? root.rules : null;
  const overallTurnout =
    obj === null
      ? null
      : readExactFraction(ctx, obj.overallTurnout, 'rules.overallTurnout');
  const validBallotRate =
    obj === null ? null : readFraction(ctx, obj, 'rules', 'validBallotRate');
  return {
    ...rules,
    overallTurnout: overallTurnout?.canonical ?? {
      numerator: '0',
      denominator: '1',
    },
    validBallotRate: validBallotRate?.text ?? '',
  };
}

function validateBlocks(
  ctx: Context,
  list: readonly unknown[],
  blockIds: Set<string>,
): Block[] {
  return list.map((entry, index) => {
    const path = item('blocks', index);
    const obj = asRecord(ctx, entry, path);
    if (obj === null) {
      return { id: '', name: '', notes: '', color: '' };
    }
    const id = readId(ctx, obj, path, 'id');
    registerId(ctx, id, blockIds, child(path, 'id'));
    return {
      id: id ?? '',
      name: readString(ctx, obj, path, 'name', LIMITS.nameLength),
      notes: readOptionalString(ctx, obj, path, 'notes', LIMITS.notesLength),
      color: readColor(ctx, obj, path, 'color'),
    };
  });
}

function validateParties(
  ctx: Context,
  list: readonly unknown[],
  blockIds: ReadonlySet<string>,
  partyBlocks: Map<string, string | null>,
): Party[] {
  const seen = new Set<string>();
  return list.map((entry, index) => {
    const path = item('parties', index);
    const fallback: Party = {
      id: '',
      name: '',
      notes: '',
      color: '',
      blockId: null,
      tieBreakOrder: 0,
      canJoinGovernment: false,
    };
    const obj = asRecord(ctx, entry, path);
    if (obj === null) {
      return fallback;
    }
    const id = readId(ctx, obj, path, 'id');
    registerId(ctx, id, seen, child(path, 'id'));
    const name = readString(ctx, obj, path, 'name', LIMITS.nameLength);
    const notes = readOptionalString(
      ctx,
      obj,
      path,
      'notes',
      LIMITS.notesLength,
    );
    const color = readColor(ctx, obj, path, 'color');

    let blockId: string | null = null;
    const blockField = readPresent(ctx, obj, path, 'blockId');
    if (blockField.present && blockField.value !== null) {
      const blockPath = child(path, 'blockId');
      blockId = checkId(ctx, blockField.value, blockPath);
      if (blockId !== null && !blockIds.has(blockId)) {
        ctx.report(
          blockPath,
          'dangling-reference',
          `Block "${blockId}" does not exist`,
        );
      }
    }

    const orderField = readPresent(ctx, obj, path, 'tieBreakOrder');
    const tieBreakOrder = orderField.present
      ? checkInteger(
          ctx,
          orderField.value,
          child(path, 'tieBreakOrder'),
          Number.MIN_SAFE_INTEGER,
          Number.MAX_SAFE_INTEGER,
        )
      : null;

    const governmentField = readPresent(ctx, obj, path, 'canJoinGovernment');
    let canJoinGovernment = false;
    if (governmentField.present) {
      if (typeof governmentField.value === 'boolean') {
        canJoinGovernment = governmentField.value;
      } else {
        ctx.report(
          child(path, 'canJoinGovernment'),
          'wrong-type',
          '"canJoinGovernment" must be true or false',
        );
      }
    }

    if (id !== null && !partyBlocks.has(id)) {
      partyBlocks.set(id, blockId);
    }
    return {
      id: id ?? '',
      name,
      notes,
      color,
      blockId,
      tieBreakOrder: tieBreakOrder ?? 0,
      canJoinGovernment,
    };
  });
}

function validateAllowedParties(
  ctx: Context,
  obj: JsonObject,
  path: string,
  partyBlocks: ReadonlyMap<string, string | null>,
): { ids: string[]; complete: boolean } {
  const list = readArray(ctx, obj, path, 'allowedPartyIds');
  const listPath = child(path, 'allowedPartyIds');
  if (list === null) {
    return { ids: [], complete: false };
  }
  if (list.length === 0) {
    ctx.report(
      listPath,
      'empty-destinations',
      'A group needs at least one allowed party',
    );
    return { ids: [], complete: false };
  }
  if (list.length > LIMITS.parties) {
    ctx.report(listPath, 'too-many', 'Too many allowed parties');
    return { ids: [], complete: false };
  }
  const ids: string[] = [];
  let complete = true;
  list.forEach((value, index) => {
    const entryPath = item(listPath, index);
    const id = checkId(ctx, value, entryPath);
    if (id === null) {
      complete = false;
      return;
    }
    if (!partyBlocks.has(id)) {
      ctx.report(
        entryPath,
        'dangling-reference',
        `Party "${id}" does not exist`,
      );
      complete = false;
      return;
    }
    if (ids.includes(id)) {
      ctx.report(
        entryPath,
        'duplicate-reference',
        `Party "${id}" is listed twice`,
      );
      complete = false;
      return;
    }
    ids.push(id);
  });
  return { ids, complete };
}

function validateWeights(
  ctx: Context,
  obj: JsonObject,
  path: string,
  allowed: { ids: string[]; complete: boolean },
): Record<string, string> {
  const weights = readRecord(ctx, obj, path, 'voteWeights');
  const weightsPath = child(path, 'voteWeights');
  if (weights === null) {
    return {};
  }
  const keys = Object.keys(weights);
  if (keys.length > LIMITS.parties) {
    ctx.report(weightsPath, 'too-many', 'Too many vote weights');
    return {};
  }
  const parsed = new Map<string, FractionValue>();
  let complete = allowed.complete;
  for (const key of keys) {
    const keyPath = child(weightsPath, key);
    if (!allowed.ids.includes(key)) {
      ctx.report(
        keyPath,
        'disallowed-destination',
        `Party "${key}" is not an allowed destination for this group`,
      );
      complete = false;
      continue;
    }
    const value = checkFraction(ctx, weights[key], keyPath, UNIT_INTERVAL);
    if (value === null) {
      complete = false;
      continue;
    }
    parsed.set(key, value);
  }
  if (complete) {
    const total = sum([...parsed.values()].map((entry) => entry.value));
    if (!withinTolerance(total)) {
      ctx.report(
        weightsPath,
        'invalid-total',
        'Vote weights must sum to 1 (within 1e-9)',
      );
    }
  }
  return Object.fromEntries(
    allowed.ids.flatMap((id) => {
      const value = parsed.get(id);
      return value === undefined ? [] : [[id, value.text] as const];
    }),
  );
}

function validateGroups(
  ctx: Context,
  list: readonly unknown[],
  partyBlocks: ReadonlyMap<string, string | null>,
): Group[] {
  const seen = new Set<string>();
  const shares: Rational[] = [];
  let sharesComplete = true;
  const groups = list.map((entry, index): Group => {
    const path = item('groups', index);
    const obj = asRecord(ctx, entry, path);
    if (obj === null) {
      sharesComplete = false;
      return {
        id: '',
        name: '',
        notes: '',
        populationShare: '',
        growthRate: '',
        turnout: '',
        turnoutChange: '',
        validBallotRate: '',
        participationFactor: '',
        votingMode: 'open',
        allowedPartyIds: [],
        voteWeights: {},
      };
    }
    const id = readId(ctx, obj, path, 'id');
    registerId(ctx, id, seen, child(path, 'id'));
    const name = readString(ctx, obj, path, 'name', LIMITS.nameLength);
    const notes = readOptionalString(
      ctx,
      obj,
      path,
      'notes',
      LIMITS.notesLength,
    );
    const populationShare = readFraction(ctx, obj, path, 'populationShare');
    if (populationShare === null) {
      sharesComplete = false;
    } else {
      shares.push(populationShare.value);
    }
    const growthRate = readOptionalFraction(ctx, obj, path, 'growthRate');
    const turnout = readFraction(ctx, obj, path, 'turnout');
    const turnoutChange = readOptionalFraction(ctx, obj, path, 'turnoutChange');
    const validBallotRate = readFraction(ctx, obj, path, 'validBallotRate');
    const participationFactor = readFraction(
      ctx,
      obj,
      path,
      'participationFactor',
    );
    const votingMode = readEnum(ctx, obj, path, 'votingMode', [
      'restricted',
      'open',
    ] as const);
    const allowed = validateAllowedParties(ctx, obj, path, partyBlocks);
    if (votingMode === 'restricted' && allowed.complete) {
      const blocks = new Set(
        allowed.ids.map((partyId) => partyBlocks.get(partyId)),
      );
      if (blocks.size > 1) {
        ctx.report(
          child(path, 'allowedPartyIds'),
          'restricted-mixed-blocks',
          'A restricted group may only vote for parties of one block',
        );
      }
    }
    const voteWeights = validateWeights(ctx, obj, path, allowed);
    return {
      id: id ?? '',
      name,
      notes,
      populationShare: populationShare?.text ?? '',
      growthRate,
      turnout: turnout?.text ?? '',
      turnoutChange,
      validBallotRate: validBallotRate?.text ?? '',
      participationFactor: participationFactor?.text ?? '',
      votingMode: votingMode ?? 'open',
      allowedPartyIds: allowed.ids,
      voteWeights,
    };
  });
  if (sharesComplete && !withinTolerance(sum(shares))) {
    ctx.report(
      'groups',
      'invalid-total',
      'Population shares must sum to 1 (within 1e-9)',
    );
  }
  return groups;
}

function exactDigits(
  ctx: Context,
  value: unknown,
  path: string,
): string | null {
  if (typeof value !== 'string') {
    ctx.report(path, 'wrong-type', 'Exact fraction components must be strings');
    return null;
  }
  if (!/^[0-9]+$/.test(value)) {
    ctx.report(
      path,
      'invalid-decimal',
      'Exact fraction components use digits only',
    );
    return null;
  }
  if (value.length > MAX_EXACT_INTEGER_DIGITS) {
    ctx.report(
      path,
      'too-long',
      `Exact fraction components are limited to ${MAX_EXACT_INTEGER_DIGITS} digits`,
    );
    return null;
  }
  return value;
}

function readExactFraction(
  ctx: Context,
  value: unknown,
  path: string,
): ExactFractionValue | null {
  const obj = asRecord(ctx, value, path);
  if (obj === null) {
    return null;
  }
  const numeratorField = readPresent(ctx, obj, path, 'numerator');
  const denominatorField = readPresent(ctx, obj, path, 'denominator');
  const numerator = numeratorField.present
    ? exactDigits(ctx, numeratorField.value, child(path, 'numerator'))
    : null;
  const denominator = denominatorField.present
    ? exactDigits(ctx, denominatorField.value, child(path, 'denominator'))
    : null;
  if (numerator === null || denominator === null) {
    return null;
  }
  if (/^0+$/.test(denominator)) {
    ctx.report(
      child(path, 'denominator'),
      'out-of-range',
      'Exact fraction denominator must be positive',
    );
    return null;
  }

  const fraction = rational(BigInt(numerator), BigInt(denominator));
  if (compare(fraction, ZERO) < 0 || compare(fraction, ONE) > 0) {
    ctx.report(path, 'out-of-range', 'Exact fraction must be in [0, 1]');
    return null;
  }
  return {
    canonical: {
      numerator: fraction.num.toString(),
      denominator: fraction.den.toString(),
    },
    value: fraction,
  };
}

function checkPartyDenominatorBudget(
  ctx: Context,
  list: readonly unknown[],
  rules: unknown,
  groups: readonly unknown[],
  linkedModel: unknown,
): boolean {
  const denominators = new Set<string>();
  let totalDigits = 0;
  let valid = true;
  const visit = (value: unknown, path: string) => {
    if (!isRecord(value)) {
      return;
    }
    const numerator = value.numerator;
    const denominator = value.denominator;
    for (const [component, candidate] of [
      ['numerator', numerator],
      ['denominator', denominator],
    ] as const) {
      if (
        typeof candidate === 'string' &&
        /^[0-9]+$/.test(candidate) &&
        candidate.length > MAX_EXACT_INTEGER_DIGITS
      ) {
        ctx.report(
          child(path, component),
          'too-long',
          `Exact fraction components are limited to ${MAX_EXACT_INTEGER_DIGITS} digits`,
        );
        valid = false;
      }
    }
    if (
      typeof denominator !== 'string' ||
      !/^[0-9]+$/.test(denominator) ||
      denominator.length > MAX_EXACT_INTEGER_DIGITS ||
      /^0+$/.test(denominator)
    ) {
      return;
    }
    const canonical = denominator.replace(/^0+/, '');
    if (!denominators.has(canonical)) {
      denominators.add(canonical);
      totalDigits += canonical.length;
      if (totalDigits > MAX_PARTY_DENOMINATOR_DIGITS) {
        ctx.report(
          child(path, 'denominator'),
          'too-long',
          `Distinct party-mode denominators are limited to ${MAX_PARTY_DENOMINATOR_DIGITS} digits in total`,
        );
        valid = false;
      }
    }
  };

  for (const [index, entry] of list.entries()) {
    if (!isRecord(entry)) {
      continue;
    }
    visit(entry.voteShare, item('parties', index) + '.voteShare');
    if (isRecord(entry.composition)) {
      for (const [groupId, fraction] of Object.entries(entry.composition)) {
        visit(fraction, `${item('parties', index)}.composition.${groupId}`);
      }
    }
  }
  if (isRecord(rules)) {
    visit(rules.overallTurnout, 'rules.overallTurnout');
  }
  for (const [index, group] of groups.entries()) {
    if (isRecord(group)) {
      visit(group.turnout, `${item('groups', index)}.turnout`);
    }
  }
  if (isRecord(linkedModel) && isRecord(linkedModel.groups)) {
    for (const [groupId, group] of Object.entries(linkedModel.groups)) {
      if (!isRecord(group)) continue;
      const path = `linkedModel.groups.${groupId}`;
      visit(group.populationShare, `${path}.populationShare`);
      visit(group.lastNonzeroTurnout, `${path}.lastNonzeroTurnout`);
      if (isRecord(group.preferences)) {
        for (const [partyId, value] of Object.entries(group.preferences)) {
          visit(value, `${path}.preferences.${partyId}`);
        }
      }
    }
  }
  return valid;
}

function validatePartyGroups(
  ctx: Context,
  list: readonly unknown[],
  version: number,
): PartyGroup[] {
  const seen = new Set<string>();
  return list.map((entry, index) => {
    const path = item('groups', index);
    const obj = asRecord(ctx, entry, path);
    if (obj === null) {
      return {
        id: '',
        name: '',
        notes: '',
        growthRate: '',
        turnout: { numerator: '0', denominator: '1' },
        turnoutChange: '',
      };
    }
    const id = readId(ctx, obj, path, 'id');
    registerId(ctx, id, seen, child(path, 'id'));
    const turnoutField = readPresent(ctx, obj, path, 'turnout');
    let turnout: ExactFractionValue | null = null;
    if (turnoutField.present && version < 5) {
      const legacy = checkFraction(
        ctx,
        turnoutField.value,
        child(path, 'turnout'),
        UNIT_INTERVAL,
      );
      if (legacy !== null) {
        turnout = {
          value: legacy.value,
          canonical: {
            numerator: legacy.value.num.toString(),
            denominator: legacy.value.den.toString(),
          },
        };
      }
    } else if (turnoutField.present) {
      turnout = readExactFraction(
        ctx,
        turnoutField.value,
        child(path, 'turnout'),
      );
    }
    return {
      id: id ?? '',
      name: readString(ctx, obj, path, 'name', LIMITS.nameLength),
      notes: readOptionalString(ctx, obj, path, 'notes', LIMITS.notesLength),
      growthRate: readOptionalFraction(ctx, obj, path, 'growthRate'),
      turnout: turnout?.canonical ?? { numerator: '0', denominator: '1' },
      turnoutChange: readOptionalFraction(ctx, obj, path, 'turnoutChange'),
    };
  });
}

function validatePartyModeParties(
  ctx: Context,
  list: readonly unknown[],
  parties: readonly Party[],
  groupIds: ReadonlySet<string>,
): PartyModeParty[] {
  let sharesComplete = true;
  const shares: Rational[] = [];
  const validated = parties.map((party, index) => {
    const entry = list[index];
    if (!isRecord(entry)) {
      sharesComplete = false;
      return {
        ...party,
        voteShare: { numerator: '0', denominator: '1' },
        composition: null,
      };
    }
    const path = item('parties', index);
    const shareField = readPresent(ctx, entry, path, 'voteShare');
    const share = shareField.present
      ? readExactFraction(ctx, shareField.value, child(path, 'voteShare'))
      : null;
    if (share === null) {
      sharesComplete = false;
    } else {
      shares.push(share.value);
    }

    const compositionField = readPresent(ctx, entry, path, 'composition');
    let composition: Readonly<Record<string, ExactFraction>> | null = null;
    if (compositionField.present && compositionField.value !== null) {
      if (!isRecord(compositionField.value)) {
        ctx.report(
          child(path, 'composition'),
          'wrong-type',
          'Composition must be a group map or null',
        );
      } else {
        const values: [string, ExactFraction][] = [];
        const rowShares: Rational[] = [];
        let rowComplete = true;
        for (const groupId of groupIds) {
          if (!Object.hasOwn(compositionField.value, groupId)) {
            ctx.report(
              child(child(path, 'composition'), groupId),
              'missing-field',
              `Composition is missing group "${groupId}"`,
            );
            rowComplete = false;
          }
        }
        for (const [groupId, value] of Object.entries(compositionField.value)) {
          const valuePath = child(child(path, 'composition'), groupId);
          if (!groupIds.has(groupId)) {
            ctx.report(
              valuePath,
              'dangling-reference',
              `Group "${groupId}" does not exist`,
            );
            rowComplete = false;
            continue;
          }
          const parsed = readExactFraction(ctx, value, valuePath);
          if (parsed === null) {
            rowComplete = false;
          } else {
            values.push([groupId, parsed.canonical]);
            rowShares.push(parsed.value);
          }
        }
        if (
          rowComplete &&
          (values.length !== groupIds.size ||
            compare(sum(rowShares), ONE) !== 0)
        ) {
          ctx.report(
            child(path, 'composition'),
            'invalid-total',
            'Known party composition must include every group and sum exactly to 1',
          );
          rowComplete = false;
        }
        if (rowComplete) {
          composition = Object.fromEntries(values);
        }
      }
    } else if (compositionField.present) {
      composition = null;
    }
    if (!compositionField.present) {
      ctx.report(
        child(path, 'composition'),
        'missing-field',
        'Field "composition" is required',
      );
    }
    return {
      ...party,
      voteShare: share?.canonical ?? { numerator: '0', denominator: '1' },
      composition,
    };
  });
  if (sharesComplete && compare(sum(shares), ONE) !== 0) {
    ctx.report(
      'parties',
      'invalid-total',
      'Party vote shares must sum exactly to 1',
    );
  }
  return validated;
}

function exactValue(value: ExactFraction): Rational {
  return rational(BigInt(value.numerator), BigInt(value.denominator));
}

function validateLinkedModel(
  ctx: Context,
  value: unknown,
  groups: readonly PartyGroup[],
  parties: readonly PartyModeParty[],
  rules: PartyModeRules,
): LinkedModel | undefined {
  if (value === undefined || value === null) return undefined;
  const path = 'linkedModel';
  const start = ctx.issues.length;
  const obj = asRecord(ctx, value, path);
  if (obj === null) return undefined;
  const state = readEnum(ctx, obj, path, 'state', [
    'current',
    'suspended',
  ] as const);
  const entries = readRecord(ctx, obj, path, 'groups');
  if (entries === null || state === null) return undefined;
  const groupIds = new Set(groups.map((group) => group.id));
  const partyIds = new Set(parties.map((party) => party.id));
  const parsed: [string, LinkedGroup][] = [];
  for (const [groupId, entry] of Object.entries(entries)) {
    const rowPath = `${path}.groups.${groupId}`;
    if (!groupIds.has(groupId)) {
      ctx.report(
        rowPath,
        'dangling-reference',
        `Group "${groupId}" does not exist`,
      );
      continue;
    }
    const row = asRecord(ctx, entry, rowPath);
    if (row === null) continue;
    const populationField = readPresent(ctx, row, rowPath, 'populationShare');
    const lastField = readPresent(ctx, row, rowPath, 'lastNonzeroTurnout');
    const population = populationField.present
      ? readExactFraction(
          ctx,
          populationField.value,
          `${rowPath}.populationShare`,
        )
      : null;
    const last = lastField.present
      ? readExactFraction(ctx, lastField.value, `${rowPath}.lastNonzeroTurnout`)
      : null;
    const preferenceMap = readRecord(ctx, row, rowPath, 'preferences');
    const allowed = readArray(ctx, row, rowPath, 'allowedPartyIds');
    const preferences: [string, ExactFraction][] = [];
    if (preferenceMap !== null) {
      for (const [partyId, fraction] of Object.entries(preferenceMap)) {
        const preferencePath = `${rowPath}.preferences.${partyId}`;
        if (!partyIds.has(partyId)) {
          ctx.report(
            preferencePath,
            'dangling-reference',
            `Party "${partyId}" does not exist`,
          );
          continue;
        }
        const parsedFraction = readExactFraction(ctx, fraction, preferencePath);
        if (parsedFraction !== null)
          preferences.push([partyId, parsedFraction.canonical]);
      }
      if (state === 'current') {
        for (const partyId of partyIds) {
          if (!Object.hasOwn(preferenceMap, partyId)) {
            ctx.report(
              `${rowPath}.preferences.${partyId}`,
              'missing-field',
              `Preference for party "${partyId}" is required`,
            );
          }
        }
      }
      const total = sum(
        preferences.map(([, fraction]) => exactValue(fraction)),
      );
      if (
        population !== null &&
        compare(total, ONE) !== 0 &&
        !(isZero(population.value) && isZero(total))
      ) {
        ctx.report(
          `${rowPath}.preferences`,
          'invalid-total',
          'Linked preferences must sum to 1 for a populated group',
        );
      }
    }
    const allowedIds: string[] = [];
    for (const [index, rawId] of (allowed ?? []).entries()) {
      const idPath = `${rowPath}.allowedPartyIds[${index}]`;
      const id = checkId(ctx, rawId, idPath);
      if (id === null) continue;
      if (!partyIds.has(id)) {
        ctx.report(
          idPath,
          'dangling-reference',
          `Party "${id}" does not exist`,
        );
      } else if (allowedIds.includes(id)) {
        ctx.report(
          idPath,
          'duplicate-reference',
          `Party "${id}" is listed twice`,
        );
      } else {
        allowedIds.push(id);
      }
    }
    if (
      population !== null &&
      last !== null &&
      preferenceMap !== null &&
      allowed !== null
    ) {
      parsed.push([
        groupId,
        {
          populationShare: population.canonical,
          preferences: Object.fromEntries(preferences),
          allowedPartyIds: allowedIds,
          lastNonzeroTurnout: last.canonical,
        },
      ]);
    }
  }
  if (state === 'current') {
    for (const groupId of groupIds) {
      if (!Object.hasOwn(entries, groupId)) {
        ctx.report(
          `${path}.groups.${groupId}`,
          'missing-field',
          `Group "${groupId}" is required`,
        );
      }
    }
  }
  if (
    compare(
      sum(parsed.map(([, row]) => exactValue(row.populationShare))),
      ONE,
    ) !== 0
  ) {
    ctx.report(
      `${path}.groups`,
      'invalid-total',
      'Linked population shares must sum to 1',
    );
  }
  const model: LinkedModel = { state, groups: Object.fromEntries(parsed) };
  if (start !== 0 || ctx.issues.length !== start || state !== 'current')
    return model;

  const currentBallots = groups.map((group) => {
    const row = model.groups[group.id]!;
    return mul(exactValue(row.populationShare), exactValue(group.turnout));
  });
  const currentTurnout = sum(currentBallots);
  if (compare(currentTurnout, exactValue(rules.overallTurnout)) !== 0) {
    ctx.report(
      path,
      'invalid-total',
      'Linked group turnout contradicts overall turnout',
    );
    return model;
  }
  const groupBallots = isZero(currentTurnout)
    ? groups.map((group) => {
        const row = model.groups[group.id]!;
        return mul(
          exactValue(row.populationShare),
          exactValue(row.lastNonzeroTurnout),
        );
      })
    : currentBallots;
  const turnout = sum(groupBallots);
  if (isZero(turnout)) {
    ctx.report(
      path,
      'invalid-total',
      'A linked model needs a nonzero saved turnout profile',
    );
    return model;
  }
  for (const party of parties) {
    const contributions = groups.map((group, index) =>
      mul(
        groupBallots[index]!,
        exactValue(model.groups[group.id]!.preferences[party.id]!),
      ),
    );
    const total = sum(contributions);
    if (compare(div(total, turnout), exactValue(party.voteShare)) !== 0) {
      ctx.report(
        path,
        'invalid-total',
        `Linked votes contradict party "${party.id}"`,
      );
      continue;
    }
    if (!isZero(total)) {
      if (party.composition === null) {
        ctx.report(
          path,
          'invalid-total',
          `Linked party "${party.id}" has unknown composition`,
        );
        continue;
      }
      for (const [index, group] of groups.entries()) {
        if (
          compare(
            div(contributions[index]!, total),
            exactValue(party.composition[group.id]!),
          ) !== 0
        ) {
          ctx.report(
            path,
            'invalid-total',
            `Linked composition contradicts party "${party.id}"`,
          );
          break;
        }
      }
    }
  }
  return model;
}

function validatePairs(
  ctx: Context,
  list: readonly unknown[],
  path: string,
  known: { has(id: string): boolean },
  kind: string,
  directed = false,
): { pairs: IdPair[]; keys: string[]; indices: number[] } {
  const pairs: IdPair[] = [];
  const keys: string[] = [];
  const indices: number[] = [];
  list.forEach((entry, index) => {
    const entryPath = item(path, index);
    if (
      !Array.isArray(entry) ||
      entry.length !== 2 ||
      typeof entry[0] !== 'string' ||
      typeof entry[1] !== 'string' ||
      entry[0] === entry[1]
    ) {
      ctx.report(
        entryPath,
        'invalid-pair',
        `A pair must list two different ${kind} identifiers`,
      );
      return;
    }
    const first: string = entry[0];
    const second: string = entry[1];
    const missing = [first, second].find((id) => !known.has(id));
    if (missing !== undefined) {
      ctx.report(
        entryPath,
        'dangling-reference',
        `${kind} "${missing}" does not exist`,
      );
      return;
    }
    const key = directed ? `${first}|${second}` : pairKey(first, second);
    if (keys.includes(key)) {
      ctx.report(entryPath, 'duplicate-pair', 'This pair is listed twice');
      return;
    }
    keys.push(key);
    indices.push(index);
    pairs.push([first, second]);
  });
  return { pairs, keys, indices };
}

function validateCoalitionRules(
  ctx: Context,
  obj: JsonObject | null,
  lists: Record<PairField, unknown[] | null>,
  partyIds: { has(id: string): boolean },
  blockIds: ReadonlySet<string>,
): CoalitionRules {
  const path = 'coalitionRules';
  if (obj === null) {
    return {
      incompatiblePartyPairs: [],
      incompatibleBlockPairs: [],
      compatiblePartyOverrides: [],
      partyRefusals: [],
    };
  }
  const parties = validatePairs(
    ctx,
    lists.incompatiblePartyPairs ?? [],
    child(path, 'incompatiblePartyPairs'),
    partyIds,
    'Party',
  );
  const blocks = validatePairs(
    ctx,
    lists.incompatibleBlockPairs ?? [],
    child(path, 'incompatibleBlockPairs'),
    blockIds,
    'Block',
  );
  const overridesPath = child(path, 'compatiblePartyOverrides');
  const overrides = validatePairs(
    ctx,
    lists.compatiblePartyOverrides ?? [],
    overridesPath,
    partyIds,
    'Party',
  );
  const refusals = validatePairs(
    ctx,
    lists.partyRefusals ?? [],
    child(path, 'partyRefusals'),
    partyIds,
    'Party',
    true,
  );
  const refused = new Set(refusals.pairs.map(([a, b]) => pairKey(a, b)));
  overrides.keys.forEach((key, position) => {
    if (parties.keys.includes(key) || refused.has(key)) {
      ctx.report(
        item(overridesPath, overrides.indices[position] ?? position),
        'conflicting-pair',
        'A pair cannot be both forbidden by a party rule and a compatible override',
      );
    }
  });
  return {
    incompatiblePartyPairs: parties.pairs,
    incompatibleBlockPairs: blocks.pairs,
    compatiblePartyOverrides: overrides.pairs,
    partyRefusals: refusals.pairs,
  };
}

export function validateScenario(input: unknown): ValidationResult {
  const ctx = new Context();
  if (!isRecord(input)) {
    ctx.report('', 'not-an-object', 'A scenario must be a JSON object');
    return { ok: false, issues: ctx.issues };
  }
  if (!validateVersion(ctx, input)) {
    return { ok: false, issues: ctx.issues };
  }
  const version = input.schemaVersion as number;
  const inputMode =
    version >= 4
      ? readEnum(ctx, input, '', 'inputMode', ['groups', 'parties'] as const)
      : 'groups';
  if (inputMode === null) {
    return { ok: false, issues: ctx.issues };
  }

  const groupList = readArray(ctx, input, '', 'groups');
  const partyList = readArray(ctx, input, '', 'parties');
  const blockList = readArray(ctx, input, '', 'blocks');
  const coalitionObj = readRecord(ctx, input, '', 'coalitionRules');
  const pairLists: Record<PairField, unknown[] | null> = {
    incompatiblePartyPairs: null,
    incompatibleBlockPairs: null,
    compatiblePartyOverrides: null,
    partyRefusals: null,
  };
  if (coalitionObj !== null) {
    for (const field of PAIR_FIELDS) {
      pairLists[field] = readArray(ctx, coalitionObj, 'coalitionRules', field);
    }
    // Optional in every version: files written before version 3 lack it.
    if (Object.hasOwn(coalitionObj, 'partyRefusals')) {
      pairLists.partyRefusals = readArray(
        ctx,
        coalitionObj,
        'coalitionRules',
        'partyRefusals',
      );
    }
  }

  const countIssues = ctx.issues.length;
  checkCount(ctx, groupList, 'groups', LIMITS.groups);
  checkCount(ctx, partyList, 'parties', LIMITS.parties);
  checkCount(ctx, blockList, 'blocks', LIMITS.blocks);
  for (const field of [...PAIR_FIELDS, 'partyRefusals'] as const) {
    checkCount(ctx, pairLists[field], `coalitionRules.${field}`, LIMITS.pairs);
  }
  if (ctx.issues.length > countIssues) {
    return { ok: false, issues: ctx.issues };
  }
  if (
    inputMode === 'parties' &&
    !checkPartyDenominatorBudget(
      ctx,
      partyList ?? [],
      input.rules,
      groupList ?? [],
      version >= 5 ? input.linkedModel : undefined,
    )
  ) {
    return { ok: false, issues: ctx.issues };
  }

  const id = readId(ctx, input, '', 'id');
  const name = readString(ctx, input, '', 'name', LIMITS.nameLength);
  const notes = readString(ctx, input, '', 'notes', LIMITS.notesLength);
  const rules =
    inputMode === 'parties'
      ? validatePartyRules(ctx, input)
      : validateRules(ctx, input);

  const blockIds = new Set<string>();
  const blocks = validateBlocks(ctx, blockList ?? [], blockIds);
  const partyBlocks = new Map<string, string | null>();
  const baseParties = validateParties(
    ctx,
    partyList ?? [],
    blockIds,
    partyBlocks,
  );
  const groups =
    inputMode === 'parties'
      ? validatePartyGroups(ctx, groupList ?? [], version)
      : validateGroups(ctx, groupList ?? [], partyBlocks);
  const parties =
    inputMode === 'parties'
      ? validatePartyModeParties(
          ctx,
          partyList ?? [],
          baseParties,
          new Set(groups.map((group) => group.id)),
        )
      : baseParties;
  const coalitionRules = validateCoalitionRules(
    ctx,
    coalitionObj,
    pairLists,
    partyBlocks,
    blockIds,
  );
  const linkedModel =
    inputMode === 'parties' && version >= 5
      ? validateLinkedModel(
          ctx,
          input.linkedModel,
          groups as PartyGroup[],
          parties as PartyModeParty[],
          rules as PartyModeRules,
        )
      : undefined;

  if (ctx.issues.length > 0) {
    return { ok: false, issues: ctx.issues };
  }
  // Fraction reduction can increase the number of distinct denominators.
  if (
    inputMode === 'parties' &&
    !checkPartyDenominatorBudget(ctx, parties, rules, groups, linkedModel)
  ) {
    return { ok: false, issues: ctx.issues };
  }
  const common = {
    schemaVersion: SCHEMA_VERSION as typeof SCHEMA_VERSION,
    id: id ?? '',
    name,
    notes,
  };
  if (inputMode === 'parties') {
    return {
      ok: true,
      scenario: {
        ...common,
        inputMode,
        rules: rules as PartyModeRules,
        groups: groups as PartyGroup[],
        parties: parties as PartyModeParty[],
        ...(linkedModel === undefined ? {} : { linkedModel }),
        blocks,
        coalitionRules,
      },
    };
  }
  return {
    ok: true,
    scenario: {
      ...common,
      inputMode,
      rules,
      groups: groups as Group[],
      parties: parties as Party[],
      blocks,
      coalitionRules,
    },
  };
}

/**
 * Prints a validated scenario as the exchange file: the validator's field
 * order, two-space indentation and a trailing newline.
 */
export function serializeScenario(scenario: Scenario): string {
  const checked = validateScenario(scenario);
  if (!checked.ok) {
    throw new Error('Only a valid scenario can be serialised');
  }
  return `${JSON.stringify(checked.scenario, null, 2)}\n`;
}

export function parseScenarioJson(text: string): ValidationResult {
  if (new TextEncoder().encode(text).length > LIMITS.jsonBytes) {
    return {
      ok: false,
      issues: [
        {
          path: '',
          code: 'too-large',
          message: `Scenario JSON exceeds ${LIMITS.jsonBytes} bytes`,
        },
      ],
    };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(text) as unknown;
  } catch {
    return {
      ok: false,
      issues: [
        { path: '', code: 'invalid-json', message: 'Text is not valid JSON' },
      ],
    };
  }
  return validateScenario(parsed);
}
