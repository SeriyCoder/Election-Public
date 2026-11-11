import { describe, expect, it } from 'vitest';
import { render } from 'preact-render-to-string';
import { App } from '../../src/ui/App';
import { createStore, type Store } from '../../src/ui/store';
import { LOCALES, translator } from '../../src/i18n';
import { ru } from '../../src/i18n/ru';
import { workspaceLinked, workspaceParties } from '../engine/helpers/workspace';
import type { Json } from '../engine/helpers/scenarios';

type Language = (typeof LOCALES)[number];
type View = 'coalitions' | 'future';

const word = (key: string) =>
  (ru as Readonly<Record<string, string>>)[key] ?? `missing:${key}`;

/**
 * Three parties with known two-group compositions, so the projected year
 * exists. The bare party fixture has no groups and its projection is
 * unavailable (unknown party composition).
 */
function workspaceGrowing(): Json {
  const input = workspaceParties();
  input.groups = ['G1', 'G2'].map((id) => ({
    id,
    name: id,
    notes: '',
    turnout: '0.6',
    growthRate: id === 'G1' ? '0.03' : '0',
    turnoutChange: '0',
  }));
  const shares = [
    ['4', '1'],
    ['1', '4'],
    ['1', '1'],
  ];
  (input.parties as Json[]).forEach((party, index) => {
    const [first, second] = shares[index]!;
    const total = `${Number(first) + Number(second)}`;
    party.composition = {
      G1: { numerator: first!, denominator: total },
      G2: { numerator: second!, denominator: total },
    };
  });
  return input;
}

function store(
  view: View,
  input: Json = workspaceLinked(),
  language: Language = 'ru',
) {
  return createStore({ input, language, screen: 'app', view });
}

function html(target: Store) {
  return render(<App store={target} />);
}

function count(text: string, pattern: RegExp) {
  return [...text.matchAll(new RegExp(pattern.source, 'g'))].length;
}

/** The opening tag that carries `marker`. */
function tag(text: string, marker: string) {
  const at = text.indexOf(marker);
  if (at < 0) return '';
  return text.slice(text.lastIndexOf('<', at), text.indexOf('>', at) + 1);
}

/** The text from the opening tag carrying `marker` to its matching close. */
function element(text: string, marker: string) {
  const at = text.indexOf(marker);
  if (at < 0) return '';
  const start = text.lastIndexOf('<', at);
  const name = /^<([a-z0-9]+)/.exec(text.slice(start))![1]!;
  const pattern = new RegExp(`<${name}[\\s>]|</${name}>`, 'g');
  pattern.lastIndex = start + 1;
  let depth = 1;
  for (let match = pattern.exec(text); match; match = pattern.exec(text)) {
    depth += match[0].startsWith('</') ? -1 : 1;
    if (depth === 0) return text.slice(start, match.index + match[0].length);
  }
  return text.slice(start);
}

function keys(text: string, attribute: string) {
  return [...text.matchAll(new RegExp(`${attribute}="([^"]+)"`, 'g'))].map(
    (match) => match[1],
  );
}

