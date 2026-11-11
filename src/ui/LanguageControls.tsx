import { LOCALE_NAMES, LOCALES, type Locale, type Translate } from '../i18n';
import type { Store } from './store';

export function LanguageControls({
  store,
  locale,
  t,
}: {
  readonly store: Store;
  readonly locale: Locale;
  readonly t: Translate;
}) {
  return (
    <div class="languages" role="group" aria-label={t('language.label')}>
      {LOCALES.map((choice) => (
        <button
          key={choice}
          type="button"
          class="languages__item"
          data-locale={choice}
          lang={choice}
          aria-pressed={choice === locale ? 'true' : 'false'}
          onClick={() => store.setLanguage(choice)}
        >
          {LOCALE_NAMES[choice]}
        </button>
      ))}
    </div>
  );
}
