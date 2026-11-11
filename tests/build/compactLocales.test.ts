import { describe, expect, it } from 'vitest';
import { build } from 'vite';
import {
  compactLocale,
  compactLocales,
  packLocaleValues,
  unpackLocaleValues,
} from '../../build/compactLocales';
import { en } from '../../src/i18n/en';
import enSource from '../../src/i18n/en.ts?raw';
import { he } from '../../src/i18n/he';
import heSource from '../../src/i18n/he.ts?raw';
import { ru } from '../../src/i18n/ru';

function reconstruct(packed: ReturnType<typeof compactLocale>) {
  return Object.fromEntries(
    packed.keys.map((key, index) => [key, packed.values[index]]),
  );
}

describe('build-time translation compaction', () => {
  it('compresses repeated words and preserves literal private-use characters', () => {
    const values = Array.from(
      { length: 60 },
      (_, index) =>
        `\uE000\uE001 ${index}: coalition coalition coalition </script>`,
    );
    const packed = packLocaleValues(values);
    expect(unpackLocaleValues(packed)).toEqual(values);
    expect(
      new TextEncoder().encode(JSON.stringify(packed)).length,
    ).toBeLessThan(new TextEncoder().encode(JSON.stringify(values)).length);
  });

  it('ships all three exact tables after the production transform', async () => {
    const built: unknown = await build({
      configFile: false,
      logLevel: 'silent',
      plugins: [compactLocales()],
      build: {
        write: false,
        lib: { entry: 'src/i18n/index.ts', formats: ['es'] },
      },
    });
    const result = Array.isArray(built) ? built[0] : built;
    if (
      typeof result !== 'object' ||
      result === null ||
      !('output' in result) ||
      !Array.isArray(result.output)
    ) {
      throw new Error('Expected an in-memory translation bundle');
    }
    const chunk = result.output.find(
      (item: unknown) =>
        typeof item === 'object' &&
        item !== null &&
        'code' in item &&
        typeof item.code === 'string',
    );
    if (
      typeof chunk !== 'object' ||
      chunk === null ||
      !('code' in chunk) ||
      typeof chunk.code !== 'string'
    ) {
      throw new Error('Expected a translation bundle chunk');
    }
    // M7-16: the Russian keys travel inside the deflated payload, not as text.
    for (const key of ['app.title', 'book.skip', 'results.empty']) {
      expect(chunk.code, key).not.toContain(key);
    }
    const moduleUrl = `data:text/javascript,${encodeURIComponent(chunk.code)}`;
    const compiled: { TABLES: unknown } = await import(
      /* @vite-ignore */ moduleUrl
    );
    expect(compiled.TABLES).toEqual({ ru, en, he });
  });

  it.each([
    ['en', en, enSource],
    ['he', he, heSource],
  ] as const)(
    'preserves every %s key and exact value in Russian reference order',
    (locale, expected, source) => {
      const packed = compactLocale(ru, source, locale);
      expect(packed.keys).toEqual(Object.keys(ru));
      expect(reconstruct(packed)).toEqual(expected);
    },
  );

  it('matches by key when the translation order differs', () => {
    const reference = { a: 'A', b: 'B' };
    const target = "export const en = { 'b': 'second', 'a': 'first' };";
    expect(compactLocale(reference, target, 'en')).toEqual({
      keys: ['a', 'b'],
      values: ['first', 'second'],
    });
  });

  it('preserves escaped characters and non-ASCII text exactly', () => {
    const reference = { a: 'A' };
    const target = "export const en = { 'a': 'line\\n\\u05d0\\'s' };";
    expect(compactLocale(reference, target, 'en').values).toEqual([
      "line\nא's",
    ]);
  });

  it.each([
    ["export const en = { 'a': 'A' };", /missing/i],
    ["export const en = { 'a': 'A', 'b': 'B', 'c': 'C' };", /extra/i],
    ["export const en = { 'a': 'A', 'a': 'again', 'b': 'B' };", /duplicate/i],
    ["export const en = { 'a': variable, 'b': 'B' };", /literal/i],
  ])('fails explicitly for an invalid translation table', (target, error) => {
    const reference = { a: 'A', b: 'B' };
    expect(() => compactLocale(reference, target, 'en')).toThrow(error);
  });
});
