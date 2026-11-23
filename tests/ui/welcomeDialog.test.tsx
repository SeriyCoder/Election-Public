import { renderToString } from 'preact-render-to-string';
import { describe, expect, it } from 'vitest';
import { App, type AppProps } from '../../src/ui/App';
import { createStore } from '../../src/ui/store';

interface WelcomeAdapter {
  readonly seen: boolean;
  markSeen(): void;
}

function renderWelcome(language: 'ru' | 'en' | 'he' = 'he'): string {
  const store = createStore({ screen: 'book', language });
  const props = {
    store,
    welcome: { seen: false, markSeen() {} },
  } as unknown as AppProps & { welcome: WelcomeAdapter };
  return renderToString(<App {...props} />);
}

describe('M7-22 first-visit welcome dialog', () => {
  it.each(['ru', 'en', 'he'] as const)(
    'renders the autonomous three-language dialog in %s',
    (locale) => {
      const html = renderWelcome(locale);
      expect(html).toContain('data-welcome-dialog');
      expect(html).toContain('data-welcome-art');
      expect(html).toContain('Добро пожаловать в Симулятор');
      expect(html).toContain('ברוכים הבאים לסימולטור הבחירות');
      expect(html).toContain('Welcome to the Israel');
      expect(html).toContain('dir="rtl"');
      expect(html).toContain('data-highlight="ru"');
      expect(html).toContain('data-highlight="he"');
      expect(html).toContain('data-highlight="en"');
      expect(html).toContain('data-welcome-language="ru"');
      expect(html).toContain('data-welcome-language="en"');
      expect(html).toContain('data-welcome-language="he"');
      expect(html).toContain('aria-modal="true"');
    },
  );
});
