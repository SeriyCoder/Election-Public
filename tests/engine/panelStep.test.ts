import { describe, expect, it } from 'vitest';
import { stepPanelPercent } from '../../src/engine/panel';

describe('M7-14 exact 0.25-point stepper', () => {
  it.each([
    ['32.8', 1, '33.05'],
    ['32.8', -1, '32.55'],
    ['0', 1, '0.25'],
    ['50', -1, '49.75'],
    ['33.3333333333333333', 1, '33.5833333333333333'],
    ['12,5', 1, '12.75'],
  ] as const)('moves %s by %i quarter point to %s', (text, direction, next) => {
    expect(stepPanelPercent(text, direction)).toBe(next);
  });

  it.each([
    ['0.1', -1, '0'],
    ['0', -1, '0'],
    ['99.9', 1, '100'],
    ['100', 1, '100'],
  ] as const)('clamps %s moved by %i to %s', (text, direction, next) => {
    expect(stepPanelPercent(text, direction)).toBe(next);
  });

  it.each(['', 'abc', '-1', '101', '1e3'])(
    'refuses the invalid percent text %j',
    (text) => {
      expect(stepPanelPercent(text, 1)).toBeNull();
    },
  );

  it('is deterministic across repeated moves', () => {
    let up = '10';
    for (let step = 0; step < 8; step += 1) {
      up = stepPanelPercent(up, 1)!;
    }
    expect(up).toBe('12');
    expect(stepPanelPercent('10', 1)).toBe(stepPanelPercent('10', 1));
  });
});
