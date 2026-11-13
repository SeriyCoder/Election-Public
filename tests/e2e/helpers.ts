import { expect, test as base, type Page } from '@playwright/test';
import type { Json } from '../engine/helpers/scenarios';
import { presetInput, type PresetId } from '../../src/ui/presets';
import { scenarioTitle } from '../../src/ui/names';
import { translator } from '../../src/i18n';

export { expect };

export const APP_URL = new URL('../../dist/elections.html', import.meta.url)
  .href;

export const LOCALES = ['ru', 'en', 'he'] as const;
export type Locale = (typeof LOCALES)[number];

export const VIEWS = [
  'inputs',
  'seats',
  'coalitions',
  'compare',
  'composition',
  'future',
] as const;
export type View = (typeof VIEWS)[number];

/** Section 8 baseline seats (spec Section 8). */
export const BASELINE_SEATS = { P1: '46', P2: '50', P3: '18', P4: '6' };

const ALLOWED_URL = /^(file|blob|data):/;

/**
 * Records everything that breaks the offline promise: a request that is not
 * file, blob or data, a console error, an uncaught error or a CSP violation.
 */
export function watchPage(page: Page): string[] {
  const problems: string[] = [];
  page.on('request', (request) => {
    if (!ALLOWED_URL.test(request.url())) {
      problems.push(`request ${request.url()}`);
    }
  });
  page.on('console', (message) => {
    if (message.type() === 'error') {
      problems.push(`console ${message.text()}`);
    }
  });
  page.on('pageerror', (error) => problems.push(`pageerror ${error.message}`));
  return problems;
}

/** Runs before the app: reports CSP violations and keeps created blobs. */
export async function instrument(page: Page): Promise<void> {
  await page.addInitScript(() => {
    document.addEventListener('securitypolicyviolation', (event) => {
      console.error(
        `csp ${event.effectiveDirective} blocked ${event.blockedURI}`,
      );
    });
    const created: Blob[] = [];
    (window as unknown as { __blobs: Blob[] }).__blobs = created;
    const original = URL.createObjectURL.bind(URL);
    URL.createObjectURL = (object: Blob | MediaSource) => {
      if (object instanceof Blob) {
        created.push(object);
      }
      return original(object);
    };
  });
}

export const test = base.extend<{ problems: string[] }>({
  problems: [
    async ({ page }, use) => {
      const problems = watchPage(page);
      await instrument(page);
      await use(problems);
      expect(problems, 'offline guard').toEqual([]);
    },
    { auto: true },
  ],
});

export async function openApp(page: Page, locale: Locale = 'en') {
  await page.goto(APP_URL);
  await skipBook(page);
  await setLocale(page, locale);
  await loadPresetFixture(page, 'baseline');
  await showView(page, 'inputs');
}

/** Leaves the questionnaire the app opens with for the editor. */
export async function skipBook(page: Page) {
  await expect(page.locator('[data-book]')).toBeVisible();
  await page.locator('[data-action="book-skip"]').click();
  await expect(page.locator('[data-region="toolbar"]')).toBeVisible();
}

export const book = (page: Page) => page.locator('[data-book]');

/** Opens the app on the questionnaire it starts with. */
export async function openBook(page: Page) {
  await page.goto(APP_URL);
  await expect(book(page)).toBeVisible();
  await setLocale(page, 'ru');
}

/** The page and part on screen, as `page#part`. */
export async function bookAt(page: Page): Promise<string> {
  return book(page).evaluate(
    (element) =>
      `${element.getAttribute('data-page') ?? ''}#${element.getAttribute('data-part') ?? ''}`,
  );
}

/** Clicks Next and waits for the page or its part to change. */
export async function next(page: Page) {
  const current = await bookAt(page);
  await page.locator('[data-action="book-next"]').click();
  await expect.poll(() => bookAt(page)).not.toBe(current);
}

/** Clicks Back and waits for the page or its part to change. */
export async function back(page: Page) {
  const current = await bookAt(page);
  await page.locator('[data-action="book-back"]').click();
  await expect.poll(() => bookAt(page)).not.toBe(current);
}

/**
 * One page block of the screen on view (M7-19): fields, choices and errors of
 * pages stacked on one screen are scoped through it.
 */
export function bookPage(page: Page, key: string) {
  return page.locator(`[data-book] [data-book-page="${key}"]`);
}

/** Turns with Next until the screen holding the given page is on view. */
export async function nextTo(page: Page, key: string) {
  for (let turns = 0; turns < 120; turns += 1) {
    if (
      (await book(page).getAttribute('data-page')) === key ||
      (await bookPage(page, key).count()) > 0
    ) {
      return;
    }
    await next(page);
  }
  throw new Error(`never reached ${key}`);
}

