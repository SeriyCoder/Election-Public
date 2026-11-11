import { parseCount, percentToFraction, rebalance } from './numeric';
import {
  add,
  equals,
  isNegative,
  isZero,
  lessThanOrEqual,
  parseDecimal,
  rational,
  RationalError,
  toDecimalString,
} from './rational';
import { LIMITS, SCHEMA_VERSION } from './schema';

export type EntityKind = 'group' | 'party' | 'block';

export type DraftEntity = Readonly<Record<string, unknown>> & {
  readonly id: string;
};

export interface Draft extends Readonly<Record<string, unknown>> {
  readonly groups: readonly DraftEntity[];
  readonly parties: readonly DraftEntity[];
  readonly blocks: readonly DraftEntity[];
  readonly coalitionRules: Readonly<Record<string, unknown>>;
}

export type EditErrorCode =
  | 'unknown-entity'
  | 'repair-required'
  | 'invalid-repair'
  | 'invalid-weight'
  | 'invalid-pair'
  | 'invalid-turnout'
  | 'party-mode-unsupported'
  | 'party-share-in-use'
  | 'group-composition-in-use'
  | 'group-population-in-use'
  | 'group-preference-in-use'
  | 'party-preference-in-use'
  | 'limit-reached';

export class EditError extends Error {
  readonly code: EditErrorCode;

  constructor(code: EditErrorCode, message: string) {
    super(message);
    this.name = 'EditError';
    this.code = code;
  }
}

export const ID_PREFIX: Readonly<Record<EntityKind, string>> = {
  group: 'G',
  party: 'P',
  block: 'B',
};

/**
 * Section 6.1: the valid-ballot rate of every new group, preset and
 * questionnaire build — 0.1% of ballots are assumed invalid everywhere.
 */
export const STANDARD_VALID_BALLOT_RATE = '0.999';

const STANDARD_VALIDITY = rational(999n, 1000n);

function isPartyMode(draft: Draft): boolean {
  return draft.inputMode === 'parties';
}

function requireGroupMode(draft: Draft, operation: string): void {
  if (isPartyMode(draft)) {
    throw new EditError(
      'party-mode-unsupported',
      `${operation} is unavailable in party mode`,
    );
  }
}

/** Whether a stored rate is exactly 99.9%, compared as an exact rational. */
export function isStandardValidity(value: unknown): boolean {
  if (typeof value !== 'string') {
    return false;
  }
  try {
    return equals(parseDecimal(value), STANDARD_VALIDITY);
  } catch (error) {
    if (error instanceof RationalError) {
      return false;
    }
    throw error;
  }
}

/** Distinguishable defaults for new parties and blocks. */
export const PALETTE: readonly string[] = [
  '#1f77b4',
  '#d62728',
  '#2ca02c',
  '#9467bd',
  '#ff7f0e',
  '#8c564b',
  '#e377c2',
  '#7f7f7f',
  '#bcbd22',
  '#17becf',
];

export interface Reference {
  readonly kind:
    | 'group'
    | 'party'
    | 'pair'
    | 'composition'
    | 'share'
    | 'model-population'
    | 'model-group-preference'
    | 'model-preference';
  readonly id: string | null;
  readonly path: string;
}

export type RepairMode = 'reassign' | 'remove' | 'unassign';

export type Repair =
  | { readonly mode: 'remove' }
  | { readonly mode: 'unassign' }
  | { readonly mode: 'reassign'; readonly targetId: string };

type Json = Readonly<Record<string, unknown>>;

const LIST_KEY = {
  group: 'groups',
  party: 'parties',
  block: 'blocks',
} as const satisfies Record<EntityKind, keyof Draft>;

const LIMIT: Readonly<Record<EntityKind, number>> = {
  group: LIMITS.groups,
  party: LIMITS.parties,
  block: LIMITS.blocks,
};

const PARTY_PAIR_LISTS = [
  'incompatiblePartyPairs',
  'compatiblePartyOverrides',
  'partyRefusals',
] as const;
const BLOCK_PAIR_LISTS = ['incompatibleBlockPairs'] as const;

const REPAIRS: Readonly<Record<EntityKind, readonly RepairMode[]>> = {
  group: [],
  party: ['reassign', 'remove'],
  block: ['reassign', 'unassign'],
};

