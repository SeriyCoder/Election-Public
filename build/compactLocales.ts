import ts from 'typescript';
import { deflateSync } from 'node:zlib';
import { normalizePath, type Plugin } from 'vite';
import { ru } from '../src/i18n/ru';

export interface PackedLocale {
  readonly keys: readonly string[];
  readonly values: readonly string[];
}

export interface PackedLocaleValues {
  readonly markers: string;
  readonly dictionary: readonly string[];
  readonly values: readonly string[];
}

const WORDS = /[\p{L}\p{N}]{3,}/gu;
const MARKERS = /[\uE000-\uF8FF]/g;
const MAX_MARKERS = 512;

/** Replaces frequent whole words only with private-use characters absent from the source. */
export function packLocaleValues(
  values: readonly string[],
): PackedLocaleValues {
  const counts = new Map<string, number>();
  const occupied = new Set(values.join(''));
  for (const value of values) {
    for (const word of value.match(WORDS) ?? []) {
      counts.set(word, (counts.get(word) ?? 0) + 1);
    }
  }
  const encoder = new TextEncoder();
  const candidates = [...counts]
    .map(([word, count]) => ({
      word,
      saving: (count - 1) * encoder.encode(word).length - count * 3 - 6,
    }))
    .filter((entry) => entry.saving > 0)
    .sort(
      (a, b) =>
        b.saving - a.saving || (a.word < b.word ? -1 : a.word > b.word ? 1 : 0),
    );
  const markers: string[] = [];
  for (
    let code = 0xe000;
    code <= 0xf8ff && markers.length < MAX_MARKERS;
    code += 1
  ) {
    const marker = String.fromCharCode(code);
    if (!occupied.has(marker)) markers.push(marker);
  }
  const dictionary = candidates
    .slice(0, markers.length)
    .map((entry) => entry.word);
  const used = markers.slice(0, dictionary.length);
  const replacements = new Map(
    dictionary.map((word, index) => [word, used[index]!]),
  );
  return {
    markers: used.join(''),
    dictionary,
    values: values.map((value) =>
      value.replace(WORDS, (word) => replacements.get(word) ?? word),
    ),
  };
}

export function unpackLocaleValues(packed: PackedLocaleValues): string[] {
  const words = new Map(
    Array.from(packed.markers, (marker, index) => [
      marker,
      packed.dictionary[index]!,
    ]),
  );
  return packed.values.map((value) =>
    value.replace(MARKERS, (marker) => words.get(marker) ?? marker),
  );
}

function entriesOf(source: string, name: string): Map<string, string> {
  const file = ts.createSourceFile(
    `${name}.ts`,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const declarations = file.statements
    .filter(ts.isVariableStatement)
    .flatMap((statement) => [...statement.declarationList.declarations])
    .filter(
      (declaration) =>
        ts.isIdentifier(declaration.name) && declaration.name.text === name,
    );
  if (declarations.length !== 1) {
    throw new Error(`Expected exactly one ${name} translation table`);
  }
  let value = declarations[0]?.initializer;
  while (
    value !== undefined &&
    (ts.isAsExpression(value) ||
      ts.isSatisfiesExpression(value) ||
      ts.isParenthesizedExpression(value))
  ) {
    value = value.expression;
  }
  if (value === undefined || !ts.isObjectLiteralExpression(value)) {
    throw new Error(`Expected a literal ${name} translation table`);
  }
  const entries = new Map<string, string>();
  for (const property of value.properties) {
    if (
      !ts.isPropertyAssignment(property) ||
      !ts.isStringLiteral(property.name) ||
      !ts.isStringLiteral(property.initializer)
    ) {
      throw new Error(`Expected literal keys and values in ${name}`);
    }
    const key = property.name.text;
    if (entries.has(key)) {
      throw new Error(`Duplicate translation key ${name}:${key}`);
    }
    entries.set(key, property.initializer.text);
  }
  return entries;
}

export function compactLocale(
  reference: Readonly<Record<string, string>>,
  localeSource: string,
  locale: 'en' | 'he',
): PackedLocale {
  const translated = entriesOf(localeSource, locale);
  const keys = Object.keys(reference);
  for (const key of keys) {
    if (!translated.has(key)) {
      throw new Error(`Missing translation key ${locale}:${key}`);
    }
  }
  for (const key of translated.keys()) {
    if (!Object.hasOwn(reference, key)) {
      throw new Error(`Extra translation key ${locale}:${key}`);
    }
  }
  const values = keys.map((key) => {
    const value = translated.get(key);
    if (value === undefined) {
      throw new Error(`Missing translation value ${locale}:${key}`);
    }
    return value;
  });
  return { keys, values };
}

export function compactLocales(): Plugin {
  let root = '';
  return {
    name: 'compact-translation-keys',
    apply: 'build',
    enforce: 'pre',
    configResolved(config) {
      root = config.root;
    },
    transform(source, id) {
      const file = normalizePath(id.split('?')[0] ?? '');
      const base = normalizePath(root).replace(/\/$/, '');
      const locale = (['ru', 'en', 'he'] as const).find(
        (item) => file === `${base}/src/i18n/${item}.ts`,
      );
      if (locale === undefined) {
        return null;
      }
      const { keys, values } =
        locale === 'ru'
          ? { keys: Object.keys(ru), values: Object.values(ru) }
          : compactLocale(ru, source, locale);
      // M7-16: the Russian keys travel inside the deflated payload too.
      const payload = locale === 'ru' ? [keys, values] : values;
      const packed = deflateSync(JSON.stringify(payload), {
        level: 9,
      }).toString('base64');
      const keySource =
        locale === 'ru'
          ? ''
          : "import { ru } from './ru';\nconst keys = Object.keys(ru);\n";
      const unpack =
        locale === 'ru'
          ? 'const [keys, values] = JSON.parse'
          : 'const values = JSON.parse';
      return {
        code: `${keySource}const bytes = Uint8Array.from(atob(${JSON.stringify(packed)}), character => character.charCodeAt(0));
${unpack}(await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate'))).text());
export const ${locale} = Object.fromEntries(keys.map((key, index) => [key, values[index]]));`,
        map: null,
      };
    },
  };
}
