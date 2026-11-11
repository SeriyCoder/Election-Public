import { describe, expect, it } from 'vitest';
import { render } from 'preact-render-to-string';
import { App } from '../../src/ui/App';
import { createStore, VIEWS } from '../../src/ui/store';
import { LOCALES } from '../../src/i18n';
import { workspaceLinked } from '../engine/helpers/workspace';

describe('M7-12 integrated panels', () => {
  it('orders Coalitions, Demographic Future and Data and hides Composition navigation', () => {
    expect(VIEWS).toEqual(['coalitions', 'future', 'inputs']);
  });
  it.each(LOCALES)(
    'renders compact editable panels and repair actions in %s',
    (language) => {
      const store = createStore({
        input: workspaceLinked(),
        language,
        screen: 'app',
        view: 'coalitions',
      });
      const html = render(<App store={store} />);
      for (const selector of [
        'data-panel-votes',
        'data-panel-supporters',
        'data-panel-composition',
        'data-panel-population',
        'data-action="panel-align"',
        'data-action="panel-smooth"',
        'data-coalition-tiles',
        'data-panel-relations',
      ]) {
        expect(html).toContain(selector);
      }
      expect(html).not.toContain('undefined');
    },
  );
  it.each(LOCALES)(
    'renders two future modes and shared playback controls in %s',
    (language) => {
      const store = createStore({
        input: workspaceLinked(),
        language,
        screen: 'app',
        view: 'future',
      });
      const html = render(<App store={store} />);
      expect(html).toContain('data-future-mode="growth"');
      expect(html).toContain('data-future-mode="experiment"');
      expect(html).toContain('data-action="future-play"');
      expect(html).toContain('data-population-series');
    },
  );
});
