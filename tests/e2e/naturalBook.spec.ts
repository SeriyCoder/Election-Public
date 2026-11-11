import type { Page } from '@playwright/test';
import type { Json } from '../engine/helpers/scenarios';
import {
  book,
  expect,
  lastBlobText,
  next,
  nextTo,
  openBook,
  showView,
  test,
  toBuild,
} from './helpers';

/** The page keys met with Next from the opening page to the review. */
async function walkKeys(page: Page): Promise<string[]> {
  const keys: string[] = [];
  for (let turns = 0; turns < 60; turns += 1) {
    const key = (await book(page).getAttribute('data-page')) ?? '';
    if (keys[keys.length - 1] !== key) keys.push(key);
    if (key === 'review') return keys;
    await next(page);
  }
  throw new Error(`never reached the review: ${keys.join(', ')}`);
}

/** Whether every element matching the selector lies inside the window. */
async function allInWindow(page: Page, selector: string) {
  return page.evaluate((query) => {
    const boxes = [...document.querySelectorAll(query)].map((element) =>
      element.getBoundingClientRect(),
    );
    return (
      boxes.length > 0 &&
      boxes.every(
        (box) =>
          box.top >= 0 &&
          box.left >= 0 &&
          box.bottom <= innerHeight + 1 &&
          box.right <= innerWidth + 1,
      )
    );
  }, selector);
}

test.describe('M7-15 natural compact questionnaire', () => {
  test.use({ viewport: { width: 1440, height: 900 } });
  test.skip(({ isMobile }) => isMobile, 'desktop screen sizes');

  test('walks the default book through one compose page without choice pages', async ({
    page,
  }) => {
    await openBook(page);
    expect(await walkKeys(page)).toEqual([
      'intro',
      'parties.count',
      'parties.naming',
      'parties.names',
      'people.about',
      'people.mix',
      'people.set',
      'turnout',
      'votes.shares',
      'compose',
      'votes.check',
      'growth',
      'rules.seats',
      'rules.threshold',
      'coalitions',
      'review',
    ]);
    await toBuild(page);
    await page.locator('[data-action="book-build"]').click();
    await expect(book(page)).toHaveCount(0);
    await page.locator('[data-action="export"]').click();
    const exported = JSON.parse(await lastBlobText(page)) as Json;
    const groups = (exported.groups as Json[]).map((group) => group.id);
    expect(groups).toEqual([
      'secular',
      'traditional',
      'religious',
      'knitted-kippot',
      'arab',
      'haredi',
      'other',
    ]);
    for (const party of exported.parties as Json[]) {
      expect(Object.keys(party.composition as Json)).toEqual(groups);
    }
  });

  test('keeps the learner on the compose page until every party is at 100%', async ({
    page,
  }) => {
    await openBook(page);
    await nextTo(page, 'compose');
    const shown = page.locator('[data-compose-shown]');
    await expect(shown).toHaveAttribute('data-compose-shown', '0');
    await expect(page.locator('[data-book-cell]')).toHaveCount(7);
    expect(await allInWindow(page, '[data-book-cell]')).toBe(true);
    await page.locator('[data-action="compose-next"]').click();
    await page.locator('[data-action="compose-next"]').click();
    await expect(shown).toHaveAttribute('data-compose-shown', '2');
    await page
      .locator('[data-book-cell] input[type="text"]')
      .first()
      .fill('50');
    await expect(page.locator('[data-remainder]')).toHaveAttribute(
      'data-state',
      'over',
    );
    await page.locator('[data-action="compose-previous"]').click();
    await expect(shown).toHaveAttribute('data-compose-shown', '1');
    await page.locator('[data-action="book-next"]').click();
    await expect(page.locator('[data-book-error]')).toBeVisible();
    await expect(book(page)).toHaveAttribute('data-page', 'compose');
    await expect(shown).toHaveAttribute('data-compose-shown', '2');
    await page.locator('[data-action="compose-align"]').click();
    await expect(page.locator('[data-remainder]')).toHaveAttribute(
      'data-state',
      'done',
    );
    await next(page);
    await expect(book(page)).toHaveAttribute('data-page', 'votes.check');
  });

  test('shows the CBS example without the group the source does not count', async ({
    page,
  }) => {
    await openBook(page);
    await nextTo(page, 'people.set');
    await expect(page.locator('[data-set-group]')).toHaveCount(6);
    await expect(page.locator('[data-set-group="knitted-kippot"]')).toHaveCount(
      0,
    );
    await expect(page.locator('[data-set-note]')).toHaveCount(0);
    await expect(page.locator('[data-book-choice="none"]')).toHaveCount(0);
  });

  test('shows every group, party and relation of the compact pages on one screen', async ({
    page,
  }) => {
    await openBook(page);
    await nextTo(page, 'turnout');
    await expect(page.locator('[data-book-rate]')).toHaveCount(7);
    expect(await allInWindow(page, '[data-book-rate]')).toBe(true);
    await next(page);
    await expect(book(page)).toHaveAttribute('data-page', 'votes.shares');
    await expect(page.locator('[data-book-cell]')).toHaveCount(4);
    await expect(page.locator('[data-shares-bar] [data-segment]')).toHaveCount(
      4,
    );
    await nextTo(page, 'votes.check');
    await expect(page.locator('[data-check-row]')).toHaveCount(7);
    expect(await allInWindow(page, '[data-check-row]')).toBe(true);
    await next(page);
    await expect(book(page)).toHaveAttribute('data-page', 'growth');
    expect(await allInWindow(page, '[data-book-rate]')).toBe(true);
    await nextTo(page, 'coalitions');
    await expect(page.locator('[data-rules-party]')).toBeVisible();
    await expect(page.locator('.directed-relations__pages')).toHaveCount(0);
    await expect(page.locator('[data-refusal]')).toHaveCount(6);
    const end = page.locator('[data-refusal]').first();
    await end.click();
    await expect(end).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('[data-refusal]').nth(1)).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    await page.locator('[data-action="rules-next"]').click();
    await expect(page.locator('[data-refusal]')).toHaveCount(6);
    await expect(page.locator('[data-part-step]')).toHaveCount(0);
  });

  test('formats the growth rate on Demographic Future in Russian', async ({
    page,
  }) => {
    await openBook(page);
    await nextTo(page, 'growth');
    await page
      .locator('[data-book-rate] input[type="text"]')
      .first()
      .fill('0,25');
    await toBuild(page);
    await page.locator('[data-action="book-build"]').click();
    await showView(page, 'future');
    await expect(page.locator('input[data-growth="secular"]')).toHaveValue(
      '0,25',
    );
  });
});
