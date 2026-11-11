import { describe, expect, it } from 'vitest';
import {
  alignPanelVotes,
  applyPanelRows,
  correctPanelTurnout,
  editPanelCell,
  panelPopulation,
  readPanel,
  smoothPanel,
  type PanelData,
  type PanelEdit,
} from '../../src/engine/panel';
import { rational, sum, toFractionString } from '../../src/engine/rational';
import { runSeats } from '../../src/engine/run';
import { validateScenario, type PartyScenario } from '../../src/engine/schema';
import { workspaceLinked } from './helpers/workspace';

function success(result: PanelEdit) {
  if (!result.ok) throw new Error(result.reason);
  return result.draft;
}
function data(input: unknown = workspaceLinked()): PanelData {
  const result = readPanel(input);
  if (!result) throw new Error('Panel input unavailable');
  return result;
}
function scenario(input: unknown): PartyScenario {
  const result = validateScenario(input);
  if (!result.ok || result.scenario.inputMode !== 'parties')
    throw new Error('Invalid fixture');
  return result.scenario;
}
const text = (values: readonly ReturnType<typeof rational>[]) =>
  values.map(toFractionString);

describe('M7-12 raw panel editing and reference population', () => {
  it('keeps free share edits authoritative and unbalanced until explicit alignment', () => {
    const changed = success(
      editPanelCell(workspaceLinked(), 'P1', null, '60.25'),
    );
    expect(text(data(changed).shares)).toEqual(['241/400', '1/2']);
    expect(validateScenario(changed).ok).toBe(false);
    const aligned = success(alignPanelVotes(changed, ['P1']));
    expect(text(data(aligned).shares)).toEqual(['241/400', '159/400']);
    expect(validateScenario(aligned).ok).toBe(true);
  });
  it('edits one composition cell without redistributing any other cell', () => {
    const before = data();
    const changed = data(
      success(editPanelCell(workspaceLinked(), 'P1', 'G1', '90.25')),
    );
    expect(toFractionString(changed.compositions[0]![0]!)).toBe('361/400');
    expect(changed.compositions[0]![1]).toEqual(before.compositions[0]![1]);
    expect(changed.compositions[1]).toEqual(before.compositions[1]);
    expect(panelPopulation(changed)).toBeNull();
  });
  it.each(['', 'abc', '-1', '101', '1e2'])(
    'refuses invalid percentage %s without an edit',
    (value) => {
      expect(editPanelCell(workspaceLinked(), 'P1', 'G1', value).ok).toBe(
        false,
      );
    },
  );
  it('does not silently fill unknown compositions or infer a zero-turnout population', () => {
    const known = data();
    expect(
      panelPopulation({
        ...known,
        compositions: known.compositions.map(() => null),
      }),
    ).toBeNull();
    expect(
      panelPopulation({ ...known, turnouts: [rational(0n), rational(1n)] }),
    ).toBeNull();
    expect(
      smoothPanel(
        { ...known, compositions: known.compositions.map(() => null) },
        [rational(1n, 2n), rational(1n, 2n)],
        [],
      ).ok,
    ).toBe(false);
  });
  it('corrects turnout and determinable population without changing votes, composition or seats', () => {
    const input = workspaceLinked();
    const before = scenario(input);
    const changed = success(correctPanelTurnout(input, { G1: '80', G2: '60' }));
    const after = scenario(changed);
    expect(after.parties).toEqual(before.parties);
    expect(runSeats(after).allocation.parties).toEqual(
      runSeats(before).allocation.parties,
    );
    expect(panelPopulation(data(changed))?.shares).not.toEqual(
      panelPopulation(data(input))?.shares,
    );
    expect(after.rules.overallTurnout).not.toEqual(before.rules.overallTurnout);
  });
});

describe('M7-12 exact bounded composition smoothing', () => {
  const reference = [rational(3n, 5n), rational(2n, 5n)];
  it('matches the reference exactly and preserves votes, turnout and locks', () => {
    const before = data();
    const result = smoothPanel(before, reference, ['P1:G1']);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.matched).toBe(true);
    expect(result.rows[0]![0]).toEqual(before.compositions[0]![0]);
    expect(result.rows.map((row) => toFractionString(sum(row)))).toEqual([
      '1',
      '1',
    ]);
    const after = { ...before, compositions: result.rows };
    expect(panelPopulation(after)?.shares).toEqual(reference);
    const applied = data(
      success(applyPanelRows(workspaceLinked(), result.rows)),
    );
    expect(applied.shares).toEqual(before.shares);
    expect(applied.turnouts).toEqual(before.turnouts);
    expect(smoothPanel(after, reference, ['P1:G1'])).toEqual(result);
  });
  it('normalizes rows but names the unmatched groups when population locks conflict', () => {
    const before = data();
    const result = smoothPanel(
      before,
      [rational(1n, 100n), rational(99n, 100n)],
      ['P1:G1'],
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.matched).toBe(false);
    expect(result.groups).toContain('G1');
    expect(result.rows[0]![0]).toEqual(before.compositions[0]![0]);
    expect(result.rows.every((row) => toFractionString(sum(row)) === '1')).toBe(
      true,
    );
  });
  it('refuses impossible locked rows atomically and names the party', () => {
    const before = data();
    const impossible = {
      ...before,
      compositions: [
        [rational(4n, 5n), rational(4n, 5n)],
        before.compositions[1]!,
      ],
    };
    expect(
      smoothPanel(impossible, reference, ['P1:G1', 'P1:G2']),
    ).toMatchObject({ ok: false, ids: ['P1'] });
    expect(
      smoothPanel(
        {
          ...before,
          compositions: [
            [rational(1n, 4n), rational(1n, 4n)],
            before.compositions[1]!,
          ],
        },
        reference,
        ['P1:G1', 'P1:G2'],
      ),
    ).toMatchObject({ ok: false, ids: ['P1'] });
  });
  it('bounds fractions through repeated edits, smoothing, locks and fallback', () => {
    let current = data();
    for (let round = 0; round < 60; round += 1) {
      const rows = current.compositions.map((row) => [...row!]);
      rows[1]![0] = rational(BigInt(17 + (round % 31)), 100n);
      const locks = round % 3 === 0 ? ['P1:G1'] : [];
      const result = smoothPanel(
        { ...current, compositions: rows },
        round % 4 === 0 ? [rational(1n, 100n), rational(99n, 100n)] : reference,
        locks,
      );
      expect(result.ok).toBe(true);
      if (!result.ok) throw new Error(result.reason);
      current = { ...current, compositions: result.rows };
      for (const row of result.rows) {
        expect(toFractionString(sum(row))).toBe('1');
        for (const value of row)
          expect(value.den.toString().length).toBeLessThan(80);
      }
    }
  });
  it('handles zero-vote rows without division by zero and keeps the row exact', () => {
    const before = data();
    const result = smoothPanel(
      { ...before, shares: [rational(1n), rational(0n)] },
      reference,
      [],
    );
    expect(result.ok).toBe(true);
    if (result.ok)
      expect(
        result.rows.every((row) => toFractionString(sum(row)) === '1'),
      ).toBe(true);
  });
});
