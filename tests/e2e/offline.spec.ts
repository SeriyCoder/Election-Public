import type { Page } from '@playwright/test';
import {
  BASELINE_SEATS,
  LOCALES,
  VIEWS,
  expect,
  loadPresetFixture,
  groupField,
  openApp,
  openEditorPage,
  seatsOf,
  setLocale,
  showView,
  skipBook,
  test,
} from './helpers';

test.describe('offline file', () => {
  test('shows the Section 8 baseline seats in every language', async ({
    page,
  }) => {
    await openApp(page);
    await showView(page, 'seats');
    for (const locale of LOCALES) {
      await setLocale(page, locale);
      expect(await seatsOf(page)).toEqual(BASELINE_SEATS);
      await expect(page.locator('html')).toHaveAttribute(
        'dir',
        locale === 'he' ? 'rtl' : 'ltr',
      );
    }
  });

  test('keeps inputs and results when the language changes', async ({
    page,
  }) => {
    await openApp(page);
    await showView(page, 'inputs');
    await page
      .locator('[data-editor="scenario"] [data-field="name"]')
      .fill('Kept across languages');
    await openEditorPage(page, 'group:G3');
    await groupField(page, 'G3', 'turnout').fill('50');
    await showView(page, 'seats');
    const edited = await seatsOf(page);
    expect(edited).not.toEqual(BASELINE_SEATS);
    for (const locale of ['he', 'ru', 'en'] as const) {
      await setLocale(page, locale);
      expect(await seatsOf(page)).toEqual(edited);
      await expect(page.locator('.toolbar__name')).toHaveText(
        'Kept across languages',
      );
    }
  });

  test('remembers the chosen language after a reload', async ({ page }) => {
    await openApp(page, 'he');
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('lang', 'he');
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await expect(page.locator('[data-book]')).toBeVisible();
    await skipBook(page);
    await expect(page.locator('[data-locale="he"]')).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  test('clear saved data forgets the language and keeps other sites keys', async ({
    page,
  }) => {
    await openApp(page, 'he');
    await page.evaluate(() => {
      window.localStorage.setItem('another-site.language', 'de');
    });
    await page.locator('[data-action="clear-data"]').click();
    const notice = page.locator('[data-storage-notice="cleared"]');
    await expect(notice).toBeVisible();
    await expect(notice).toHaveAttribute('role', 'status');
    await expect(page.locator('html')).toHaveAttribute('lang', 'he');
    const keys = await page.evaluate(() =>
      Object.keys(window.localStorage).sort(),
    );
    expect(keys).toEqual(['another-site.language']);
    await showView(page, 'seats');
    await expect(page.locator('[data-storage-notice]')).toHaveCount(0);
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('lang', 'he');
    await skipBook(page);
    await expect(page.locator('[data-locale="he"]')).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(
      await page.evaluate(() =>
        window.localStorage.getItem('another-site.language'),
      ),
    ).toBe('de');
  });

  test('runs the coalition search in the inline worker', async ({ page }) => {
    const workers: string[] = [];
    page.on('worker', (worker) => workers.push(worker.url()));
    await openApp(page);
    await showView(page, 'coalitions');
    await expect(page.locator('[data-coalition-summary="search"]')).toHaveText(
      'Complete',
    );
    await expect(page.locator('[data-note="in-page"]')).toHaveCount(0);
    expect(workers.length).toBeGreaterThan(0);
    for (const url of workers) {
      expect(url).toMatch(/^(blob|data):/);
    }
  });

  test('lists the majorities the rules block on request', async ({ page }) => {
    await openApp(page);
    await showView(page, 'coalitions');
    await expect(page.locator('[data-coalition-summary="search"]')).toHaveText(
      'Complete',
    );
    const blocked = page.locator('details[data-extra="blocked"]');
    const rows = blocked.locator('tr[data-blocked]');
    await expect(rows).toHaveCount(3);
    await expect(rows.first()).toBeHidden();
    await blocked.locator('summary').click();
    await expect(rows.first()).toBeVisible();
    await expect(rows.first().locator('[data-reason]')).toHaveCount(1);
    const larger = page.locator('details[data-extra="larger"]');
    await larger.locator('summary').press('Enter');
    await expect(larger.locator('[data-empty="larger"]')).toBeVisible();
  });

  test('shows the party every zero-turnout coalition needs', async ({
    page,
  }) => {
    await openApp(page);
    await loadPresetFixture(page, 'turnoutZero');
    await showView(page, 'coalitions');
    await expect(page.locator('[data-coalition-summary="search"]')).toHaveText(
      'Complete',
    );
    const pivotal = page.locator('details[data-extra="pivotal"]');
    const rows = pivotal.locator('tr[data-pivotal]');
    await expect(rows).toHaveCount(3);
    await expect(rows.first()).toBeHidden();
    await pivotal.locator('summary').click();
    await expect(rows.first()).toBeVisible();
    await expect(
      pivotal.locator('[data-cell="indispensable"]', { hasText: /^Yes$/ }),
    ).toHaveCount(1);
    await expect(
      rows.first().locator('[data-cell="indispensable"]'),
    ).toHaveText('Yes');
    await expect(rows.first().locator('[data-cell="coalitions"]')).toHaveText(
      '2',
    );
  });

  test('carries a content policy that forbids connections', async ({
    page,
  }) => {
    await openApp(page);
    const policy = await page
      .locator('meta[http-equiv="Content-Security-Policy"]')
      .getAttribute('content');
    expect(policy).toContain("connect-src 'none'");
    expect(policy).toContain("default-src 'none'");
  });

  test('shows one interface language at a time in every view', async ({
    page,
  }) => {
    await openApp(page);
    await showView(page, 'compare');
    await page.locator('[data-action="save-baseline"]').click();
    await expect(page.locator('[data-compare="ready"]')).toBeVisible();
    for (const locale of LOCALES) {
      await setLocale(page, locale);
      for (const view of VIEWS) {
        await showView(page, view);
        if (view === 'coalitions') {
          await expect(
            page.locator('[data-coalition-summary="search"]'),
          ).toBeVisible();
        }
        if (view === 'compare') {
          const runs = page.locator('[data-coalition-side]');
          await expect(runs).toHaveCount(2);
          await expect(runs.nth(0)).toHaveAttribute('data-run', 'done');
          await expect(runs.nth(1)).toHaveAttribute('data-run', 'done');
        }
        expect(
          await foreignText(page, FOREIGN[locale].source),
          `${locale} ${view}`,
        ).toEqual([]);
      }
    }
  });
});

/** Scripts that must not appear while a locale is shown. */
const FOREIGN: Record<(typeof LOCALES)[number], RegExp> = {
  ru: /[\u0590-\u05ff]/,
  en: /[\u0400-\u04ff\u0590-\u05ff]/,
  he: /[\u0400-\u04ff]/,
};

/**
 * Text, field values and accessible attributes of the whole app plus the
 * document title that match the pattern; the language buttons keep their
 * own endonyms and are left out.
 */
async function foreignText(page: Page, source: string): Promise<string[]> {
  return page.evaluate((pattern) => {
    const foreign = new RegExp(pattern);
    const found: string[] = [];
    const root = document.querySelector('.app');
    if (root === null) {
      throw new Error('no app');
    }
    const skipped = (element: Element | null) =>
      element?.closest('.languages__item') != null;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    for (
      let node = walker.nextNode();
      node !== null;
      node = walker.nextNode()
    ) {
      const value = node.textContent ?? '';
      if (!skipped(node.parentElement) && foreign.test(value)) {
        found.push(`text ${value}`);
      }
    }
    for (const element of root.querySelectorAll('*')) {
      if (skipped(element)) {
        continue;
      }
      for (const name of ['aria-label', 'placeholder', 'title']) {
        const value = element.getAttribute(name);
        if (value !== null && foreign.test(value)) {
          found.push(`${name} ${value}`);
        }
      }
      if (
        element instanceof HTMLInputElement ||
        element instanceof HTMLTextAreaElement
      ) {
        if (foreign.test(element.value)) {
          found.push(`value ${element.value}`);
        }
      }
    }
    if (foreign.test(document.title)) {
      found.push(`title ${document.title}`);
    }
    return found;
  }, source);
}
