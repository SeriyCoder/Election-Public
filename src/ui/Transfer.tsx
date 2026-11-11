import type { Translate } from '../i18n';
import type { ImportIssue } from './store';

/** At most this many import issues are listed; the rest are counted. */
export const IMPORT_ISSUE_CAP = 20;

export interface TransferProps {
  readonly canExport: boolean;
  readonly t: Translate;
  readonly onExport: () => void;
  readonly onImport: (file: File) => void;
}

export function Transfer({ canExport, t, onExport, onImport }: TransferProps) {
  return (
    <div class="transfer" role="group" aria-label={t('transfer.label')}>
      <button
        type="button"
        class="button"
        data-action="export"
        disabled={!canExport}
        onClick={onExport}
      >
        {t('transfer.export')}
      </button>
      <label class="button transfer__import" data-action="import">
        {t('transfer.import')}
        <input
          type="file"
          class="transfer__file"
          accept=".json,application/json"
          onChange={(event) => {
            const input = event.currentTarget;
            const file = input.files?.[0];
            // Clearing the value lets the same file be chosen again.
            input.value = '';
            if (file !== undefined) {
              onImport(file);
            }
          }}
        />
      </label>
    </div>
  );
}

export interface ImportIssuesProps {
  readonly issues: readonly ImportIssue[] | null;
  readonly t: Translate;
  readonly onDismiss: () => void;
}

export function ImportIssues({ issues, t, onDismiss }: ImportIssuesProps) {
  if (issues === null || issues.length === 0) {
    return null;
  }
  const shown = issues.slice(0, IMPORT_ISSUE_CAP);
  const hidden = issues.length - shown.length;
  return (
    <div class="import-issues" role="alert" data-import-issues="list">
      <h2 class="import-issues__title">{t('transfer.issues.title')}</h2>
      <ul class="import-issues__list">
        {shown.map((issue, index) => (
          <li
            key={`${issue.path}-${issue.code}-${index}`}
            class="import-issues__item"
            data-code={issue.code}
            data-path={issue.path}
          >
            <span>{t(`issue.${issue.code}`)}</span>{' '}
            <code class="import-issues__path" dir="ltr">
              {issue.path}
            </code>
          </li>
        ))}
      </ul>
      {hidden > 0 && (
        <p class="import-issues__more" data-import-more={String(hidden)}>
          {t('transfer.more', { count: hidden })}
        </p>
      )}
      <button
        type="button"
        class="button"
        data-action="dismiss-import"
        onClick={onDismiss}
      >
        {t('transfer.dismiss')}
      </button>
    </div>
  );
}
