import { describe, expect, it } from 'vitest';
import { panelTrackPosition } from '../../src/engine/panel';

describe('slider track position (display only)', () => {
  it.each([
    ['0', 0, 100, '0.0'],
    ['32.07', 0, 100, '32.1'],
    ['100', 0, 100, '100.0'],
    ['0', -1, 1, '50.0'],
    ['-0.65', -1, 1, '17.5'],
    ['150', 0, 100, '100'],
    ['-5', 0, 100, '0'],
    ['abc', 0, 100, '0'],
  ])('%s in [%i, %i] fills %s%%', (text, min, max, expected) => {
    expect(panelTrackPosition(text, min, max)).toBe(expected);
  });
});