describe('M7-17 Demographic Future tab like the prototype', () => {
  it.each(LOCALES)(
    'lays out timeline, growth card and four cards in %s',
    (language) => {
      const page = html(store('future', workspaceGrowing(), language));
      const t = translator(language);
      expect(tag(page, 'data-region="future"')).not.toContain('region--editor');
      const timeline = element(page, 'class="ws-timeline');
      expect(timeline).toContain('data-action="future-start"');
      expect(timeline).toContain('data-action="future-play"');
      expect(timeline).toContain('data-future-speed');
      expect(timeline).toContain('data-future-slider');
      expect(element(page, 'data-growth-card')).toContain(
        t('panel.growthTitle'),
      );
      const cards = element(page, 'data-future-cards');
      expect(cards).toContain(t('panel.sameCoalitions'));
      expect(count(cards, /data-future-card="/)).toBe(4);
      expect(count(cards, /class="ws-fcard"/)).toBe(4);
      expect(count(cards, /data-future-card-select/)).toBe(4);
      expect(count(cards, /class="ws-ring"/)).toBe(8);
      expect(cards).not.toContain(t('futureCoalitions.empty'));
      expect(page).not.toContain('undefined');
      expect(page).not.toContain('NaN');
    },
  );

  it('shows the same four sets as the Coalitions tab tiles by default', () => {
    const tiles = keys(
      html(store('coalitions', workspaceParties())),
      'data-coalition-tile',
    );
    const cards = keys(
      html(store('future', workspaceParties())),
      'data-future-card',
    );
    expect(tiles).toHaveLength(4);
    expect(cards).toEqual(tiles);
  });

  it('follows an edited tile set on the future cards', () => {
    const target = store('future', workspaceParties());
    target.setPanelSession({ tiles: ['P1+P3', 'P2+P3'] });
    const cards = element(html(target), 'data-future-cards');
    expect(keys(cards, 'data-future-card')).toEqual(['P1+P3', 'P2+P3']);
    expect(cards).toContain('data-action="future-card-add"');
  });

  it('draws each card with a centre count over the seat total, a majority tick and a legend', () => {
    const cards = element(
      html(store('future', workspaceGrowing())),
      'data-future-cards',
    );
    const first = element(cards, 'data-future-card="');
    expect(first).toMatch(
      /class="ws-ring-centre"[^>]*>\d+<small>\/ 101<\/small>/,
    );
    expect(count(first, /class="ws-ring-tick"/)).toBe(2);
    expect(first).toMatch(/conic-gradient\(/);
    expect(first).toContain('data-future-card-change');
    expect(first).toMatch(/data-future-card-party="P\d"[^>]*>[\s\S]*?\d+→\d+/);
    expect(first).toMatch(
      new RegExp(
        `${word('panel.majorityYes')}|${word('panel.shortBy').replace('{count}', '\\d+')}`,
      ),
    );
  });

  it('keeps year 0 and names the reason when the projected year is unavailable', () => {
    const cards = element(
      html(store('future', workspaceParties())),
      'data-future-cards',
    );
    expect(count(cards, /data-future-card="/)).toBe(4);
    expect(count(cards, /class="ws-ring"/)).toBe(4);
    expect(cards).toContain(
      'data-cards-unavailable="unknown-party-composition"',
    );
    expect(cards).not.toMatch(
      /data-future-card-party="P\d"[^>]*>[\s\S]*?\d+→\d+/,
    );
  });

  it('shows the summary strip with turnout, majority and threshold', () => {
    const page = html(store('future', workspaceParties()));
    const summary = element(page, 'data-future-summary');
    expect(summary).toContain(word('panel.overallTurnout'));
    expect(summary).toContain(
      word('panel.majorityOf')
        .replace('{count}', '51')
        .replace('{seats}', '101'),
    );
    expect(summary).toContain(
      word('panel.thresholdLine').replace('{value}', '0'),
    );
  });

  it('keeps the growth card controls: rates, share change, scale, reset and the trend chart', () => {
    const page = html(store('future'));
    const card = element(page, 'data-growth-card');
    expect(count(card, /class="ws-rate-row"/)).toBe(2);
    expect(card).toContain(word('panel.pp'));
    expect(card).toContain(word('panel.fromStart'));
    expect(card).toContain('data-action="growth-source"');
    expect(card).toContain(word('panel.growthSource'));
    const chart = tag(card, 'data-population-series');
    expect(chart).toContain('viewBox="0 0 420 118"');
    expect(card).toContain('data-year-marker');
  });

  it('moves the detailed tables and the chooser into a closed disclosure', () => {
    const page = html(store('future'));
    const details = tag(page, 'data-future-details');
    expect(details.startsWith('<details')).toBe(true);
    expect(details).not.toMatch(/\sopen[\s=>]/);
    expect(element(page, 'data-future-details')).toContain(
      word('futureCoalitions.empty'),
    );
  });
});

describe('M7-17 Coalitions tab like the prototype', () => {
  it.each(LOCALES)(
    'enters supporter turnout as a coefficient in %s',
    (language) => {
      const page = html(store('coalitions', workspaceLinked(), language));
      const t = translator(language);
      expect(count(page, /data-supporter-coef="/)).toBe(2);
      expect(tag(page, 'data-supporter-coef="P1"')).toContain('value="0.00"');
      expect(count(page, /data-supporter-nudge="P1"/)).toBe(2);
      expect(tag(page, 'data-supporter-range="P1"')).toMatch(
        /min="-1"[^>]*max="1"[^>]*step="0.05"/,
      );
      expect(page).toContain(t('panel.coefLegend'));
      expect(page).toContain(t('panel.resetTurnout'));
      expect(element(page, 'data-supporter-result="P1"')).toMatch(/60[.,]0/);
      expect(page).not.toContain('data-supporter-target=');
    },
  );

  it('shows every relation of the chosen party at once with arrows and no pager', () => {
    const page = html(store('coalitions', workspaceParties()));
    const rules = element(page, 'data-panel-relations');
    expect(rules).toContain(word('panel.rulesTitle'));
    expect(rules).toContain('data-action="rules-previous"');
    expect(rules).toContain('data-action="rules-next"');
    expect(rules).toContain('data-rules-party');
    expect(rules).not.toContain('directed-relations__pages');
    expect(tag(rules, 'class="ws-rule-list"')).toBeTruthy();
    expect(count(rules, /class="ws-rule-row"/)).toBe(2);
    expect(rules).toContain('data-action="rules-source"');
  });

  it('gathers the old sections under one closed "more" area', () => {
    const page = html(store('coalitions', workspaceParties()));
    const more = element(page, 'data-workspace-more');
    expect(more).toContain(word('panel.more'));
    const results = tag(more, 'data-coalition-results');
    expect(results.startsWith('<details')).toBe(true);
    expect(results).not.toMatch(/\sopen[\s=>]/);
    expect(element(more, 'data-coalition-results')).toContain(
      'data-panel="coalitions"',
    );
    expect(count(page, /data-panel="coalitions"/)).toBe(1);
    expect(more).toContain('data-workspace-compare');
    expect(more).toContain('data-workspace-history');
  });
});
