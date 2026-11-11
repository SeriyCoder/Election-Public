import { describe, expect, it } from 'vitest';
import { runScenario, runSeats, serializeResult } from '../../src/engine/run';
import { section8Input, section8Scenario } from './helpers/scenarios';
import { buildScenario } from './helpers/scenarios';

describe('seats-only run', () => {
  it.each(['1', '0.5', '0.37', '0'])(
    'matches the full run without coalitions (group 3 turnout %s)',
    (turnout) => {
      const scenario = section8Scenario(turnout);
      const full = runScenario(scenario);
      const seats = runSeats(scenario);
      expect(seats).toEqual({
        votes: full.votes,
        threshold: full.threshold,
        allocation: full.allocation,
      });
    },
  );

  it('has exactly the votes, threshold and allocation fields', () => {
    expect(Object.keys(runSeats(section8Scenario()))).toEqual([
      'votes',
      'threshold',
      'allocation',
    ]);
  });

  it('serializes identically across runs and after a JSON round trip', () => {
    const input = section8Input('0.37');
    const first = serializeResult(runSeats(buildScenario(input)));
    const second = serializeResult(runSeats(buildScenario(input)));
    const roundTrip = serializeResult(
      runSeats(buildScenario(JSON.parse(JSON.stringify(input)))),
    );
    expect(second).toBe(first);
    expect(roundTrip).toBe(first);
  });

  it('keeps the full run serialization a superset', () => {
    const scenario = section8Scenario();
    const full = serializeResult(runScenario(scenario));
    const seats = serializeResult(runSeats(scenario));
    expect(full.startsWith(seats.slice(0, -1))).toBe(true);
  });
});
