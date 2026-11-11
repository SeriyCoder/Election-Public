import { describe, expect, it } from 'vitest';
import { render } from 'preact-render-to-string';
import { App } from '../../src/ui/App';
import { createStore, type Store } from '../../src/ui/store';
import { editPanelCell } from '../../src/engine/panel';
import { isDraft } from '../../src/engine/edit';
import { LOCALES } from '../../src/i18n';
import { ru } from '../../src/i18n/ru';
import { workspaceLinked, workspaceParties } from '../engine/helpers/workspace';

type Language = (typeof LOCALES)[number];

const word = (key: string) =>
  (ru as Readonly<Record<string, string>>)[key] ?? `missing:${key}`;

function store(view: 'coalitions' | 'future', language: Language = 'ru') {
  return createStore({
    input: workspaceLinked(),
    language,
    screen: 'app',
    view,
  });
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

function unbalanced() {
  const target = store('coalitions');
  const input = target.getState().input;
  if (!isDraft(input)) throw new Error('expected a draft');
  expect(target.applyPanelEdit(editPanelCell(input, 'P1', null, '60.25'))).toBe(
    true,
  );
  return target;
}

describe('M7-14 prototype-faithful Coalitions tab', () => {
  it.each(LOCALES)(
    'lays out the prototype grid and cards in %s',
    (language) => {
      const page = html(store('coalitions', language));
      expect(page).toContain('class="ws"');
      expect(count(page, /class="ws-card[ "]/)).toBeGreaterThanOrEqual(4);
      expect(page).not.toContain('undefined');
      expect(page).not.toContain('NaN');
    },
  );

  it('shows the two summary tiles with an agreed badge and turnout base → now', () => {
    const page = html(store('coalitions'));
    expect(count(page, /class="ws-metric"/)).toBe(2);
    const badge = tag(page, 'data-good=');
    expect(badge).toContain('ws-badge');
    expect(badge).toContain('data-good="true"');
    expect(page).toContain(word('panel.agreed'));
    expect(page).toContain(word('panel.shareSum'));
    expect(page).toContain(word('panel.turnoutNow'));
    expect(page).toMatch(
      /data-panel-turnout-summary[^>]*>[^<]*60[^<]*→[^<]*60/,
    );
  });

  it('turns the badge and the align button red when the sum is off', () => {
    const page = html(unbalanced());
    expect(tag(page, 'data-good=')).toContain('data-good="false"');
    expect(page).toContain(word('panel.notHundred'));
    const align = tag(page, 'data-action="panel-align"');
    expect(align).toContain('ws-align');
    expect(align).toContain('data-attention="true"');
    expect(
      tag(html(store('coalitions')), 'data-action="panel-align"'),
    ).toContain('data-attention="false"');
  });

  it('gives every party a styled vertical card with bars, number, steppers and lock', () => {
    const page = html(store('coalitions'));
    expect(tag(page, 'class="ws-cards"')).toContain('--party-count:2');
    for (const id of ['P1', 'P2']) {
      expect(page).toContain(`data-party-card="${id}"`);
      expect(tag(page, `data-panel-share="${id}"`)).toContain('ws-number');
      expect(tag(page, `data-nudge="${id}:-"`)).toContain('ws-nudge');
      expect(tag(page, `data-nudge="${id}:+"`)).toContain('ws-nudge');
      const lock = tag(page, `data-lock-vote="${id}"`);
      expect(lock).toContain('ws-lock');
      expect(lock).toContain('aria-pressed="false"');
    }
    expect(count(page, /class="ws-plot"/)).toBeGreaterThanOrEqual(4);
    expect(count(page, /data-fill="base"/)).toBeGreaterThanOrEqual(4);
    expect(count(page, /data-fill="now"/)).toBeGreaterThanOrEqual(4);
    expect(count(page, /class="ws-range"/)).toBeGreaterThanOrEqual(4);
    expect(page).toContain(word('panel.beforeTurnout'));
    expect(page).toContain(word('panel.now'));
  });

  it('shows the composition mix bar, group cards, cell locks and one turnout link per group', () => {
    const page = html(store('coalitions'));
    expect(page).toContain('class="ws-mix-bar"');
    expect(count(page, /class="ws-group-card"/)).toBe(2);
    expect(count(page, /class="ws-gauge"/)).toBe(2);
    for (const id of ['G1', 'G2']) {
      expect(count(page, new RegExp(`data-open-turnout="${id}"`))).toBe(1);
      expect(tag(page, `data-lock-cell="P1:${id}"`)).toContain('ws-lock');
    }
    expect(tag(page, 'data-action="panel-smooth"')).toContain('ws-align');
  });

  it('shows two population pies and per-group pies with hoverable slices', () => {
    const page = html(store('coalitions'));
    expect(count(page, /data-population-pie="/)).toBe(2);
    expect(page).not.toContain('class="ws-bar-row"');
    expect(count(page, /data-slice="P1"/)).toBe(2);
    expect(count(page, /data-slice="G1"/)).toBe(2);
    expect(count(page, /class="ws-group-pie"/)).toBe(2);
    expect(page).toContain(word('panel.byGroup'));
  });

  it('renders coalition tiles with a badge, a mini bar and a majority mark', () => {
    const target = createStore({
      input: workspaceParties(),
      language: 'ru',
      screen: 'app',
      view: 'coalitions',
    });
    const page = html(target);
    expect(count(page, /data-coalition-tile="/)).toBe(4);
    expect(count(page, /class="ws-tile-badge"/)).toBe(4);
    expect(count(page, /class="ws-mini-bar"/)).toBe(4);
    expect(count(page, /class="ws-majority-mark"/)).toBe(4);
    expect(tag(page, 'data-coalition-tile="')).toContain('ws-tile');
  });

  it('lists a custom set equal to a numbered or earlier custom set only once', () => {
    const target = createStore({
      input: workspaceParties(),
      language: 'ru',
      screen: 'app',
      view: 'coalitions',
    });
    const first = /data-coalition-tile="([^"]+)"/.exec(html(target))![1]!;
    const parties = first.split('+');
    target.setPanelSession({
      nextCustom: 4,
      custom: [
        { key: 'custom:1', partyIds: [...parties].reverse(), label: 'Своя А' },
        { key: 'custom:2', partyIds: ['P1'], label: 'Своя Б' },
        { key: 'custom:3', partyIds: ['P1'], label: 'Своя В' },
      ],
      tiles: ['custom:1', first, 'custom:3'],
    });
    const page = html(target);
    expect(count(page, new RegExp(`data-coalition-tile="${first}"`))).toBe(1);
    expect(count(page, /data-coalition-tile="/)).toBe(2);
    expect(page).not.toContain('custom:1');
    expect(page).not.toContain('custom:3');
    expect(page).not.toContain('Своя А');
    expect(page).not.toContain('Своя В');
  });

  it('draws directed rules as strips with two ends and a line', () => {
    const page = html(store('coalitions'));
    expect(count(page, /class="ws-rule-row"/)).toBe(1);
    expect(tag(page, 'data-refusal="P1:P2"')).toContain('ws-rule-end');
    expect(tag(page, 'data-refusal="P2:P1"')).toContain('ws-rule-end');
    expect(tag(page, 'class="ws-rule-line"')).toContain('data-refused="false"');
  });
});

describe('M7-14 prototype-faithful Demographic Future tab', () => {
  it.each(LOCALES)(
    'shows the timeline card and growth rows in %s',
    (language) => {
      const page = html(store('future', language));
      const timeline = page.slice(page.indexOf('class="ws-timeline"'));
      expect(page).toContain('class="ws-timeline"');
      expect(timeline).toContain('data-action="future-start"');
      expect(timeline).toContain('data-action="future-play"');
      expect(timeline).toContain('data-future-speed');
      expect(count(page, /class="ws-rate-row"/)).toBe(2);
      expect(page).not.toContain('undefined');
    },
  );

  it('shows year 0 and year k donuts side by side for a followed coalition', () => {
    const target = store('future');
    target.toggleFutureCoalition(['P1']);
    const page = html(target);
    expect(tag(page, 'data-future-coalition="P1"')).toContain('ws-future-tile');
    expect(count(page, /class="ws-donut"/)).toBe(2);
    expect(page).toContain('class="ws-pie-pair"');
    expect(page).toContain(word('panel.sameCoalitions'));
    expect(page).toContain(word('panel.growthTitle'));
  });
});