function isObject(value: unknown): value is Json {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isEntityList(value: unknown): value is readonly DraftEntity[] {
  return (
    Array.isArray(value) &&
    value.every((item) => isObject(item) && typeof item.id === 'string')
  );
}

export function isDraft(input: unknown): input is Draft {
  return (
    isObject(input) &&
    isEntityList(input.groups) &&
    isEntityList(input.parties) &&
    isEntityList(input.blocks) &&
    isObject(input.coalitionRules)
  );
}

export function entities(
  draft: Draft,
  kind: EntityKind,
): readonly DraftEntity[] {
  return draft[LIST_KEY[kind]];
}

function withList(
  draft: Draft,
  kind: EntityKind,
  list: readonly DraftEntity[],
): Draft {
  return { ...draft, [LIST_KEY[kind]]: list };
}

function indexOf(draft: Draft, kind: EntityKind, id: string): number {
  const index = entities(draft, kind).findIndex((entity) => entity.id === id);
  if (index < 0) {
    throw new EditError('unknown-entity', `No ${kind} with ID ${id}`);
  }
  return index;
}

function updateEntity(
  draft: Draft,
  kind: EntityKind,
  id: string,
  fields: Json,
): Draft {
  const index = indexOf(draft, kind, id);
  return withList(
    draft,
    kind,
    entities(draft, kind).map((entity, position) =>
      position === index ? { ...entity, ...fields } : entity,
    ),
  );
}

function digitsValue(digits: string): number {
  let value = 0;
  for (const digit of digits) {
    value = value * 10 + (digit.charCodeAt(0) - 48);
  }
  return value;
}

/**
 * One above the largest `<prefix><digits>` ID in any entity list. Numbers
 * beyond 15 digits are ignored: they cannot collide with the generated ID.
 */
export function nextIdIndex(draft: Draft, kind: EntityKind): number {
  const pattern = new RegExp(`^${ID_PREFIX[kind]}([1-9][0-9]{0,14})$`);
  let largest = 0;
  for (const list of [draft.groups, draft.parties, draft.blocks]) {
    for (const entity of list) {
      const match = pattern.exec(entity.id);
      const value = match === null ? 0 : digitsValue(match[1] ?? '');
      largest = value > largest ? value : largest;
    }
  }
  return largest + 1;
}

function nextId(draft: Draft, kind: EntityKind): string {
  return `${ID_PREFIX[kind]}${nextIdIndex(draft, kind)}`;
}

function checkLimit(draft: Draft, kind: EntityKind): void {
  if (entities(draft, kind).length >= LIMIT[kind]) {
    throw new EditError(
      'limit-reached',
      `At most ${LIMIT[kind]} entities of kind ${kind} are allowed`,
    );
  }
}

function nextTieBreakOrder(draft: Draft): number {
  let largest = 0;
  for (const party of draft.parties) {
    const order = party.tieBreakOrder;
    if (typeof order === 'number' && Number.isSafeInteger(order)) {
      largest = order > largest ? order : largest;
    }
  }
  return largest + 1;
}

function freeColor(draft: Draft, kind: EntityKind): string {
  const used = new Set(entities(draft, kind).map((entity) => entity.color));
  const free = PALETTE.find((color) => !used.has(color));
  return free ?? PALETTE[entities(draft, kind).length % PALETTE.length]!;
}

function newEntity(draft: Draft, kind: EntityKind, name: string): DraftEntity {
  const id = nextId(draft, kind);
  switch (kind) {
    case 'group':
      if (isPartyMode(draft)) {
        return {
          id,
          name,
          notes: '',
          growthRate: '0',
          turnout:
            draft.schemaVersion === SCHEMA_VERSION
              ? { numerator: '1', denominator: '1' }
              : '1',
          turnoutChange: '0',
        };
      }
      return {
        id,
        name,
        notes: '',
        populationShare: '0',
        growthRate: '0',
        turnout: '1',
        turnoutChange: '0',
        validBallotRate: STANDARD_VALID_BALLOT_RATE,
        participationFactor: '1',
        votingMode: 'open',
        allowedPartyIds: [],
        voteWeights: {},
      };
    case 'party':
      return {
        id,
        name,
        notes: '',
        color: freeColor(draft, kind),
        blockId: null,
        tieBreakOrder: nextTieBreakOrder(draft),
        canJoinGovernment: true,
        ...(isPartyMode(draft)
          ? {
              voteShare: { numerator: '0', denominator: '1' },
              composition: null,
            }
          : {}),
      };
    case 'block':
      return { id, name, notes: '', color: freeColor(draft, kind) };
  }
}

export function addEntity(draft: Draft, kind: EntityKind, name: string): Draft {
  checkLimit(draft, kind);
  const added = newEntity(draft, kind, name);
  const next = withList(draft, kind, [...entities(draft, kind), added]);
  return addPartyModeEntity(draft, next, kind, added.id);
}

export function duplicateEntity(
  draft: Draft,
  kind: EntityKind,
  id: string,
  name: string,
): Draft {
  const index = indexOf(draft, kind, id);
  checkLimit(draft, kind);
  const source = entities(draft, kind)[index]!;
  const partyModeGroup =
    kind === 'group' && isPartyMode(draft)
      ? {
          growthRate: source.growthRate,
          turnout: source.turnout,
          turnoutChange: source.turnoutChange,
        }
      : {};
  const copy: DraftEntity = {
    ...(kind === 'group' && isPartyMode(draft)
      ? {
          id: nextId(draft, kind),
          name,
          notes: source.notes,
          ...partyModeGroup,
        }
      : {
          ...structuredClone(source),
          id: nextId(draft, kind),
          name,
          ...(kind === 'group' ? { populationShare: '0' } : {}),
        }),
    ...(kind === 'party'
      ? {
          tieBreakOrder: nextTieBreakOrder(draft),
          ...(isPartyMode(draft)
            ? {
                voteShare: { numerator: '0', denominator: '1' },
                composition: null,
              }
            : {}),
        }
      : {}),
  };
  const list = [...entities(draft, kind)];
  list.splice(index + 1, 0, copy);
  const next = withList(draft, kind, list);
  return addPartyModeEntity(draft, next, kind, copy.id);
}

function addPartyModeEntity(
  before: Draft,
  draft: Draft,
  kind: EntityKind,
  id: string,
): Draft {
  if (!isPartyMode(before) || kind === 'block') return draft;
  const model = before.linkedModel;
  if (kind === 'group') {
    const updated = addGroupToCompositions(draft, id);
    return isObject(model)
      ? { ...updated, linkedModel: { ...model, state: 'suspended' } }
      : updated;
  }
  if (!isObject(model) || !isObject(model.groups)) return draft;
  const groups = Object.fromEntries(
    Object.entries(model.groups).map(([groupId, value]) => {
      if (!isObject(value) || !isObject(value.preferences)) {
        return [groupId, value];
      }
      const allowed = value.allowedPartyIds;
      const allPreviouslyAllowed =
        Array.isArray(allowed) &&
        before.parties.every((party) => allowed.includes(party.id));
      return [
        groupId,
        {
          ...value,
          preferences: {
            ...value.preferences,
            [id]: { numerator: '0', denominator: '1' },
          },
          allowedPartyIds:
            allPreviouslyAllowed && Array.isArray(allowed)
              ? [...allowed, id]
              : allowed,
        },
      ];
    }),
  );
  return { ...draft, linkedModel: { ...model, groups } };
}

function addGroupToCompositions(draft: Draft, groupId: string): Draft {
  return {
    ...draft,
    parties: draft.parties.map((party) => {
      const composition = compositionOf(party);
      if (composition === null || Object.hasOwn(composition, groupId)) {
        return party;
      }
      return {
        ...party,
        composition: {
          ...composition,
          [groupId]: { numerator: '0', denominator: '1' },
        },
      };
    }),
  };
}

export function renameEntity(
  draft: Draft,
  kind: EntityKind,
  id: string,
  name: string,
): Draft {
  return updateEntity(draft, kind, id, { name });
}

export function setEntityNotes(
  draft: Draft,
  kind: EntityKind,
  id: string,
  notes: string,
): Draft {
  return updateEntity(draft, kind, id, { notes });
}

export function recolorEntity(
  draft: Draft,
  kind: 'party' | 'block',
  id: string,
  color: string,
): Draft {
  return updateEntity(draft, kind, id, { color });
}

export function setPartyBlock(
  draft: Draft,
  partyId: string,
  blockId: string | null,
): Draft {
  return updateEntity(draft, 'party', partyId, { blockId });
}

export function setPartyEligibility(
  draft: Draft,
  partyId: string,
  eligible: boolean,
): Draft {
  return updateEntity(draft, 'party', partyId, { canJoinGovernment: eligible });
}

export function setScenarioText(
  draft: Draft,
  field: 'name' | 'notes',
  value: string,
): Draft {
  return { ...draft, [field]: value };
}

export type GroupFractionField =
  'populationShare' | 'turnout' | 'validBallotRate' | 'participationFactor';

export const GROUP_FRACTION_FIELDS: readonly GroupFractionField[] = [
  'populationShare',
  'turnout',
  'validBallotRate',
  'participationFactor',
];

/** Signed yearly changes (Section 14.2), edited as percents like fractions. */
export type GroupChangeField = 'growthRate' | 'turnoutChange';

export const GROUP_CHANGE_FIELDS: readonly GroupChangeField[] = [
  'growthRate',
  'turnoutChange',
];

export type VotingMode = 'restricted' | 'open';

export type RuleField =
  'seatCount' | 'populationTotal' | 'majorityOverride' | 'threshold';

export type MajorityMode = 'default' | 'override';

function groupById(draft: Draft, groupId: string): DraftEntity {
  return entities(draft, 'group')[indexOf(draft, 'group', groupId)]!;
}

function rulesOf(draft: Draft): Json {
  return isObject(draft.rules) ? draft.rules : {};
}

function canonicalDecimal(text: string): string {
  try {
    return toDecimalString(parseDecimal(text.trim()));
  } catch {
    return text;
  }
}

function withoutKey(record: Json, key: string): Json {
  return Object.fromEntries(Object.entries(record).filter(([k]) => k !== key));
}

/** Stores the percent text as an exact fraction, or raw when unparseable. */
export function setGroupFraction(
  draft: Draft,
  groupId: string,
  field: GroupFractionField | GroupChangeField,
  percentText: string,
): Draft {
  if (
    isPartyMode(draft) &&
    draft.schemaVersion === SCHEMA_VERSION &&
    field === 'turnout'
  ) {
    throw new EditError(
      'party-mode-unsupported',
      'Party-mode turnout must be changed through the linked turnout operation',
    );
  }
  if (
    isPartyMode(draft) &&
    field !== 'turnout' &&
    field !== 'growthRate' &&
    field !== 'turnoutChange'
  ) {
    requireGroupMode(draft, `Group ${field}`);
  }
  return updateEntity(draft, 'group', groupId, {
    [field]: percentToFraction(percentText) ?? percentText,
  });
}

export function setVotingMode(
  draft: Draft,
  groupId: string,
  mode: VotingMode,
): Draft {
  requireGroupMode(draft, 'Group voting mode');
  return updateEntity(draft, 'group', groupId, { votingMode: mode });
}

/** Allowing adds the party with weight 0; disallowing drops it and its weight. */
export function setAllowedParty(
  draft: Draft,
  groupId: string,
  partyId: string,
  allowed: boolean,
): Draft {
  requireGroupMode(draft, 'Group party access');
  indexOf(draft, 'party', partyId);
  const group = groupById(draft, groupId);
  const list = stringList(group.allowedPartyIds);
  const current = weights(group);
  if (allowed) {
    if (list.includes(partyId)) {
      return draft;
    }
    return updateEntity(draft, 'group', groupId, {
      allowedPartyIds: [...list, partyId],
      voteWeights:
        partyId in current ? current : { ...current, [partyId]: '0' },
    });
  }
  return updateEntity(draft, 'group', groupId, {
    allowedPartyIds: list.filter((id) => id !== partyId),
    voteWeights: withoutKey(current, partyId),
  });
}

export function setVoteWeight(
  draft: Draft,
  groupId: string,
  partyId: string,
  percentText: string,
): Draft {
  requireGroupMode(draft, 'Group vote weights');
  const group = groupById(draft, groupId);
  if (!stringList(group.allowedPartyIds).includes(partyId)) {
    throw new EditError(
      'invalid-weight',
      `Party ${partyId} is not a destination of group ${groupId}`,
    );
  }
  return updateEntity(draft, 'group', groupId, {
    voteWeights: {
      ...weights(group),
      [partyId]: percentToFraction(percentText) ?? percentText,
    },
  });
}

export function setRule(draft: Draft, field: RuleField, text: string): Draft {
  let value: unknown;
  if (field === 'seatCount' || field === 'majorityOverride') {
    value = parseCount(text) ?? text;
  } else if (field === 'threshold') {
    value = percentToFraction(text) ?? text;
  } else {
    value = canonicalDecimal(text);
  }
  return { ...draft, rules: { ...rulesOf(draft), [field]: value } };
}

/** Override starts at a simple majority of the seat count unless already set. */
export function setMajorityMode(draft: Draft, mode: MajorityMode): Draft {
  const rules = rulesOf(draft);
  if (mode === 'default') {
    return {
      ...draft,
      rules: { ...rules, majorityMode: 'default', majorityOverride: null },
    };
  }
  const seats = rules.seatCount;
  const simple =
    typeof seats === 'number' && Number.isSafeInteger(seats) && seats > 0
      ? (seats - (seats % 2)) / 2 + 1
      : null;
  const existing = rules.majorityOverride;
  return {
    ...draft,
    rules: {
      ...rules,
      majorityMode: 'override',
      majorityOverride:
        existing !== null && existing !== undefined ? existing : simple,
    },
  };
}

/** Null when the engine refuses: locked shares exceed 100% or none unlocked. */
export function rebalanceShares(
  draft: Draft,
  lockedGroupIds: readonly string[],
): Draft | null {
  requireGroupMode(draft, 'Group share rebalance');
  const groups = entities(draft, 'group');
  const result = rebalance(
    groups.map((group) => ({
      key: group.id,
      value: group.populationShare,
      locked: lockedGroupIds.includes(group.id),
    })),
  );
  if (result === null) {
    return null;
  }
  return withList(
    draft,
    'group',
    groups.map((group, index) => ({
      ...group,
      populationShare: result[index]!.value,
    })),
  );
}

export function rebalanceWeights(
  draft: Draft,
  groupId: string,
  lockedPartyIds: readonly string[],
): Draft | null {
  requireGroupMode(draft, 'Group vote-weight rebalance');
  const group = groupById(draft, groupId);
  const current = weights(group);
  const result = rebalance(
    stringList(group.allowedPartyIds).map((partyId) => ({
      key: partyId,
      value: partyId in current ? current[partyId] : '0',
      locked: lockedPartyIds.includes(partyId),
    })),
  );
  if (result === null) {
    return null;
  }
  const next: Record<string, unknown> = { ...current };
  for (const { key, value } of result) {
    next[key] = value;
  }
  return updateEntity(draft, 'group', groupId, { voteWeights: next });
}

/** Groups voting for a party or block: only for it, or also elsewhere. */
export interface TurnoutCohorts {
  readonly dedicated: readonly string[];
  readonly shared: readonly string[];
}

/** An unreadable weight counts as a vote, so no shortcut is offered on it. */
function carriesVotes(weights: Json, partyId: string): boolean {
  const weight = Object.prototype.hasOwnProperty.call(weights, partyId)
    ? weights[partyId]
    : undefined;
  if (typeof weight !== 'string') {
    return true;
  }
  try {
    return !isZero(parseDecimal(weight.trim()));
  } catch {
    return true;
  }
}

/** Section 5: the groups whose turnout a party or block shortcut may name. */
export function turnoutCohorts(
  draft: Draft,
  kind: 'party' | 'block',
  id: string,
): TurnoutCohorts {
  requireGroupMode(draft, 'Turnout cohort shortcuts');
  indexOf(draft, kind, id);
  const parties = entities(draft, 'party');
  const known = new Set(parties.map((party) => party.id));
  const target = new Set(
    kind === 'party'
      ? [id]
      : parties
          .filter((party) => party.blockId === id)
          .map((party) => party.id),
  );
  const dedicated: string[] = [];
  const shared: string[] = [];
  for (const group of entities(draft, 'group')) {
    const current = weights(group);
    const fed = stringList(group.allowedPartyIds).filter(
      (partyId) => known.has(partyId) && carriesVotes(current, partyId),
    );
    if (fed.some((partyId) => target.has(partyId))) {
      const list = fed.every((partyId) => target.has(partyId))
        ? dedicated
        : shared;
      list.push(group.id);
    }
  }
  return { dedicated, shared };
}

const ONE = rational(1n);

function isTurnout(fraction: string): boolean {
  const value = parseDecimal(fraction);
  return !isNegative(value) && lessThanOrEqual(value, ONE);
}

/** Sets one absolute turnout on each listed group once. */
export function setCohortTurnout(
  draft: Draft,
  groupIds: readonly string[],
  percentText: string,
): Draft {
  requireGroupMode(draft, 'Turnout cohort edits');
  const fraction = percentToFraction(percentText);
  if (fraction === null || !isTurnout(fraction)) {
    throw new EditError(
      'invalid-turnout',
      `Turnout must be a percent from 0 to 100: ${percentText}`,
    );
  }
  let next = draft;
  for (const groupId of new Set(groupIds)) {
    next = updateEntity(next, 'group', groupId, { turnout: fraction });
  }
  return next;
}

export function moveEntity(
  draft: Draft,
  kind: EntityKind,
  id: string,
  offset: -1 | 1,
): Draft {
  const index = indexOf(draft, kind, id);
  const target = index + offset;
  const list = [...entities(draft, kind)];
  if (target < 0 || target >= list.length) {
    return draft;
  }
  [list[index], list[target]] = [list[target]!, list[index]!];
  return withList(draft, kind, list);
}

function stringList(value: unknown): readonly string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : [];
}

