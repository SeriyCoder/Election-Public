import { inflateSync } from 'node:zlib';
import { describe, expect, it, vi } from 'vitest';
import { build, type Plugin } from 'vite';
import { PACKED_STYLES_TOKEN, packInlineStyles } from '../../build/packStyles';

const CSS =
  ".a{color:#123}.b::before{content:'\\2192 → א'}@media (max-width:600px){.c{gap:1px}}";

function page(styles: readonly string[], tokens: number): string {
  return [
    '<!doctype html><html><head><meta charset="utf-8" />',
    '<script type="module">',
    Array.from(
      { length: tokens },
      () => `const s=${JSON.stringify(PACKED_STYLES_TOKEN)};`,
    ).join(''),
    '</script>',
    ...styles.map(
      (css) => `<style rel="stylesheet" crossorigin>${css}</style>`,
    ),
    '</head><body><div id="app"></div></body></html>',
  ].join('');
}

function inflate(packed: string): string {
  return inflateSync(Buffer.from(packed, 'base64')).toString('utf8');
}

describe('M7-14 build-time stylesheet packing', () => {
  it('replaces the one inlined style with lossless DEFLATE base64', () => {
    const result = packInlineStyles(page([CSS], 1));
    expect(result.css).toBe(CSS);
    expect(result.packed).toMatch(/^[A-Za-z0-9+/]+=*$/);
    expect(inflate(result.packed)).toBe(CSS);
    expect(result.html).not.toMatch(/<style\b/i);
    expect(result.html).not.toContain(PACKED_STYLES_TOKEN);
    expect(result.html).toContain(JSON.stringify(result.packed));
    expect(result.html).toContain('<div id="app"></div>');
  });

  it.each([
    ['no inlined style', page([], 1), /style/i],
    ['two inlined styles', page([CSS, CSS], 1), /style/i],
    ['no token', page([CSS], 0), /token/i],
    ['two tokens', page([CSS], 2), /token/i],
  ])('fails explicitly with %s', (_name, html, error) => {
    expect(() => packInlineStyles(html)).toThrow(error);
  });

  it('ships exactly the stylesheet Vite produced, packed', async () => {
    const assets: string[] = [];
    const recorder: Plugin = {
      name: 'record-css-assets',
      apply: 'build',
      // Normal-order hook of a post plugin: after Vite emits the stylesheet,
      // before vite-plugin-singlefile inlines and deletes it (order 'post').
      enforce: 'post',
      generateBundle(_options, bundle) {
        for (const item of Object.values(bundle)) {
          if (item.type === 'asset' && item.fileName.endsWith('.css')) {
            assets.push(String(item.source));
          }
        }
      },
    };
    vi.stubEnv('NODE_ENV', 'production');
    let built: unknown;
    try {
      built = await build({
        logLevel: 'silent',
        build: { write: false },
        plugins: [recorder],
      });
    } finally {
      vi.unstubAllEnvs();
    }
    const outputs = (Array.isArray(built) ? built : [built]).flatMap(
      (result: unknown) =>
        typeof result === 'object' &&
        result !== null &&
        'output' in result &&
        Array.isArray(result.output)
          ? (result.output as { fileName: string; source?: unknown }[])
          : [],
    );
    const html = String(
      outputs.find((item) => item.fileName === 'elections.html')?.source ?? '',
    );
    expect(assets).toHaveLength(1);
    const css = assets[0]!;
    expect(css.length).toBeGreaterThan(1000);
    expect(html).not.toMatch(/<style\b/i);
    expect(html).not.toContain(PACKED_STYLES_TOKEN);
    const packed = [...html.matchAll(/["'`]([A-Za-z0-9+/]{2000,}=*)["'`]/g)]
      .map((match) => match[1]!)
      .filter((candidate) => {
        try {
          return inflate(candidate) === css;
        } catch {
          return false;
        }
      });
    expect(packed).toHaveLength(1);
  }, 120_000);
});
