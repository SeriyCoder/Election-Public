import { describe, expect, it } from 'vitest';
import {
  compare,
  rational,
  sub,
  toFractionString,
  type Rational,
} from '../../src/engine/rational';
import { runScenario, serializeResult } from '../../src/engine/run';
import { parseScenarioJson, type Scenario } from '../../src/engine/schema';
import { buildScenario, section8Input, type Json } from './helpers/scenarios';

const engineSources = import.meta.glob('../../src/engine/**/*.ts', {
  query: '?raw',
  import: 'default',
  eager: true,
});

/** Truncates num / den to the 18 fraction digits a scenario decimal allows. */
function decimal18(num: bigint, den: bigint): string {
  const digits = (num * 10n ** 18n) / den;
  return `0.${digits.toString().padStart(18, '0')}`;
}

interface Preset {
  readonly name: string;
  readonly turnout: string;
  readonly seats: readonly number[];
  readonly pairs: readonly string[];
  readonly status: string;
}

// Section 8.1: t = 0.85 s / (0.15 (1 - s)) gives 119/279 for 7% and 34/69 for 8%.
const presets: readonly Preset[] = [
  {
    name: 'baseline',
    turnout: '1',
    seats: [46, 50, 18, 6],
    pairs: [],
    status: 'deadlock',
  },
  {
    name: 'Group 3 turnout zero',
    turnout: '0',
    seats: [54, 59, 0, 7],
    pairs: ['P2+P4=66', 'P1+P4=61'],
    status: 'feasible',
  },
  {
    name: 'Group 3 final share 7%',
    turnout: decimal18(119n, 279n),
    seats: [50, 55, 8, 7],
    pairs: ['P2+P4=62'],
    status: 'feasible',
  },
  {
    name: 'Group 3 final share 8%',
    turnout: decimal18(34n, 69n),
    seats: [49, 55, 10, 6],
    pairs: ['P2+P4=61'],
    status: 'feasible',
  },
];

function presetScenario(preset: Preset): Scenario {
  return buildScenario(section8Input(preset.turnout));
}

function render(scenario: Scenario): string {
  return serializeResult(runScenario(scenario));
}

describe('Section 8 fixtures', () => {
  it.each(presets)('$name reproduces seats and permitted pairs', (preset) => {
    const result = runScenario(presetScenario(preset));
    expect(result.allocation.parties.map((party) => party.seats)).toEqual(
      preset.seats,
    );
    expect(
      result.coalitions.minimalWinning.map(
        (coalition) => `${coalition.partyIds.join('+')}=${coalition.seats}`,
      ),
    ).toEqual(preset.pairs);
    expect(result.coalitions.status).toBe(preset.status);
    expect(result.coalitions.complete).toBe(true);
  });

  it.each(presets.slice(2))(
    '$name keeps every remainder decision far from the truncation error',
    (preset) => {
      const result = runScenario(presetScenario(preset));
      const remainders = result.allocation.parties
        .map((party) => party.remainder)
        .filter((value): value is Rational => value !== null)
        .sort(compare);
      const margin = rational(1n, 1000n);
      expect(compare(remainders[0]!, margin)).toBe(1);
      expect(
        compare(remainders[remainders.length - 1]!, sub(rational(1n), margin)),
      ).toBe(-1);
      for (let index = 1; index < remainders.length; index += 1) {
        expect(
          compare(sub(remainders[index]!, remainders[index - 1]!), margin),
        ).toBe(1);
      }
    },
  );

  it('approximates the 7% and 8% final shares to within 1e-15', () => {
    const tolerance = rational(1n, 10n ** 15n);
    for (const [preset, target] of [
      [presets[2]!, rational(7n, 100n)],
      [presets[3]!, rational(8n, 100n)],
    ] as const) {
      const share = runScenario(presetScenario(preset)).votes.parties[2]!
        .voteShare!;
      const error = sub(share, target);
      expect(compare(error, tolerance)).toBe(-1);
      expect(compare(error, sub(rational(0n), tolerance))).toBe(1);
    }
  });

  it('gives exactly 3/37 final share at 50% Group 3 turnout', () => {
    const share = runScenario(buildScenario(section8Input('0.5'))).votes
      .parties[2]!.voteShare;
    expect(share === null ? null : toFractionString(share)).toBe('3/37');
  });
});

describe('canonical result JSON', () => {
  it('prints exact rationals as fraction strings', () => {
    const parsed = JSON.parse(render(presetScenario(presets[0]!))) as {
      allocation: { parties: { quota: string }[] };
      votes: { allValidVotes: string };
    };
    expect(parsed.allocation.parties[0]?.quota).toBe('228/5');
    expect(parsed.votes.allValidVotes).toBe('1000000');
  });

  it('includes every stage of the pipeline', () => {
    const parsed = JSON.parse(render(presetScenario(presets[1]!))) as Json;
    expect(Object.keys(parsed)).toEqual([
      'votes',
      'threshold',
      'allocation',
      'coalitions',
    ]);
  });
});