function weights(group: DraftEntity): Json {
  return isObject(group.voteWeights) ? group.voteWeights : {};
}

function exactZero(value: unknown): boolean {
  return (
    isObject(value) &&
    typeof value.numerator === 'string' &&
    /^0+$/.test(value.numerator) &&
    typeof value.denominator === 'string' &&
    /^[0-9]+$/.test(value.denominator) &&
    !/^0+$/.test(value.denominator)
  );
}

function compositionOf(party: DraftEntity): Json | null {
  return isObject(party.composition) ? party.composition : null;
}

function linkedRows(draft: Draft): Json | null {
  return isObject(draft.linkedModel) && isObject(draft.linkedModel.groups)
    ? draft.linkedModel.groups
    : null;
}

function pairs(draft: Draft, list: string): readonly unknown[] {
  const value = draft.coalitionRules[list];
  return Array.isArray(value) ? value : [];
}

function pairNames(pair: unknown, id: string): boolean {
  return Array.isArray(pair) && pair.includes(id);
}

function pairLists(kind: EntityKind): readonly string[] {
  if (kind === 'party') {
    return PARTY_PAIR_LISTS;
  }
  return kind === 'block' ? BLOCK_PAIR_LISTS : [];
}

export function findReferences(
  draft: Draft,
  kind: EntityKind,
  id: string,
): readonly Reference[] {
  indexOf(draft, kind, id);
  const references: Reference[] = [];
  if (kind === 'party') {
    if (isPartyMode(draft)) {
      const party = entities(draft, 'party')[indexOf(draft, kind, id)]!;
      if (!exactZero(party.voteShare)) {
        references.push({
          kind: 'share',
          id,
          path: `parties[${indexOf(draft, kind, id)}].voteShare`,
        });
      }
      const rows = linkedRows(draft);
      if (rows !== null) {
        for (const [groupId, row] of Object.entries(rows)) {
          if (
            isObject(row) &&
            isObject(row.preferences) &&
            Object.hasOwn(row.preferences, id) &&
            !exactZero(row.preferences[id])
          ) {
            references.push({
              kind: 'model-preference',
              id: groupId,
              path: `linkedModel.groups.${groupId}.preferences.${id}`,
            });
          }
        }
      }
    } else {
      draft.groups.forEach((group, index) => {
        if (
          stringList(group.allowedPartyIds).includes(id) ||
          Object.hasOwn(weights(group), id)
        ) {
          references.push({
            kind: 'group',
            id: group.id,
            path: `groups[${index}]`,
          });
        }
      });
    }
  }
  if (kind === 'group' && isPartyMode(draft)) {
    draft.parties.forEach((party, index) => {
      const composition = compositionOf(party);
      if (
        composition !== null &&
        Object.hasOwn(composition, id) &&
        !exactZero(composition[id])
      ) {
        references.push({
          kind: 'composition',
          id: party.id,
          path: `parties[${index}].composition.${id}`,
        });
        const row = linkedRows(draft)?.[id];
        if (isObject(row) && !exactZero(row.populationShare)) {
          references.push({
            kind: 'model-population',
            id,
            path: `linkedModel.groups.${id}.populationShare`,
          });
        }
        if (
          isObject(row) &&
          isObject(row.preferences) &&
          Object.values(row.preferences).some((value) => !exactZero(value))
        ) {
          references.push({
            kind: 'model-group-preference',
            id,
            path: `linkedModel.groups.${id}.preferences`,
          });
        }
      }
    });
  }
  if (kind === 'block') {
    draft.parties.forEach((party, index) => {
      if (party.blockId === id) {
        references.push({
          kind: 'party',
          id: party.id,
          path: `parties[${index}]`,
        });
      }
    });
  }
  for (const list of pairLists(kind)) {
    pairs(draft, list).forEach((pair, index) => {
      if (pairNames(pair, id)) {
        references.push({
          kind: 'pair',
          id: null,
          path: `coalitionRules.${list}[${index}]`,
        });
      }
    });
  }
  return references;
}

