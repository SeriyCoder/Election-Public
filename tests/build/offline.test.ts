import { build } from 'vite';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { OFFLINE_FILE_NAME } from '../../vite.config';

interface Emitted {
  readonly fileName: string;
  readonly text: string;
}

/** Namespace identifiers the renderer compares against; never fetched. */
const NAMESPACE_URIS = [
  'http://www.w3.org/2000/svg',
  'http://www.w3.org/1998/Math/MathML',
  'http://www.w3.org/1999/xhtml',
];

const EXPECTED_POLICY: Readonly<Record<string, string>> = {
  'default-src': "'none'",
  'script-src': "'self' 'unsafe-inline'",
  'style-src': "'unsafe-inline'",
  'worker-src': 'blob: data:',
  'img-src': 'data:',
  'connect-src': "'none'",
};

const SIZE_BUDGET_BYTES = 450 * 1024;

function outputsOf(result: unknown): Emitted[] {
  const list = Array.isArray(result) ? result : [result];
  return list.flatMap((entry: unknown) => {
    if (typeof entry !== 'object' || entry === null || !('output' in entry)) {
      throw new Error('expected an in-memory build result');
    }
    return (entry as { output: unknown[] }).output.map((item) => {
      const file = item as {
        fileName: string;
        source?: string | Uint8Array;
        code?: string;
      };
      const body = file.code ?? file.source ?? '';
      return {
        fileName: file.fileName,
        text: typeof body === 'string' ? body : new TextDecoder().decode(body),
      };
    });
  });
}

function policyOf(html: string): Record<string, string> {
  const meta =
    /<meta\s+http-equiv="Content-Security-Policy"\s+content="([^"]*)"/i.exec(
      html,
    );
  if (meta === null) {
    return {};
  }
  return Object.fromEntries(
    meta[1]!
      .split(';')
      .map((part) => part.trim())
      .filter((part) => part !== '')
      .map((part) => {
        const [name, ...values] = part.split(/\s+/);
        return [name!, values.join(' ')];
      }),
  );
}

let files: Emitted[] = [];
let html = '';

beforeAll(async () => {
  // Measure the file that ships: Vitest's NODE_ENV=test would add JSX debug data.
  vi.stubEnv('NODE_ENV', 'production');
  try {
    files = outputsOf(
      await build({ logLevel: 'silent', build: { write: false } }),
    );
  } finally {
    vi.unstubAllEnvs();
  }
  html = files.find((file) => file.fileName.endsWith('.html'))?.text ?? '';
}, 120_000);

describe('offline single-file build', () => {
  it('is named elections.html', () => {
    expect(OFFLINE_FILE_NAME).toBe('elections.html');
  });

  it('emits exactly one file', () => {
    expect(files.map((file) => file.fileName)).toEqual([OFFLINE_FILE_NAME]);
  });

  it('declares UTF-8 before anything that needs it', () => {
    expect(html).toMatch(/^<!doctype html>/i);
    expect(html.indexOf('<meta charset="utf-8"')).toBeGreaterThan(0);
    expect(html.indexOf('<meta charset="utf-8"')).toBeLessThan(
      html.indexOf('<title>'),
    );
  });

  it('inlines the application as one module script', () => {
    const scripts = [...html.matchAll(/<script\b[^>]*>/g)].map(
      (match) => match[0],
    );
    expect(scripts).toHaveLength(1);
    expect(scripts[0]).toContain('type="module"');
    expect(scripts[0]).not.toMatch(/\ssrc=/);
  });

  it('references no external file', () => {
    expect(html).not.toMatch(
      /<(script|link|img|iframe|source|audio|video|embed|object)\b[^>]*\s(src|href|data)=/i,
    );
    for (const match of html.matchAll(/url\(\s*['"]?([^'")\s]*)/g)) {
      expect(match[1]).toMatch(/^(data:|#|$)/);
    }
  });

  it('contains no web address except namespace identifiers', () => {
    const urls = [...html.matchAll(/https?:\/\/[^\s"'`)<>\\]+/g)].map(
      (match) => match[0],
    );
    expect(urls.filter((url) => !NAMESPACE_URIS.includes(url))).toEqual([]);
  });

  it.each([
    ['fetch', /\bfetch\(/],
    ['XMLHttpRequest', /\bXMLHttpRequest\b/],
    ['WebSocket', /\bWebSocket\b/],
    ['EventSource', /\bEventSource\b/],
    ['sendBeacon', /\bsendBeacon\b/],
    ['dynamic import', /\bimport\(/],
  ])('calls no network API: %s', (_name, pattern) => {
    expect(html).not.toMatch(pattern);
  });

  it('carries the coalition worker inline', () => {
    expect(html).toContain('new Worker(');
    expect(html).toContain('data:text/javascript');
  });

  it('forbids every network connection through its content policy', () => {
    expect(policyOf(html)).toEqual(EXPECTED_POLICY);
  });

  it(`stays within ${SIZE_BUDGET_BYTES / 1024} kB`, () => {
    const bytes = new TextEncoder().encode(html).length;
    expect(bytes).toBeGreaterThan(0);
    expect(bytes).toBeLessThanOrEqual(SIZE_BUDGET_BYTES);
  });
});
