import { describe, expect, it } from 'vitest';
import { nearestCoalitions } from '../../src/engine/coalitionVariants';
import { runSeats } from '../../src/engine/run';
import { validateScenario } from '../../src/engine/schema';
import { workspaceParties } from './helpers/workspace';
import type { Json } from './helpers/scenarios';
function result(input = workspaceParties()) {
  const checked = validateScenario(input);
  if (!checked.ok) throw new Error('Fixture invalid');
  return nearestCoalitions(
    checked.scenario,
    runSeats(checked.scenario).allocation,
  );
}
describe('M7-12 nearest compatible coalition variants', () => {
  it('includes losing and nonminimal compatible sets ordered by distance from majority', () => {
    const variants = result();
    expect(variants.complete).toBe(true);
    expect(variants.total).toBe(7);
    expect(variants.variants[0]?.seats).toBe(51);
    expect(variants.variants.some((row) => row.partyIds.length === 3)).toBe(
      true,
    );
    expect(variants.variants.some((row) => !row.majority)).toBe(true);
  });
  it('honors each direction of a refusal independently', () => {
    const input = workspaceParties();
    (input.coalitionRules as Json).partyRefusals = [['P1', 'P2']];
    expect(
      result(input).variants.every(
        (row) => !(row.partyIds.includes('P1') && row.partyIds.includes('P2')),
      ),
    ).toBe(true);
    (input.coalitionRules as Json).partyRefusals = [['P2', 'P1']];
    expect(
      result(input).variants.every(
        (row) => !(row.partyIds.includes('P1') && row.partyIds.includes('P2')),
      ),
    ).toBe(true);
  });
});