export function repairModes(kind: EntityKind): readonly RepairMode[] {
  return REPAIRS[kind];
}

function sumWeights(left: unknown, right: unknown): string {
  try {
    if (typeof left !== 'string' || typeof right !== 'string') {
      throw new RationalError('invalid-decimal', 'Weight must be a string');
    }
    return toDecimalString(add(parseDecimal(left), parseDecimal(right)));
  } catch (error) {
    if (error instanceof RationalError) {
      throw new EditError('invalid-weight', error.message);
    }
    throw error;
  }
}

/** Moves a party's place and weight in one group to the target party. */
function reassignInGroup(
  group: DraftEntity,
  id: string,
  targetId: string,
): DraftEntity {
  const allowed = stringList(group.allowedPartyIds);
  const nextAllowed = allowed.includes(targetId)
    ? allowed.filter((item) => item !== id)
    : allowed.map((item) => (item === id ? targetId : item));
  const source = weights(group);
  const nextWeights: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(source)) {
    if (key === id) {
      if (Object.hasOwn(source, targetId)) {
        continue;
      }
      nextWeights[targetId] = value;
    } else if (key === targetId && Object.hasOwn(source, id)) {
      nextWeights[key] = sumWeights(value, source[id]);
    } else {
      nextWeights[key] = value;
    }
  }
  return { ...group, allowedPartyIds: nextAllowed, voteWeights: nextWeights };
}

