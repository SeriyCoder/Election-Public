import { renderToString } from 'preact-render-to-string';
import { describe, expect, it } from 'vitest';
import { buildReport, type ResultReport } from '../../src/engine/report';
import { LOCALES, translator, type Locale } from '../../src/i18n';
import { en } from '../../src/i18n/en';
import { formatDecimal, formatInteger } from '../../src/i18n/format';
import { he } from '../../src/i18n/he';
import { ru } from '../../src/i18n/ru';
import { App } from '../../src/ui/App';
import { withDisplayNames } from '../../src/ui/names';
import { baselineInput } from '../../src/ui/presets';
import { ChartDetails } from '../../src/ui/Results';
import {
  createStore as createStoreWithLanguage,
  type AppState,
  type Store,
  type StoreOptions,
} from '../../src/ui/store';
import {
  groupInput,
  partyInput,
  rulesInput,
  scenarioInput,
  type Json,
} from '../engine/helpers/scenarios';

function createStore(
  initial: Partial<AppState> = {},
  options: StoreOptions = {},
) {
  return createStoreWithLanguage({ language: 'ru', ...initial }, options);
}

function render(store: Store): string {
  return renderToString(<App store={store} />);
}

function reportOf(store: Store): ResultReport {
  const { validation, result } = store.getDerived();
  if (!validation.ok || result === null) {
    throw new Error('expected a valid scenario');
  }
  const t = translator(store.getState().language);
  return buildReport(withDisplayNames(validation.scenario, t), result);
}

function attribute(html: string, name: string): string[] {
  return [...html.matchAll(new RegExp(`${name}="([^"]*)"`, 'g'))].map(
    (match) => match[1] ?? '',
  );
}

function escapeText(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/"/g, '&quot;');
}

function block(html: string, open: string, close: string): string {
  const match = new RegExp(
    `<[a-z]+\\b[^>]*${open}[^>]*>[\\s\\S]*?</${close}>`,
  ).exec(html);
  if (match === null) {
    throw new Error(`missing ${open}`);
  }
  return match[0];
}

function table(html: string, name: string): string {
  return block(html, `data-table="${name}"`, 'table');
}

function rowOf(html: string, key: string, id: string): string {
  return block(html, `${key}="${id}"`, 'tr');
}

function cell(row: string, name: string): string {
  return block(row, `data-cell="${name}"`, 'td');
}

/** A bar is a div whose segments are spans, so it ends at the first div close. */
function bar(html: string, kind: 'votes' | 'seats'): string {
  return block(html, `data-bar="${kind}"`, 'div');
}

function storeFor(input: Json, language: Locale = 'ru'): Store {
  return createStore({ input, language });
}

function noVotesStore(): Store {
  const input = baselineInput();
  const groups = (input.groups as Json[]).map((group) => ({
    ...group,
    turnout: '0',
  }));
  return storeFor({ ...input, groups });
}

function tieStore(): Store {
  return storeFor(
    scenarioInput({
      rules: rulesInput({ seatCount: 2 }),
      parties: ['P1', 'P2', 'P3', 'P4'].map((id, index) =>
        partyInput(id, null, index + 1),
      ),
      groups: ['P1', 'P2', 'P3', 'P4'].map((id, index) =>
        groupInput(`G${index + 1}`, '0.25', { [id]: '1' }),
      ),
    }),
  );
}

describe('results messages', () => {
  it('defines the result labels in the reference table', () => {
    const table = ru as Record<string, string>;
    for (const key of [
      'results.parties',
      'results.blocks',
      'results.hamilton',
      'results.votesBar',
      'results.seatsBar',
      'results.cutoffTie',
      'results.unassigned',
      'qualification.qualified',
      'qualification.below-threshold',
      'qualification.no-votes',
      'diagram.caption',
    ]) {
      expect(table[key], key).toMatch(/\S/);
    }
    expect(table['diagram.caption']).toContain('{seats}');
    expect(table['diagram.caption']).toContain('{majority}');
  });

  it('drops the seats placeholder from the tables', () => {
    expect(Object.keys(ru)).not.toContain('placeholder.seats');
  });
});

