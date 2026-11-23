import { render } from 'preact-render-to-string';
import { describe, expect, it } from 'vitest';
import { LOCALES, translator } from '../../src/i18n';
import { App } from '../../src/ui/App';
import { createStore } from '../../src/ui/store';
import { workspaceParties } from '../engine/helpers/workspace';

function coalitionHtml(language: 'ru' | 'en' | 'he' = 'ru'): string {
  return render(
    <App
      store={createStore({
        input: workspaceParties(),
        screen: 'app',
        view: 'coalitions',
        language,
      })}
    />,
  );
}

function futureHtml(language: 'ru' | 'en' | 'he' = 'ru'): string {
  return render(
    <App
      store={createStore({
        input: workspaceParties(),
        screen: 'app',
        view: 'future',
        language,
      })}
    />,
  );
}

describe('M7-21 coalition hierarchy', () => {
  it('puts possible coalitions before group votes in the right column', () => {
    const html = coalitionHtml();
    const coalitions = html.indexOf('data-panel-coalitions');
    const groupVotes = html.indexOf('data-panel-box="pies"');
    const population = html.indexOf('data-panel-box="population"');
    expect(coalitions).toBeGreaterThan(-1);
    expect(groupVotes).toBeGreaterThan(coalitions);
    expect(population).toBeGreaterThan(groupVotes);
  });

  it.each(LOCALES)(
    'shows a labelled enlarge action and fixed-agenda model card in %s',
    (locale) => {
      const coalition = coalitionHtml(locale);
      expect(coalition).toContain('data-action="tile-enlarge"');
      expect(coalition).toContain('data-action="tiles-expand"');
      expect(coalition).not.toContain('data-action="tiles-nearest"');
      expect(coalition).toContain('ws-open-simulator');
      expect(coalition).not.toContain('>panel.enlarge<');
      const future = futureHtml(locale);
      expect(future).toContain('data-future-model-card');
      expect(future).toContain(translator(locale)('panel.modelTitle'));
      const model = future.match(
        /<section\b[^>]*data-future-model-card[^>]*>[\s\S]*?<\/section>/,
      )?.[0];
      expect(model).toBeDefined();
      expect(model).not.toContain('*');
      expect(model).not.toContain(
        translator(locale)('purpose.hypothesis.title'),
      );
    },
  );
});
