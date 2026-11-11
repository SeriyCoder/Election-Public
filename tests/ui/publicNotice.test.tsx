import { describe, expect, it } from 'vitest';
import { render } from 'preact-render-to-string';
import { App } from '../../src/ui/App';
import { createStore, type ViewId } from '../../src/ui/store';
import { LOCALES, translator } from '../../src/i18n';
import { validateScenario, serializeScenario } from '../../src/engine/schema';
import { runScenario, serializeResult } from '../../src/engine/run';

const NOTICES = {
  ru: 'Учебная математическая модель, а не прогноз выборов. Расчёты выполняются только в вашем браузере.',
  en: 'An educational mathematical model, not an election forecast. Everything is calculated in your browser only.',
  he: 'מודל מתמטי לימודי, לא תחזית בחירות. כל החישובים מתבצעים בדפדפן שלך בלבד.',
} as const;
const VIEWS: readonly ViewId[] = [
  'inputs',
  'seats',
  'coalitions',
  'compare',
  'composition',
  'future',
];

describe('public educational notice', () => {
  for (const language of LOCALES) {
    it(`has the exact approved translation in ${language}`, () => {
      const table = translator(language);
      expect(table('notice.forecast' as Parameters<typeof table>[0])).toBe(
        NOTICES[language],
      );
    });

    it(`shows the notice outside the questionnaire form in ${language}`, () => {
      const store = createStore({ screen: 'book', language });
      const html = render(<App store={store} />);
      expect(
        html.includes(NOTICES[language]),
        'approved notice is rendered',
      ).toBe(true);
      expect(html).toContain('data-public-notice');
      const notice = html.indexOf(NOTICES[language]);
      const formStart = html.indexOf('<form');
      const formEnd = html.indexOf('</form>');
      expect(notice < formStart || notice > formEnd).toBe(true);
      expect(html).not.toMatch(/<button[^>]*data-public-notice/);
    });

    for (const view of VIEWS) {
      it(`keeps the notice on ${view} in ${language} without changing results`, () => {
        const store = createStore({ screen: 'app', language, view });
        store.startBook('eight', true);
        store.setView(view);
        const checked = validateScenario(store.getState().input);
        if (!checked.ok) throw new Error('example must be valid');
        const before = serializeResult(runScenario(checked.scenario));
        const input = serializeScenario(checked.scenario);
        const html = render(<App store={store} />);
        expect(
          html.includes(NOTICES[language]),
          'approved notice is rendered',
        ).toBe(true);
        expect(html.match(/data-public-notice/g)).toHaveLength(1);
        expect(serializeScenario(checked.scenario)).toBe(input);
        expect(serializeResult(runScenario(checked.scenario))).toBe(before);
      });
    }
  }
});