function removeFromGroup(group: DraftEntity, id: string): DraftEntity {
  const nextWeights = Object.fromEntries(
    Object.entries(weights(group)).filter(([key]) => key !== id),
  );
  return {
    ...group,
    allowedPartyIds: stringList(group.allowedPartyIds).filter(
      (item) => item !== id,
    ),
    voteWeights: nextWeights,
  };
}

function withoutPairs(draft: Draft, kind: EntityKind, id: string): Draft {
  const rules: Record<string, unknown> = { ...draft.coalitionRules };
  for (const list of pairLists(kind)) {
    if (Array.isArray(rules[list])) {
      rules[list] = pairs(draft, list).filter((pair) => !pairNames(pair, id));
    }
  }
  return { ...draft, coalitionRules: rules };
}

function checkRepair(
  draft: Draft,
  kind: EntityKind,
  id: string,
  repair: Repair,
): void {
  if (!REPAIRS[kind].includes(repair.mode)) {
    throw new EditError(
      'invalid-repair',
      `Repair ${repair.mode} does not apply to a ${kind}`,
    );
  }
  if (repair.mode === 'reassign') {
    const exists = entities(draft, kind).some(
      (entity) => entity.id === repair.targetId,
    );
    if (repair.targetId === id || !exists) {
      throw new EditError(
        'invalid-repair',
        `Cannot reassign ${id} to ${repair.targetId}`,
      );
    }
  }
}