describe('results panel', () => {
  it('renders in the seats panel for a valid scenario', () => {
    const html = render(createStore({ view: 'seats' }));
    expect(attribute(html, 'data-results')).toEqual(['ready']);
  });

  it('stays beside the editor on the inputs view', () => {
    const html = render(createStore({ view: 'inputs' }));
    expect(attribute(html, 'data-results')).toEqual(['ready']);
  });

  it.each(['coalitions', 'compare'] as const)(
    'is absent on the %s view',
    (view) => {
      const html = render(createStore({ view }));
      expect(attribute(html, 'data-results')).toEqual([]);
    },
  );

  it('is absent while the scenario is invalid', () => {
    const store = createStore();
    store.setInput({ schemaVersion: 1 });
    const html = render(store);
    expect(attribute(html, 'data-results')).toEqual([]);
    expect(html).not.toContain('data-table=');
  });

  it('summarises totals and majority without a method row', () => {
    const store = createStore();
    const report = reportOf(store);
    const html = render(store);
    for (const key of [
      'population',
      'unavailable',
      'abstaining',
      'cast',
      'invalid',
      'valid',
      'turnout',
      'threshold',
    ] as const) {
      expect(block(html, `data-summary="${key}"`, 'dd')).toContain(
        formatDecimal('ru', report.totals[key]),
      );
    }
    expect(html).not.toContain('data-summary="method"');
    expect(Object.keys(ru)).not.toContain('summary.method');
    expect(Object.keys(ru)).not.toContain('rules.method');
    expect(Object.keys(ru)).not.toContain('rules.method.hamilton');
    expect(block(html, 'data-summary="majority"', 'dd')).toContain(
      formatInteger('ru', report.majority),
    );
    expect(block(html, 'data-summary="majority"', 'dd')).not.toContain(
      escapeText(translator('ru')('coalition.overridden')),
    );
    expect(html).not.toContain('data-majority-overridden');
  });

  it('counts 999 000 valid votes of a million at the standard rate', () => {
    const store = createStore();
    const { totals } = reportOf(store);
    expect([totals.cast, totals.invalid, totals.valid]).toEqual([
      '1000000',
      '1000',
      '999000',
    ]);
    expect(block(render(store), 'data-summary="valid"', 'dd')).toContain(
      formatDecimal('ru', '999000'),
    );
  });

  it('labels the population as the people with the right to vote', () => {
    expect(ru['summary.population']).toBe('Имеют право голоса');
    expect(ru['compare.total.population']).toBe('Имеют право голоса');
  });

  it.each(LOCALES)(
    'notes the invalid-ballot assumption under the summary in %s',
    (language) => {
      const html = render(storeFor(baselineInput(), language));
      const note = block(html, 'data-validity-note', 'p');
      const table = (
        { ru, en, he } as Record<Locale, Readonly<Record<string, string>>>
      )[language];
      expect(table['validity.note'], language).toMatch(/\S/);
      expect(note).toContain(escapeText(table['validity.note'] ?? ''));
    },
  );

  it('drops the note when a group has another valid-ballot rate', () => {
    const html = render(
      storeFor(
        scenarioInput({
          parties: [partyInput('P1', null, 1), partyInput('P2', null, 2)],
          groups: [
            groupInput(
              'G1',
              '0.5',
              { P1: '1', P2: '0' },
              { validBallotRate: '0.999' },
            ),
            groupInput(
              'G2',
              '0.5',
              { P1: '0', P2: '1' },
              { validBallotRate: '0.98' },
            ),
          ],
        }),
      ),
    );
    expect(attribute(html, 'data-results')).toEqual(['ready']);
    expect(html).not.toContain('data-validity-note');
  });

  it.each(LOCALES)('marks an overridden majority in %s', (language) => {
    const input = baselineInput();
    const rules = {
      ...(input.rules as Json),
      majorityMode: 'override',
      majorityOverride: 70,
    };
    const html = render(storeFor({ ...input, rules }, language));
    const value = block(html, 'data-summary="majority"', 'dd');
    expect(value).toContain(formatInteger(language, 70));
    expect(value).toContain('data-majority-overridden="true"');
    expect(value).toContain(
      escapeText(translator(language)('coalition.overridden')),
    );
  });
});

describe('party table', () => {
  it('lists parties in report order', () => {
    const store = createStore();
    const html = table(render(store), 'parties');
    expect(attribute(html, 'data-party')).toEqual(
      reportOf(store).parties.map((row) => row.partyId),
    );
  });

  it('shows votes, shares, status and seats per party', () => {
    const store = createStore();
    const t = translator('ru');
    const html = table(render(store), 'parties');
    for (const party of reportOf(store).parties) {
      const row = rowOf(html, 'data-party', party.partyId);
      expect(row).toContain(`<bdi>${escapeText(party.name)}</bdi>`);
      expect(cell(row, 'votes')).toContain(formatDecimal('ru', party.votes));
      expect(cell(row, 'voteShare')).toContain(
        formatDecimal('ru', party.voteShare ?? ''),
      );
      expect(cell(row, 'status')).toContain(`data-status="${party.status}"`);
      expect(cell(row, 'status')).toContain(
        escapeText(t(`qualification.${party.status}`)),
      );
      expect(cell(row, 'seats')).toContain(formatInteger('ru', party.seats));
      expect(cell(row, 'seatShare')).toContain(
        formatDecimal('ru', party.seatShare ?? ''),
      );
    }
  });

  it.each(LOCALES)('formats shares for %s', (locale: Locale) => {
    const store = createStore({ language: locale });
    const party = reportOf(store).parties[0]!;
    const row = rowOf(
      table(render(store), 'parties'),
      'data-party',
      party.partyId,
    );
    expect(cell(row, 'voteShare')).toContain(
      formatDecimal(locale, party.voteShare ?? ''),
    );
  });
});

