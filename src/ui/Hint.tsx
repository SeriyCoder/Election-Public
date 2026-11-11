import { useId, useState } from 'preact/hooks';
import type { Translate } from '../i18n';

export interface HintProps {
  /** What the hint explains; written to `data-hint`. */
  readonly kind: string;
  /** The label the hint stands beside; it names the button. */
  readonly label: string;
  /** The explanation, shown on hover and opened as text. */
  readonly text: string;
  readonly t: Translate;
}

/**
 * An (i) button beside a label. Hover shows the explanation as a tooltip; a
 * click, tap, Enter or Space opens it as text under the label, Escape closes it.
 * The text stays in the page while closed so `aria-controls` always resolves.
 */
export function Hint({ kind, label, text, t }: HintProps) {
  const [open, setOpen] = useState(false);
  const id = `hint-${useId()}`;
  return (
    <>
      <button
        type="button"
        class="hint"
        data-hint={kind}
        title={text}
        aria-label={t('hint.open', { label })}
        aria-expanded={open ? 'true' : 'false'}
        aria-controls={id}
        onClick={() => setOpen(!open)}
        onKeyDown={(event) => {
          if (event.key === 'Escape' && open) {
            event.stopPropagation();
            setOpen(false);
          }
        }}
      >
        <span class="hint__mark" aria-hidden="true">
          i
        </span>
      </button>
      <span class="hint__text" id={id} hidden={!open}>
        {text}
      </span>
    </>
  );
}