export function deleteEntity(
  draft: Draft,
  kind: EntityKind,
  id: string,
  repair?: Repair,
): Draft {
  const index = indexOf(draft, kind, id);
  if (isPartyMode(draft)) {
    const rows = linkedRows(draft);
    const row = rows?.[id];
    if (kind === 'group' && isObject(row) && !exactZero(row.populationShare)) {
      throw new EditError(
        'group-population-in-use',
        `Group ${id} has a positive or invalid modeled population`,
      );
    }
    if (
      kind === 'group' &&
      isObject(row) &&
      isObject(row.preferences) &&
      Object.values(row.preferences).some((value) => !exactZero(value))
    ) {
      throw new EditError(
        'group-preference-in-use',
        `Group ${id} has a positive or invalid modeled preference`,
      );
    }
    if (
      kind === 'party' &&
      !exactZero(entities(draft, kind)[index]!.voteShare)
    ) {
      throw new EditError(
        'party-share-in-use',
        `Party ${id} has a positive or invalid vote share`,
      );
    }
    if (
      kind === 'party' &&
      rows !== null &&
      Object.values(rows).some(
        (value) =>
          isObject(value) &&
          isObject(value.preferences) &&
          Object.hasOwn(value.preferences, id) &&
          !exactZero(value.preferences[id]),
      )
    ) {
      throw new EditError(
        'party-preference-in-use',
        `Party ${id} has a positive or invalid modeled preference`,
      );
    }
    if (
      kind === 'group' &&
      draft.parties.some((party) => {
        const composition = compositionOf(party);
        return (
          composition !== null &&
          Object.hasOwn(composition, id) &&
          !exactZero(composition[id])
        );
      })
    ) {
      throw new EditError(
        'group-composition-in-use',
        `Group ${id} has a positive or invalid party composition share`,
      );
    }
    if (kind === 'party' && repair?.mode === 'reassign') {
      throw new EditError(
        'invalid-repair',
        'Party-mode vote shares cannot be reassigned during deletion',
      );
    }
  }
  const referenced = findReferences(draft, kind, id).length > 0;
  if (repair === undefined && referenced) {
    throw new EditError('repair-required', `${id} is referenced`);
  }
  if (repair !== undefined && kind !== 'group') {
    checkRepair(draft, kind, id, repair);
  }
  let next = withList(
    draft,
    kind,
    entities(draft, kind).filter((_, position) => position !== index),
  );
  if (kind === 'party' && repair !== undefined && !isPartyMode(draft)) {
    next = {
      ...next,
      groups: next.groups.map((group) =>
        repair.mode === 'reassign'
          ? reassignInGroup(group, id, repair.targetId)
          : removeFromGroup(group, id),
      ),
    };
  }
  if (kind === 'block' && repair !== undefined) {
    const blockId = repair.mode === 'reassign' ? repair.targetId : null;
    next = {
      ...next,
      parties: next.parties.map((party) =>
        party.blockId === id ? { ...party, blockId } : party,
      ),
    };
  }
  if (kind === 'group' && isPartyMode(draft)) {
    next = {
      ...next,
      parties: next.parties.map((party) => {
        const composition = compositionOf(party);
        return composition === null
          ? party
          : { ...party, composition: withoutKey(composition, id) };
      }),
    };
  }
  if (isPartyMode(draft) && kind !== 'block' && isObject(next.linkedModel)) {
    const model = next.linkedModel;
    if (isObject(model.groups)) {
      const groups = Object.fromEntries(
        Object.entries(model.groups)
          .filter(([groupId]) => kind !== 'group' || groupId !== id)
          .map(([groupId, value]) => {
            if (kind !== 'party' || !isObject(value)) return [groupId, value];
            return [
              groupId,
              {
                ...value,
                preferences: isObject(value.preferences)
                  ? withoutKey(value.preferences, id)
                  : value.preferences,
                allowedPartyIds: Array.isArray(value.allowedPartyIds)
                  ? value.allowedPartyIds.filter((partyId) => partyId !== id)
                  : value.allowedPartyIds,
              },
            ];
          }),
      );
      next = { ...next, linkedModel: { ...model, groups } };
    }
  }
  return withoutPairs(next, kind, id);
}

