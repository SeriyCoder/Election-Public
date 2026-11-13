import type { Page } from '@playwright/test';
import type { Json } from '../engine/helpers/scenarios';
import {
  book,
  bookPage,
  expect,
  lastBlobText,
  next,
  nextTo,
  openBook,
  showView,
  test,
  toBuild,
} from './helpers';

/**
 * The screens met with Next from the opening page to the review, each as the
 * page keys it stacks (M7-19).
 */
async function walkScreens(page: Page): Promise<string[][]> {
  const screens: string[][] = [];
  for (let turns = 0; turns < 60; turns += 1) {
    const key = (await book(page).getAttribute('data-page')) ?? '';
    const shown = await book(page)
      .locator('[data-book-page]')
      .evaluateAll((list) =>
        list.map((block) => block.getAttribute('data-book-page') ?? ''),
      );
    expect(shown[0]).toBe(key);
    if (screens[screens.length - 1]?.[0] !== key) screens.push(shown);
    if (key === 'review') return screens;
    await next(page);
  }
  throw new Error(`never reached the review: ${screens.join(' | ')}`);
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
    expect(await walkScreens(page)).toEqual([
      ['intro'],
      ['parties.count', 'parties.naming'],
      ['parties.names'],
      ['people.set', 'people.about', 'people.mix'],
      ['turnout', 'votes.shares', 'compose'],
      ['votes.check', 'growth'],
      ['coalitions', 'rules.threshold', 'rules.seats'],
      ['review'],
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
    // M7-19: compose is the last page of the turnout screen, which scrolls.
    const compose = bookPage(page, 'compose');
    const shown = compose.locator('[data-compose-shown]');
    await expect(shown).toHaveAttribute('data-compose-shown', '0');
    await expect(compose.locator('[data-book-cell]')).toHaveCount(7);
    await compose.locator('[data-book-cell]').last().scrollIntoViewIfNeeded();
    expect(
      await allInWindow(page, '[data-book-page="compose"] [data-book-cell]'),
    ).toBe(true);
    await compose.locator('[data-action="compose-next"]').click();
    await compose.locator('[data-action="compose-next"]').click();
    await expect(shown).toHaveAttribute('data-compose-shown', '2');
    await compose
      .locator('[data-book-cell] input[type="text"]')
      .first()
      .fill('50');
    await expect(compose.locator('[data-remainder]')).toHaveAttribute(
      'data-state',
      'over',
    );
    await compose.locator('[data-action="compose-previous"]').click();
    await expect(shown).toHaveAttribute('data-compose-shown', '1');
    await page.locator('[data-action="book-next"]').click();
    await expect(compose.locator('[data-book-error]')).toBeVisible();
    await expect(book(page)).toHaveAttribute('data-page', 'turnout');
    await expect(compose).toBeVisible();
    await expect(shown).toHaveAttribute('data-compose-shown', '2');
    await compose.locator('[data-action="compose-align"]').click();
    await expect(compose.locator('[data-remainder]')).toHaveAttribute(
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
    const set = bookPage(page, 'people.set');
    await expect(set.locator('[data-set-group]')).toHaveCount(6);
    await expect(set.locator('[data-set-group="knitted-kippot"]')).toHaveCount(
      0,
    );
    await expect(set.locator('[data-set-note]')).toHaveCount(0);
    await expect(page.locator('[data-book-choice="none"]')).toHaveCount(0);
  });

  test('shows every group, party and relation of the compact pages on one screen', async ({
    page,
  }) => {
    await openBook(page);
    await nextTo(page, 'turnout');
    const turnoutRates = '[data-book-page="turnout"] [data-book-rate]';
    await expect(page.locator(turnoutRates)).toHaveCount(7);
    expect(await allInWindow(page, turnoutRates)).toBe(true);
    // M7-19: the shares page shares the turnout screen.
    const shares = bookPage(page, 'votes.shares');
    await expect(shares).toBeVisible();
    await expect(shares.locator('[data-book-cell]')).toHaveCount(4);
    await expect(
      shares.locator('[data-shares-bar] [data-segment]'),
    ).toHaveCount(4);
    await nextTo(page, 'votes.check');
    await expect(page.locator('[data-check-row]')).toHaveCount(7);
    expect(await allInWindow(page, '[data-check-row]')).toBe(true);
    const growthRates = '[data-book-page="growth"] [data-book-rate]';
    await page.locator(growthRates).last().scrollIntoViewIfNeeded();
    expect(await allInWindow(page, growthRates)).toBe(true);
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
    await bookPage(page, 'growth')
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
