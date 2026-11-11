import { describe, expect, it } from 'vitest';
import { buildLinkedBasis } from '../../src/engine/linkedTurnout';
import {
  alignPanelVotes,
  editPanelCell,
  readPanel,
  rebuildPanelBasis,
} from '../../src/engine/panel';
import { toFractionString } from '../../src/engine/rational';
import { validateScenario } from '../../src/engine/schema';
import { freezeSupporters } from '../../src/engine/supporterTurnout';
import { workspaceLinked } from './helpers/workspace';

type Json = Record<string, unknown>;

function suspendedDraft(): Json {
  const built = buildLinkedBasis(workspaceLinked());
  if (!built.ok) throw new Error(built.reason);
  const edited = editPanelCell(built.draft, 'P1', null, '55');
  if (!edited.ok) throw new Error(edited.reason);
  const aligned = alignPanelVotes(edited.draft, ['P1']);
  if (!aligned.ok) throw new Error(aligned.reason);
  return aligned.draft as Json;
}

describe('panel rebuild of a suspended linked model', () => {
  it('a panel edit suspends a saved linked model and blocks supporters', () => {
    const draft = suspendedDraft();
    expect((draft.linkedModel as Json).state).toBe('suspended');
    const checked = validateScenario(draft);
    if (!checked.ok) throw new Error('invalid');
    const frozen = freezeSupporters(checked.scenario);
    expect('kind' in frozen && frozen.reason).toBe('suspended-model');
  });
  it('rebuilds a current model from the current numbers and keeps restrictions', () => {
    const draft = suspendedDraft();
    const before = readPanel(draft)!;
    const rebuilt = rebuildPanelBasis(draft);
    if (!rebuilt.ok) throw new Error(rebuilt.reason);
    const model = rebuilt.draft.linkedModel as Json;
    expect(model.state).toBe('current');
    expect(((model.groups as Json).G2 as Json).allowedPartyIds).toEqual([
      'P1',
      'P2',
    ]);
    const after = readPanel(rebuilt.draft)!;
    expect(after.shares.map(toFractionString)).toEqual(
      before.shares.map(toFractionString),
    );
    expect(after.compositions.map((row) => row?.map(toFractionString))).toEqual(
      before.compositions.map((row) => row?.map(toFractionString)),
    );
    const checked = validateScenario(rebuilt.draft);
    if (!checked.ok) throw new Error('invalid');
    expect('kind' in freezeSupporters(checked.scenario)).toBe(false);
  });
  it('refuses a non-draft input', () => {
    expect(rebuildPanelBasis(null).ok).toBe(false);
  });
});