export type PairList =
  | 'incompatiblePartyPairs'
  | 'incompatibleBlockPairs'
  | 'compatiblePartyOverrides'
  | 'partyRefusals';

export const PAIR_LISTS: readonly PairList[] = [
  'incompatiblePartyPairs',
  'incompatibleBlockPairs',
  'compatiblePartyOverrides',
  'partyRefusals',
];

/** Lists whose pairs, in either order, a new pair of the key list may not repeat. */
const CONFLICTING_LISTS: Readonly<Record<PairList, readonly PairList[]>> = {
  incompatiblePartyPairs: ['compatiblePartyOverrides'],
  incompatibleBlockPairs: [],
  compatiblePartyOverrides: ['incompatiblePartyPairs', 'partyRefusals'],
  partyRefusals: ['compatiblePartyOverrides'],
};

function samePair(pair: unknown, first: string, second: string): boolean {
  return (
    Array.isArray(pair) &&
    pair.length === 2 &&
    ((pair[0] === first && pair[1] === second) ||
      (pair[0] === second && pair[1] === first))
  );
}

function sameDirection(pair: unknown, first: string, second: string): boolean {
  return (
    Array.isArray(pair) &&
    pair.length === 2 &&
    pair[0] === first &&
    pair[1] === second
  );
}

