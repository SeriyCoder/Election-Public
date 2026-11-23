import { useEffect, useRef } from 'preact/hooks';
import { LOCALE_NAMES, translator, type Locale, type Translate } from '../i18n';
import type { Store } from './store';
import { WelcomeArt } from './welcomeArt';

function Heading({
  locale,
  label,
}: {
  readonly locale: Locale;
  readonly label: Translate;
}) {
  return (
    <h2
      class="welcome-heading"
      data-welcome-heading={locale}
      dir={locale === 'he' ? 'rtl' : 'ltr'}
      lang={locale}
    >
      {label(`welcome.title.${locale}.before`)}
      <strong data-highlight={locale}>
        {label(`welcome.title.${locale}.highlight`)}
      </strong>
      {label(`welcome.title.${locale}.after`)}
    </h2>
  );
}

export function WelcomeDialog({
  store,
  language,
  onClose,
}: {
  readonly store: Store;
  readonly language: Locale;
  readonly onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const close = useRef<HTMLButtonElement>(null);
  const t = translator(language);
  const closeDialog = () => onClose();

  useEffect(() => {
    const previous = document.activeElement;
    dialog.current?.showModal();
    close.current?.focus();
    return () => {
      if (
        previous instanceof HTMLElement &&
        previous.tabIndex >= 0 &&
        previous.isConnected
      ) {
        previous.focus();
      } else {
        window.setTimeout(() => {
          document
            .querySelector<HTMLElement>('.languages__item[aria-pressed="true"]')
            ?.focus();
        }, 0);
      }
    };
  }, []);

  return (
    <dialog
      ref={dialog}
      class="welcome-dialog"
      data-welcome-dialog
      data-welcome-backdrop
      aria-modal="true"
      aria-label={t('welcome.dialogLabel')}
      onCancel={(event) => {
        event.preventDefault();
        closeDialog();
      }}
      onClick={(event) => {
        if (event.currentTarget === event.target) closeDialog();
      }}
    >
      <section
        class="welcome-card"
        data-welcome-card
        dir={language === 'he' ? 'rtl' : 'ltr'}
      >
        <button
          ref={close}
          type="button"
          class="welcome-close"
          data-welcome-close
          aria-label={t('welcome.close')}
          onClick={closeDialog}
        >
          ×
        </button>
        <WelcomeArt />
        <div class="welcome-headings">
          {(['ru', 'he', 'en'] as const).map((locale) => (
            <section class="welcome-language-copy" key={locale}>
              <Heading locale={locale} label={translator(locale)} />
              <p dir={locale === 'he' ? 'rtl' : 'ltr'} lang={locale}>
                {translator(locale)('welcome.note')}
              </p>
            </section>
          ))}
        </div>
        <div class="welcome-languages">
          {(['ru', 'en', 'he'] as const).map((locale) => (
            <button
              key={locale}
              type="button"
              class={`button welcome-language${locale === language ? ' welcome-language--active' : ''}`}
              data-welcome-language={locale}
              lang={locale}
              aria-pressed={locale === language}
              onClick={() => {
                store.setLanguage(locale);
                closeDialog();
              }}
            >
              {LOCALE_NAMES[locale]}
            </button>
          ))}
        </div>
      </section>
    </dialog>
  );
}