/** Walks the review parts with Next until the build button shows. */
export async function toBuild(page: Page) {
  await nextTo(page, 'review');
  for (let turns = 0; turns < 20; turns += 1) {
    if ((await page.locator('[data-action="book-build"]').count()) > 0) {
      return;
    }
    await next(page);
  }
  throw new Error('never reached the build button');
}
export async function setLocale(page: Page, locale: Locale) {
  await page.locator(`[data-locale="${locale}"]`).click();
  await expect(page.locator('html')).toHaveAttribute('lang', locale);
}

export async function showView(page: Page, view: View) {
  const actual =
    view === 'seats' ? 'inputs' : view === 'compare' ? 'coalitions' : view;
  if (actual === 'composition') {
    await page.locator('[data-view="coalitions"]').click();
    await page.locator('[data-action="composition-details"]').click();
  } else {
    await page.locator(`[data-view="${actual}"]`).click();
  }
  await expect(page.locator('.app')).toHaveAttribute(
    'data-active-view',
    actual,
  );
  // M7-17: the detailed future tables and the coalition search results sit in
  // closed disclosures; the views' older tests read them opened.
  const opened =
    actual === 'future'
      ? ['[data-future-details]']
      : actual === 'coalitions'
        ? ['[data-coalition-results]']
        : [];
  for (const selector of opened) {
    const disclosure = page.locator(selector);
    if ((await disclosure.getAttribute('open')) === null) {
      await disclosure.locator('summary').first().click();
    }
  }
  if (view === 'compare') {
    for (const selector of [
      '[data-workspace-compare]',
      '[data-workspace-history]',
    ]) {
      const disclosure = page.locator(selector);
      if ((await disclosure.getAttribute('open')) === null) {
        await disclosure.locator('summary').first().click();
      }
    }
  }
}

/** Loads a scenario through the real file input and its change event. */
export async function loadScenario(page: Page, input: Json) {
  await page.evaluate((text) => {
    const field =
      document.querySelector<HTMLInputElement>('input[type="file"]');
    if (field === null) {
      throw new Error('no file input');
    }
    const transfer = new DataTransfer();
    transfer.items.add(
      new File([text], 'scenario.json', { type: 'application/json' }),
    );
    field.files = transfer.files;
    field.dispatchEvent(new Event('change', { bubbles: true }));
  }, JSON.stringify(input));
  const locale = (await page.locator('html').getAttribute('lang')) as Locale;
  await expect(page.locator('.toolbar__name')).toHaveText(
    scenarioTitle(input, translator(locale)),
  );
  await expect(page.locator('[data-import-issues]')).toHaveCount(0);
}

/** Presets are fixture data now; the public toolbar intentionally has no loader. */
export async function loadPresetFixture(page: Page, id: PresetId) {
  await loadScenario(page, presetInput(id));
}

/** Seats per party ID from the seats table, which must be on screen. */
export async function seatsOf(page: Page): Promise<Record<string, string>> {
  const rows = page.locator('[data-table="parties"] tbody tr[data-party]');
  await expect(rows.first()).toBeVisible();
  return rows.evaluateAll((list) =>
    Object.fromEntries(
      list.map((row) => [
        row.getAttribute('data-party') ?? '',
        row.querySelector('[data-cell="seats"]')?.textContent?.trim() ?? '',
      ]),
    ),
  );
}

/** Text of the last JSON export, excluding asynchronous worker blobs. */
export async function lastBlobText(page: Page): Promise<string> {
  return page.evaluate(async () => {
    const blobs = (window as unknown as { __blobs: Blob[] }).__blobs;
    const blob = [...blobs]
      .reverse()
      .find((candidate) => candidate.type === 'application/json');
    if (blob === undefined) {
      throw new Error('no JSON export blob created');
    }
    return blob.text();
  });
}

export function groupField(page: Page, groupId: string, fraction: string) {
  return page.locator(
    `[data-entity="group"][data-id="${groupId}"] [data-fraction="${fraction}"]`,
  );
}

/** Turns the editor column to a page through its page select. */
export async function openEditorPage(page: Page, key: string) {
  await page.locator('[data-page-select]').selectOption(key);
  await expect(page.locator('[data-editor-pager]')).toHaveAttribute(
    'data-page',
    key,
  );
}

export function isPhone(projectName: string): boolean {
  return projectName === 'phone';
}