describe('legacy blocks and Hamilton results', () => {
  it('hides the block table while retaining the engine report', () => {
    const store = createStore();
    expect(render(store)).not.toContain('data-table="blocks"');
    expect(reportOf(store).blocks.map((row) => row.blockId)).toEqual([
      'B1',
      'B2',
      'B3',
      'B4',
    ]);
  });

  it('shows quota, floor, remainder and the remainder seat', () => {
    const store = createStore();
    const html = table(render(store), 'hamilton');
    for (const party of reportOf(store).parties) {
      const row = rowOf(html, 'data-party', party.partyId);
      expect(cell(row, 'quota')).toContain(
        formatDecimal('ru', party.quota ?? ''),
      );
      expect(cell(row, 'floorSeats')).toContain(
        formatInteger('ru', party.floorSeats),
      );
      expect(cell(row, 'remainder')).toContain(
        formatDecimal('ru', party.remainder ?? ''),
      );
      expect(cell(row, 'remainderSeat')).toContain(
        `data-awarded="${party.remainderSeat ? 'true' : 'false'}"`,
      );
    }
  });
});

describe('bars', () => {
  it('draws vote and seat segments in report order with weights', () => {
    const store = createStore();
    const report = reportOf(store);
    const html = render(store);
    for (const [kind, segments] of [
      ['votes', report.voteSegments],
      ['seats', report.seatSegments],
    ] as const) {
      const markup = bar(html, kind);
      expect(attribute(markup, 'data-segment')).toEqual(
        segments.map((segment) => segment.partyId),
      );
      for (const segment of segments) {
        const tag = block(markup, `data-segment="${segment.partyId}"`, 'span');
        expect(tag).toContain(`flex-grow:${segment.weight}`);
        expect(tag).toContain(segment.color);
      }
    }
  });

  it('pairs every colored segment with a text legend entry', () => {
    const store = createStore();
    const html = render(store);
    const legend = block(html, 'data-legend="parties"', 'ul');
    for (const party of reportOf(store).parties) {
      expect(legend).toContain(`data-legend-party="${party.partyId}"`);
      expect(legend).toContain(escapeText(party.name));
    }
  });

  it('makes every legend entry a collapsed details toggle', () => {
    const store = createStore();
    const t = translator('ru');
    const legend = block(render(store), 'data-legend="parties"', 'ul');
    for (const party of reportOf(store).parties) {
      const button = block(
        legend,
        `data-select-party="${party.partyId}"`,
        'button',
      );
      expect(button).toMatch(/^<button\b/);
      expect(button).toContain('type="button"');
      expect(button).toContain('aria-expanded="false"');
      expect(button).toContain(
        `aria-label="${escapeText(t('legend.select', { name: party.name }))}"`,
      );
      expect(button).toContain(escapeText(party.name));
    }
  });

  it('starts with an empty polite details slot and nothing selected', () => {
    const html = render(createStore());
    const slot = block(html, 'data-details-slot', 'div');
    expect(slot).toContain('aria-live="polite"');
    expect(html).not.toContain('data-details=');
    expect(html).not.toContain('data-selected=');
  });
});