type Patch = (original: unknown) => unknown;

/** Replaces locale-sensitive built-ins for the duration of `body`. */
function withLocaleApis(patch: Patch, body: () => string): string {
  const targets: [object, string][] = [
    [Number.prototype, 'toLocaleString'],
    [BigInt.prototype, 'toLocaleString'],
    [Array.prototype, 'toLocaleString'],
    [String.prototype, 'localeCompare'],
    [Intl, 'Collator'],
    [Intl, 'NumberFormat'],
  ];
  const saved = targets.map(
    ([target, key]) =>
      [target, key, Object.getOwnPropertyDescriptor(target, key)] as const,
  );
  try {
    for (const [target, key, descriptor] of saved) {
      Object.defineProperty(target, key, {
        ...descriptor,
        value: patch(descriptor?.value),
      });
    }
    return body();
  } finally {
    for (const [target, key, descriptor] of saved) {
      if (descriptor !== undefined) {
        Object.defineProperty(target, key, descriptor);
      }
    }
  }
}

function bindLocale(locale: string): Patch {
  return (original) =>
    function (this: unknown, ...args: unknown[]): unknown {
      const call = original as (...rest: unknown[]) => unknown;
      if (new.target !== undefined) {
        const Construct = original as new (...rest: unknown[]) => unknown;
        return new Construct(locale, args[1]);
      }
      return call.call(this, locale, args[1]);
    };
}

const trap: Patch = () =>
  function (): never {
    throw new Error('locale-sensitive API called by the engine');
  };

describe('determinism', () => {
  it.each(presets)('$name is byte-identical across repeated runs', (preset) => {
    const first = render(presetScenario(preset));
    expect(render(presetScenario(preset))).toBe(first);
    expect(render(presetScenario(preset))).toBe(first);
  });

  it.each(presets)(
    '$name is byte-identical after a scenario JSON round trip',
    (preset) => {
      const scenario = presetScenario(preset);
      const reparsed = parseScenarioJson(JSON.stringify(scenario));
      expect(reparsed.ok).toBe(true);
      if (reparsed.ok) {
        expect(render(reparsed.scenario)).toBe(render(scenario));
      }
      const fromInput = parseScenarioJson(
        JSON.stringify(section8Input(preset.turnout)),
      );
      expect(fromInput.ok && render(fromInput.scenario)).toBe(render(scenario));
    },
  );

  it.each(presets)(
    '$name is byte-identical under ru, en and he locales',
    (preset) => {
      const scenario = presetScenario(preset);
      const reference = render(scenario);
      for (const locale of ['ru', 'en', 'he']) {
        expect(withLocaleApis(bindLocale(locale), () => render(scenario))).toBe(
          reference,
        );
      }
    },
  );

  it.each(presets)('$name never calls a locale-sensitive API', (preset) => {
    const scenario = presetScenario(preset);
    const reference = render(scenario);
    expect(withLocaleApis(trap, () => render(scenario))).toBe(reference);
  });

  it('installs and then restores the patched built-ins', () => {
    withLocaleApis(trap, () => {
      expect(() => (1234.5).toLocaleString()).toThrow('locale-sensitive');
      expect(() => 'a'.localeCompare('b')).toThrow('locale-sensitive');
      expect(() => new Intl.Collator()).toThrow('locale-sensitive');
      return '';
    });
    expect(
      withLocaleApis(bindLocale('ru'), () => (1234.5).toLocaleString('en')),
    ).toBe((1234.5).toLocaleString('ru'));
    expect((1234.5).toLocaleString('en')).toBe('1,234.5');
    expect('a'.localeCompare('b')).toBe(-1);
  });

  it('scans every engine source for floating-point and locale tokens', () => {
    const files = Object.entries(engineSources);
    expect(files.map(([path]) => path.split('/').pop()).sort()).toEqual(
      expect.arrayContaining([
        'allocate.ts',
        'coalitions.ts',
        'rational.ts',
        'run.ts',
        'schema.ts',
        'threshold.ts',
        'votes.ts',
      ]),
    );
    for (const [path, source] of files) {
      for (const token of [
        'parseFloat',
        'Number(',
        'Math.',
        'toFixed',
        'toPrecision',
        'toLocaleString',
        'localeCompare',
        'Intl.',
        'new Date',
        'Date.now',
      ]) {
        expect(
          (source as string).includes(token) ? `${path}: ${token}` : null,
        ).toBeNull();
      }
    }
  });
});
