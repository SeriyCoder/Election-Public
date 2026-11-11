import {
  groupInput,
  partyInput,
  rulesInput,
  scenarioInput,
  section8Input,
  type Json,
} from '../engine/helpers/scenarios';
import { createPrng, millionths, randomParts } from '../engine/helpers/prng';

/** About 80 characters mixing Cyrillic, Latin, Hebrew and digits, no spaces. */
export const LONG_NAME =
  'Объединённая-партия-Alliance-for-Democratic-Renewal-מפלגת-העתיד-2026-Длинное-название';

/** Script-tag and markup strings that must stay inert text. */
export const HOSTILE_NAME = '<script>window.__pwned = 1</script>';
export const HOSTILE_NOTES =
  '<img src="x" onerror="window.__pwned = 2"><b>bold?</b>';

const MILLION = 1_000_000;

/**
 * The Section 12 maximum: 20 groups, 30 parties, 10 blocks, open voting with
 * seeded weights. The first `eligible` parties may join a government.
 */
export function largeInput(options: { eligible: number; seed?: number }): Json {
  const next = createPrng(options.seed ?? 20261028);
  const partyIds = Array.from({ length: 30 }, (_, index) => `P${index + 1}`);
  const floor = Math.floor(MILLION / 60);
  return {
    ...scenarioInput({
      blocks: Array.from({ length: 10 }, (_, index) => ({
        id: `B${index + 1}`,
        name: `Block ${index + 1}`,
        color: '#335577',
      })),
      parties: partyIds.map((id, index) =>
        partyInput(
          id,
          `B${(index % 10) + 1}`,
          index + 1,
          index < options.eligible,
        ),
      ),
      groups: Array.from({ length: 20 }, (_, index) => {
        // Every party gets at least `floor` millionths, so none is empty.
        const parts = randomParts(next, 30, MILLION - floor * 30);
        const weights = Object.fromEntries(
          partyIds.map((id, party) => [
            id,
            millionths(floor + (parts[party] ?? 0)),
          ]),
        );
        return groupInput(`G${index + 1}`, '0.05', weights);
      }),
      rules: rulesInput(),
    }),
    id: 'large',
    name: 'Large 20 / 30 / 10',
  };
}

/** Section 8 baseline with every name replaced by a long mixed-script name. */
export function longNamesInput(): Json {
  const input = section8Input();
  const rename = (list: unknown, prefix: string): Json[] =>
    (list as Json[]).map((entry, index) => ({
      ...entry,
      name: `${prefix}${index + 1}-${LONG_NAME}`,
    }));
  return {
    ...input,
    name: `Сценарий-${LONG_NAME}`,
    parties: rename(input.parties, 'P'),
    groups: rename(input.groups, 'G'),
    blocks: rename(input.blocks, 'B'),
  };
}

/** Section 8 baseline with hostile markup in names and notes. */
export function hostileInput(): Json {
  const input = section8Input();
  const parties = (input.parties as Json[]).map((party, index) =>
    index === 0
      ? { ...party, name: HOSTILE_NAME, notes: HOSTILE_NOTES }
      : party,
  );
  return { ...input, name: HOSTILE_NAME, notes: HOSTILE_NOTES, parties };
}

/**
 * Two parties with equal votes for 11 seats: quotas 5.5 and 5.5, an exact
 * remainder tie that only tieBreakOrder decides. P2 is first, so P2 gets 6.
 */
export function tieInput(): Json {
  return {
    ...scenarioInput({
      parties: [partyInput('P1', null, 2), partyInput('P2', null, 1)],
      groups: [groupInput('G1', '1', { P1: '0.5', P2: '0.5' })],
      rules: rulesInput({ seatCount: 11 }),
    }),
    id: 'tie',
    name: 'Exact tie',
  };
}
