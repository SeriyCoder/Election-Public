import { renderToString } from 'preact-render-to-string';
import { describe, expect, it, vi } from 'vitest';
import { LOCALES, TABLES, translator } from '../../src/i18n';
import { App } from '../../src/ui/App';
import { baselineInput } from '../../src/ui/presets';
import { createStore, type ImportIssue } from '../../src/ui/store';
import {
  IMPORT_ISSUE_CAP,
  ImportIssues,
  Transfer,
} from '../../src/ui/Transfer';

const KEYS = [
  'transfer.label',
  'transfer.export',
  'transfer.import',
  'transfer.issues.title',
  'transfer.more',
  'transfer.dismiss',
  'issue.too-large',
  'issue.invalid-json',
  'issue.unreadable',
];

const HOSTILE = '</script><script>alert(1)</script>';

const t = translator('en');

function escapeText(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/"/g, '&quot;');
}

function attribute(html: string, name: string): string[] {
  return [...html.matchAll(new RegExp(`${name}="([^"]*)"`, 'g'))].map(
    (match) => match[1] ?? '',
  );
}

function tagWith(html: string, marker: string): string {
  const match = new RegExp(`<[a-z]+\\b[^>]*${marker}[^>]*>`).exec(html);
  if (match === null) {
    throw new Error(`no tag with ${marker}`);
  }
  return match[0];
}

function controls(canExport: boolean): string {
  return renderToString(
    <Transfer
      canExport={canExport}
      t={t}
      onExport={vi.fn()}
      onImport={vi.fn()}
    />,
  );
}

function issueBox(issues: readonly ImportIssue[] | null): string {
  return renderToString(
    <ImportIssues issues={issues} t={t} onDismiss={vi.fn()} />,
  );
}

function issue(index: number): ImportIssue {
  return {
    path: `groups[${index}].turnout`,
    code: 'out-of-range',
    message: 'internal',
  };
}

describe('transfer messages', () => {
  it.each(LOCALES)('%s defines every transfer key', (locale) => {
    const table = TABLES[locale] as Record<string, string>;
    for (const key of KEYS) {
      expect(table[key], key).toMatch(/\S/);
    }
  });

  it.each(LOCALES)('%s counts the hidden issues', (locale) => {
    const text = translator(locale)('transfer.more', { count: 7 });
    expect(text).toContain('7');
    expect(text).not.toContain('{count}');
  });
});

describe('transfer controls', () => {
  it('offers an export button and a labelled JSON file input', () => {
    const html = controls(true);
    expect(attribute(html, 'data-action')).toEqual(['export', 'import']);
    expect(html).toContain(escapeText(t('transfer.export')));
    expect(html).toContain(escapeText(t('transfer.import')));
    const input = tagWith(html, 'type="file"');
    expect(input).toContain('accept=".json,application/json"');
    const label = tagWith(html, 'data-action="import"');
    expect(label.startsWith('<label')).toBe(true);
    expect(tagWith(html, 'role="group"')).toContain(
      `aria-label="${escapeText(t('transfer.label'))}"`,
    );
  });

  it('enables export for a valid input', () => {
    const button = tagWith(controls(true), 'data-action="export"');
    expect(button.startsWith('<button')).toBe(true);
    expect(button).toContain('type="button"');
    expect(button).not.toMatch(/\sdisabled\b/);
  });

  it('disables export for an invalid input', () => {
    const button = tagWith(controls(false), 'data-action="export"');
    expect(button).toMatch(/\sdisabled\b/);
  });
});

describe('import issue box', () => {
  it('renders nothing without issues', () => {
    expect(issueBox(null)).toBe('');
  });

  it('announces each issue with its message text and an LTR path', () => {
    const html = issueBox([
      { path: '', code: 'invalid-json', message: 'internal' },
      issue(2),
    ]);
    expect(tagWith(html, 'role="alert"')).toContain('data-import-issues');
    expect(html).toContain(escapeText(t('transfer.issues.title')));
    expect(attribute(html, 'data-code')).toEqual([
      'invalid-json',
      'out-of-range',
    ]);
    expect(html).toContain(escapeText(t('issue.invalid-json')));
    expect(html).toContain(escapeText(t('issue.out-of-range')));
    expect(html).toContain('<code class="import-issues__path" dir="ltr">');
    expect(html).toContain('groups[2].turnout');
    expect(html).not.toContain('internal');
  });

  it('names an unreadable file in the selected language', () => {
    for (const locale of LOCALES) {
      const tr = translator(locale);
      const html = renderToString(
        <ImportIssues
          issues={[{ path: '', code: 'unreadable', message: 'internal' }]}
          t={tr}
          onDismiss={vi.fn()}
        />,
      );
      expect(html).toContain(escapeText(tr('issue.unreadable')));
    }
  });

  it('offers a dismiss button', () => {
    const button = tagWith(
      issueBox([issue(0)]),
      'data-action="dismiss-import"',
    );
    expect(button.startsWith('<button')).toBe(true);
    expect(button).toContain('type="button"');
  });

  it(`lists at most ${IMPORT_ISSUE_CAP} issues and counts the rest`, () => {
    expect(IMPORT_ISSUE_CAP).toBe(20);
    const many = Array.from({ length: 27 }, (_, index) => issue(index));
    const html = issueBox(many);
    expect(attribute(html, 'data-code')).toHaveLength(20);
    expect(html).toContain('groups[19].turnout');
    expect(html).not.toContain('groups[20].turnout');
    expect(attribute(html, 'data-import-more')).toEqual(['7']);
    expect(html).toContain(escapeText(t('transfer.more', { count: 7 })));
  });

  it('shows no overflow line at exactly the cap', () => {
    const html = issueBox(
      Array.from({ length: IMPORT_ISSUE_CAP }, (_, index) => issue(index)),
    );
    expect(attribute(html, 'data-code')).toHaveLength(20);
    expect(html).not.toContain('data-import-more');
  });

  it('escapes a hostile issue path', () => {
    const html = issueBox([{ path: HOSTILE, code: 'invalid-id', message: '' }]);
    expect(html).not.toContain('<script>');
    expect(html).toContain(escapeText(HOSTILE));
  });
});

describe('transfer in the app', () => {
  function render(store = createStore()): string {
    return renderToString(<App store={store} />);
  }

  it('puts the transfer controls in the toolbar', () => {
    const html = render();
    const toolbar = /<header\b[\s\S]*?<\/header>/.exec(html)?.[0] ?? '';
    expect(toolbar).toContain('data-action="export"');
    expect(toolbar).toContain('data-action="import"');
    expect(tagWith(html, 'data-action="export"')).not.toMatch(/\sdisabled\b/);
  });

  it('disables export while the input is invalid', () => {
    const store = createStore({ input: 'not a scenario' });
    expect(tagWith(render(store), 'data-action="export"')).toMatch(
      /\sdisabled\b/,
    );
  });

  it('shows the issues of a rejected import', () => {
    const store = createStore();
    store.importScenario('{"schemaVersion":');
    const html = render(store);
    expect(attribute(html, 'data-code')).toContain('invalid-json');
    expect(html).toContain('data-import-issues');
  });

  it('shows no issue box before any import', () => {
    expect(render()).not.toContain('data-import-issues');
  });

  it('renders an imported hostile name as inert text', () => {
    const store = createStore();
    const loaded = store.importScenario(
      JSON.stringify({ ...baselineInput(), name: HOSTILE, notes: HOSTILE }),
    );
    expect(loaded).toBe(true);
    const html = render(store);
    expect(html).not.toContain('<script>');
    expect(html).toContain(escapeText(HOSTILE));
  });
});