/**
 * Appends a pair; refuses self, duplicate and conflicting pairs. A refusal
 * keeps its direction, [refuser, refused]; other pairs are stored in persisted
 * entity order.
 */
export function addPair(
  draft: Draft,
  list: PairList,
  first: string,
  second: string,
): Draft {
  const current = pairs(draft, list);
  if (current.length >= LIMITS.pairs) {
    throw new EditError(
      'limit-reached',
      `At most ${LIMITS.pairs} pairs per list`,
    );
  }
  const kind: EntityKind =
    list === 'incompatibleBlockPairs' ? 'block' : 'party';
  const firstIndex = indexOf(draft, kind, first);
  const secondIndex = indexOf(draft, kind, second);
  if (firstIndex === secondIndex) {
    throw new EditError('invalid-pair', `${first} cannot pair with itself`);
  }
  const directed = list === 'partyRefusals';
  const repeated = current.some((pair) =>
    directed
      ? sameDirection(pair, first, second)
      : samePair(pair, first, second),
  );
  const conflicting = CONFLICTING_LISTS[list].some((other) =>
    pairs(draft, other).some((pair) => samePair(pair, first, second)),
  );
  if (repeated || conflicting) {
    throw new EditError(
      'invalid-pair',
      `${first} and ${second} are already paired`,
    );
  }
  const ordered =
    directed || firstIndex < secondIndex ? [first, second] : [second, first];
  return {
    ...draft,
    coalitionRules: { ...draft.coalitionRules, [list]: [...current, ordered] },
  };
}

export function removePair(draft: Draft, list: PairList, index: number): Draft {
  const current = pairs(draft, list);
  if (!Number.isInteger(index) || index < 0 || index >= current.length) {
    throw new EditError('invalid-pair', `No pair at ${index} in ${list}`);
  }
  return {
    ...draft,
    coalitionRules: {
      ...draft.coalitionRules,
      [list]: current.filter((_, position) => position !== index),
    },
  };
}
