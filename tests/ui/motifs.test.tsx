import { renderToString } from 'preact-render-to-string';
import { describe, expect, it } from 'vitest';
import { PALETTE } from '../../src/engine/edit';
import type { Motif } from '../../src/ui/book';
import { MOTIF_NAMES, MotifArt, Palms } from '../../src/ui/motifs';

const ALL: readonly Motif[] = [
  'menorah',
  'ballots',
  'people',
  'pie',
  'ballot-box',
  'calendar',
  'knesset',
  'threshold',
  'table',
  'coin',
];

/** Markup a decorative drawing must never carry. */
const FORBIDDEN: readonly [string, RegExp][] = [
  ['text element', /<text\b/],
  ['image element', /<image\b/],
  ['foreign object', /<foreignObject\b/i],
  ['script', /<script\b/],
  ['style element', /<style\b/],
  ['link', /<a\b/],
  ['reference', /\bhref=/],
  ['url', /url\(/],
  ['event handler', /\son[a-z]+=/],
  ['focusable element', /tabindex=/],
  ['title', /<title\b/],
];

function decorative(html: string, label: string): void {
  expect(html, label).toMatch(/^<svg\b/);
  const root = /^<svg\b[^>]*>/.exec(html)?.[0] ?? '';
  expect(root, label).toMatch(/\sviewBox="0 0 \d+ \d+"/);
  expect(root, label).toMatch(/\saria-hidden="true"/);
  expect(root, label).toMatch(/\sfocusable="false"/);
  expect(root, label).not.toMatch(/\srole=/);
  for (const [name, pattern] of FORBIDDEN) {
    expect(html, `${label}: ${name}`).not.toMatch(pattern);
  }
  expect(html.replace(/<[^>]*>/g, '').trim(), `${label}: text`).toBe('');
  for (const colour of PALETTE) {
    expect(
      html.toLowerCase(),
      `${label}: party colour ${colour}`,
    ).not.toContain(colour.toLowerCase());
  }
}

describe('motifs', () => {
  it('has one drawing for every motif a page can name', () => {
    expect([...MOTIF_NAMES].sort()).toEqual([...ALL].sort());
  });

  it.each(ALL)(
    'draws %s as a decorative inline picture without text',
    (name) => {
      const html = renderToString(<MotifArt name={name} />);
      decorative(html, name);
      expect(html).toMatch(new RegExp(`^<svg\\b[^>]*data-art="${name}"`));
      expect(html).toMatch(/^<svg\b[^>]*class="motif motif--[a-z-]+"/);
      expect(renderToString(<MotifArt name={name} />)).toBe(html);
    },
  );

  it('draws the two sides of the one-shekel coin', () => {
    const html = renderToString(<MotifArt name="coin" />);
    expect([...html.matchAll(/data-side="lily"/g)]).toHaveLength(1);
    expect([...html.matchAll(/data-side="one"/g)]).toHaveLength(1);
  });

  it('draws two palms as a decorative frame', () => {
    const html = renderToString(<Palms />);
    decorative(html, 'palms');
    expect(html).toMatch(/^<svg\b[^>]*data-palms/);
    expect(
      [...html.matchAll(/data-palm="(start|end)"/g)].map((m) => m[1]),
    ).toEqual(['start', 'end']);
  });

  it('gives every drawing a different picture', () => {
    const drawings = ALL.map((name) =>
      renderToString(<MotifArt name={name} />).replace(/^<svg\b[^>]*>/, ''),
    );
    expect(new Set(drawings).size).toBe(ALL.length);
  });
});