describe('chart details', () => {
  function details(
    store: Store,
    partyId: string,
    locale: Locale = 'ru',
  ): string {
    return renderToString(
      <ChartDetails
        report={reportOf(store)}
        partyId={partyId}
        locale={locale}
        t={translator(locale)}
        onClose={() => undefined}
      />,
    );
  }

  function text(markup: string): string {
    return markup.replace(/<[^>]*>/g, '');
  }

  function detail(markup: string, name: string): string {
    return text(block(markup, `data-detail="${name}"`, 'dd'));
  }

  it.each(LOCALES)(
    'shows the same values as the party table in %s',
    (locale: Locale) => {
      const store = storeFor(baselineInput(), locale);
      const html = render(store);
      const t = translator(locale);
      for (const party of reportOf(store).parties) {
        const markup = details(store, party.partyId, locale);
        const row = rowOf(table(html, 'parties'), 'data-party', party.partyId);
        const hamilton = rowOf(
          table(html, 'hamilton'),
          'data-party',
          party.partyId,
        );
        expect(markup).toContain(`data-details="${party.partyId}"`);
        expect(markup).toContain(
          escapeText(t('details.title', { name: party.name })),
        );
        for (const name of [
          'votes',
          'voteShare',
          'status',
          'seats',
          'seatShare',
        ]) {
          expect(detail(markup, name), name).toBe(text(cell(row, name)));
        }
        expect(detail(markup, 'quota')).toBe(text(cell(hamilton, 'quota')));
        expect(detail(markup, 'seats')).toBe(
          formatInteger(locale, party.seats),
        );
      }
    },
  );

  it('hides block details without changing stored assignments', () => {
    const assigned = createStore();
    expect(details(assigned, 'P1')).not.toContain('data-detail="block"');
    expect(
      reportOf(assigned).parties.find((row) => row.partyId === 'P1')?.blockId,
    ).toBe('B1');
    const input = baselineInput();
    const parties = (input.parties as Json[]).map((party) =>
      party.id === 'P1' ? { ...party, blockId: null } : party,
    );
    const loose = storeFor({ ...input, parties });
    expect(details(loose, 'P1')).not.toContain('data-detail="block"');
    expect(
      reportOf(loose).parties.find((row) => row.partyId === 'P1')?.blockId,
    ).toBeNull();
  });

  it('offers a labelled close button', () => {
    const t = translator('ru');
    const close = block(
      details(createStore(), 'P2'),
      'data-action="close-details"',
      'button',
    );
    expect(close).toContain('type="button"');
    expect(text(close)).toBe(t('details.close'));
  });

  it('keeps a hostile party name inert', () => {
    const input = baselineInput();
    const parties = (input.parties as Json[]).map((party) =>
      party.id === 'P1'
        ? { ...party, name: '<img src=x onerror=alert(1)><script>x</script>' }
        : party,
    );
    const markup = details(storeFor({ ...input, parties }), 'P1');
    expect(markup).not.toContain('<img');
    expect(markup).not.toContain('<script');
  });

  it('renders nothing for a party that is not in the report', () => {
    expect(details(createStore(), 'P9')).toBe('');
  });

  it('defines its labels in every locale', () => {
    for (const locale of LOCALES) {
      const t = translator(locale);
      expect(t('details.title', { name: 'X' })).toContain('X');
      expect(t('legend.select', { name: 'X' })).toContain('X');
      expect(t('details.close')).toMatch(/\S/);
      expect(t('details.block')).toMatch(/\S/);
    }
    expect((ru as Record<string, string>)['details.close']).toBeDefined();
  });
});

describe('seat diagram', () => {
  it('draws one seat per seat in sequence order', () => {
    const store = createStore();
    const report = reportOf(store);
    const html = render(store);
    expect(attribute(html, 'data-seat')).toEqual([...report.seatSequence]);
  });

  it('marks the majority seat once', () => {
    const store = createStore();
    const report = reportOf(store);
    const html = render(store);
    const seats = [
      ...html.matchAll(/<span\b[^>]*data-seat="[^"]*"[^>]*>/g),
    ].map((match) => match[0]);
    const marked = seats
      .map((seat, index) => (seat.includes('data-majority-seat') ? index : -1))
      .filter((index) => index >= 0);
    expect(marked).toEqual([report.majority - 1]);
  });

  it('is an image with a text caption', () => {
    const store = createStore();
    const report = reportOf(store);
    const t = translator('ru');
    const caption = t('diagram.caption', {
      seats: report.seatCount,
      majority: report.majority,
    });
    const diagram = block(render(store), 'data-diagram="seats"', 'div');
    expect(diagram).toContain('role="img"');
    expect(diagram).toContain(`aria-label="${escapeText(caption)}"`);
  });

  it('is the same seat sequence in every language', () => {
    const sequences = LOCALES.map((language) =>
      attribute(render(createStore({ language })), 'data-seat'),
    );
    expect(sequences[1]).toEqual(sequences[0]);
    expect(sequences[2]).toEqual(sequences[0]);
  });
});

describe('special states', () => {
  it('shows votes but no seats when nothing is allocated', () => {
    const html = render(noVotesStore());
    expect(attribute(html, 'data-results')).toEqual(['no-allocation']);
    expect(html).toContain('data-table="parties"');
    expect(html).not.toContain('data-cell="seats"');
    expect(html).not.toContain('data-table="hamilton"');
    expect(html).not.toContain('data-bar=');
    expect(html).not.toContain('data-diagram=');
    expect(html).not.toContain('data-select-party=');
    expect(html).not.toContain('data-details-slot');
  });

  it('calls out a cut-off tie', () => {
    const t = translator('ru');
    const html = render(tieStore());
    expect(block(html, 'data-note="cutoff-tie"', 'p')).toContain(
      escapeText(t('results.cutoffTie')),
    );
  });

  it('has no cut-off note without a tie', () => {
    expect(render(createStore())).not.toContain('data-note="cutoff-tie"');
  });
});
