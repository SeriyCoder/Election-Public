import type { ComponentChildren } from 'preact';
import type { Translate } from '../i18n';

/**
 * The translated text with `*keyword*` markers rendered as strong text nodes
 * (M7-20). The string is split, never parsed as markup, so it stays inert.
 */
export function emphasized(text: string): ComponentChildren {
  return text
    .split('*')
    .map((part, index) => (index % 2 === 1 ? <strong>{part}</strong> : part));
}

/**
 * The simulator's aim and the user's thesis, framed as a hypothesis (M7-19).
 * Since M7-20 the card is always open, emphasised, and on the Coalitions view
 * carries a button into the coalition simulations.
 */
export function Purpose({
  t,
  onOpenSimulator,
}: {
  readonly t: Translate;
  readonly onOpenSimulator?: () => void;
}) {
  return (
    <section class="purpose" data-purpose>
      <p class="purpose__goal">{emphasized(t('purpose.goal'))}</p>
      <p class="purpose__hypothesis-title">{t('purpose.hypothesis.title')}</p>
      <p class="purpose__hypothesis">
        {emphasized(t('purpose.hypothesis.text'))}
      </p>
      <p class="purpose__note">{t('purpose.note')}</p>
      {onOpenSimulator !== undefined && (
        <>
          <p class="purpose__workspace">{emphasized(t('purpose.workspace'))}</p>
          <button
            type="button"
            class="button button--cta purpose__open"
            data-action="open-simulator"
            onClick={onOpenSimulator}
          >
            {t('panel.openSimulator')}
          </button>
        </>
      )}
    </section>
  );
}
