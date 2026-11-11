import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';
import {
  APP_URL,
  back,
  BASELINE_SEATS,
  book,
  expect,
  loadPresetFixture,
  next,
  nextTo,
  openBook,
  seatsOf,
  showView,
  skipBook,
  test,
  toBuild,
} from './helpers';

const EXAMPLE_SEATS = {
  likud: '31',
  'yesh-atid': '30',
  avoda: '11',
  'religious-zionism': '14',
  shas: '18',
  raam: '16',
};

async function sixLists(page: Page) {
  await nextTo(page, 'parties.count');
  await page.locator('[data-book-field]').first().fill('6');
  await next(page);
  await page.locator('[data-book-choice="example"]').check();
  await expect(page.locator('[data-narrator]')).toBeVisible();
  await next(page);
}

async function seriousFindings(page: Page): Promise<string[]> {
  const result = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  return result.violations
    .filter(
      (violation) =>
        violation.impact === 'serious' || violation.impact === 'critical',
    )
    .map(
      (violation) =>
        `${violation.id}: ${violation.nodes
          .slice(0, 3)
          .map((node) => node.target.join(' '))
          .join(' | ')}`,
    );
}

test.describe('M7-07 fresh questionnaire', () => {
  test('an untouched skip opens the neutral party example with editable shares', async ({
    page,
  }) => {
    await page.goto(APP_URL);
    await skipBook(page);
    await expect(page.locator('[data-active-view]')).toHaveAttribute(
      'data-active-view',
      'coalitions',
    );
    const workspace = page.locator('[data-coalition-workspace]');
    await expect(workspace).toHaveAttribute('data-workspace-mode', 'parties');
    await expect(workspace.locator('[data-party-seats="likud"]')).toHaveText(
      '30',
    );
    const share = workspace.locator('[data-party-share-input="likud"]');
    await workspace.locator('details[data-panel-advanced] > summary').click();
    await expect(share).toBeEnabled();
    await share.fill('40');
    await expect(workspace.locator('[data-party-seats="likud"]')).toHaveText(
      '48',
    );
  });

  test('starts in Hebrew, keeps an answer on language switches and opens editable coalitions', async ({
    page,
  }) => {
    await page.goto(APP_URL);
    await expect(page.locator('html')).toHaveAttribute('lang', 'he');
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await expect(page.locator('[data-locale="ru"]')).toBeVisible();
    await page.locator('[data-locale="ru"]').click();
    await expect(page.locator('html')).toHaveAttribute('lang', 'ru');
    await nextTo(page, 'parties.count');
    await page.locator('[data-book-field]').first().fill('5');
    await page.locator('[data-locale="he"]').click();
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await expect(book(page)).toHaveAttribute('data-page', 'parties.count');
    await expect(page.locator('[data-book-field]').first()).toHaveValue('5');
    await page.locator('[data-locale="ru"]').click();
    await skipBook(page);
    await expect(page.locator('[data-active-view]')).toHaveAttribute(
      'data-active-view',
      'coalitions',
    );
    const workspace = page.locator('[data-coalition-workspace]');
    await expect(workspace).toHaveAttribute('data-workspace-mode', 'parties');
    const share = workspace.locator('[data-party-share-input="likud"]');
    await workspace.locator('details[data-panel-advanced] > summary').click();
    await expect(share).toBeEnabled();
    await share.fill('40');
    await expect(workspace.locator('[data-party-seats="likud"]')).toHaveText(
      '48',
    );
  });

  test('persists an explicit opening-screen language across visits', async ({
    page,
  }) => {
    await page.goto(APP_URL);
    await page.locator('[data-locale="en"]').click();
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
    await expect(book(page)).toHaveAttribute('data-page', 'intro');
  });

  test('labels the untouched starting scenario as an educational example', async ({
    page,
  }) => {
    await page.goto(APP_URL);
    await page.locator('[data-locale="ru"]').click();
    await skipBook(page);
    await expect(page.locator('[data-auto-filled]')).toContainText(
      'учебный пример',
    );
    await expect(page.locator('[data-auto-filled]')).toContainText(
      'не прогноз',
    );
  });

  test('changes language inside a confirmation without losing the answer or dialog', async ({
    page,
  }) => {
    await page.goto(APP_URL);
    await page.locator('[data-locale="ru"]').click();
    await nextTo(page, 'parties.count');
    await page.locator('[data-book-field]').first().fill('5');
    await nextTo(page, 'parties.naming');
    await page.locator('[data-book-choice="example"]').click();
    const dialog = page.locator('[data-book-confirm]');
    await expect(dialog).toBeVisible();
    await dialog.locator('[data-locale="he"]').click();
    await expect(page.locator('html')).toHaveAttribute('lang', 'he');
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await expect(dialog).toBeVisible();
    await expect(book(page)).toHaveAttribute('data-page', 'parties.naming');
    await dialog.locator('[data-action="book-cancel"]').click();
    await back(page);
    await expect(page.locator('[data-book-field]').first()).toHaveValue('5');
  });
});

test.describe('questionnaire book', () => {
  test('opens first, alone, and skips to the unchanged baseline', async ({
    page,
  }) => {
    await openBook(page);
    await expect(book(page)).toHaveAttribute('data-page', 'intro');
    await expect(page.locator('html')).toHaveAttribute('lang', 'ru');
    await expect(page.locator('[data-region]')).toHaveCount(0);
    await expect(page.locator('[data-locale]')).toHaveCount(3);
    await skipBook(page);
    await loadPresetFixture(page, 'baseline');
    await page.locator('[data-action="open-book"]').click();
    await skipBook(page);
    await expect(page.locator('[data-auto-filled]')).toHaveCount(0);
    await showView(page, 'seats');
    expect(await seatsOf(page)).toEqual(BASELINE_SEATS);
  });

  test('moves focus to each new question and never turns by itself', async ({
    page,
  }) => {
    await openBook(page);
    await next(page);
    await expect(page.locator('[data-question]')).toBeFocused();
    await page.locator('[data-book-field]').first().fill('5');
    await expect(page.locator('[data-narrator]')).toBeVisible();
    await page.waitForTimeout(600);
    await expect(book(page)).toHaveAttribute('data-page', 'parties.count');
  });

  test('keeps the page and shows the error after Next on a wrong answer', async ({
    page,
  }) => {
    await openBook(page);
    await nextTo(page, 'parties.count');
    await page.locator('[data-book-field]').first().fill('11');
    await expect(page.locator('[data-book-error]')).toHaveCount(0);
    await page.locator('[data-action="book-next"]').click();
    await expect(page.locator('[data-book-error]')).toBeVisible();
    await expect(book(page)).toHaveAttribute('data-page', 'parties.count');
  });

  test('skips after the six lists and fills the remaining Basic assumptions', async ({
    page,
  }) => {
    await openBook(page);
    await sixLists(page);
    await expect(book(page)).toHaveAttribute('data-page', 'parties.names');
    await page.locator('[data-action="book-skip"]').click();
    await expect(page.locator('[data-region="toolbar"]')).toBeVisible();
    await expect(page.locator('[data-auto-filled]')).toBeVisible();
    await expect(page.locator('[data-auto-filled]')).toContainText(
      'Названия партий',
    );
    await showView(page, 'seats');
    expect(await seatsOf(page)).toEqual(EXAMPLE_SEATS);
  });

  test('keeps the six-list results when the educational group assumptions are chosen', async ({
    page,
  }) => {
    await openBook(page);
    await sixLists(page);
    await nextTo(page, 'people.set');
    await page.locator('[data-book-choice="example"]').check();
    await nextTo(page, 'compose');
    await expect(page.locator('[data-compose-party] option')).toHaveCount(6);
    await toBuild(page);
    await page.locator('[data-action="book-build"]').click();
    await showView(page, 'seats');
    expect(await seatsOf(page)).toEqual(EXAMPLE_SEATS);
  });

  test('walks to the review, builds and returns with the answers', async ({
    page,
  }) => {
    await openBook(page);
    await nextTo(page, 'parties.count');
    await page.locator('[data-book-field]').first().fill('5');
    await nextTo(page, 'review');
    await expect(page.locator('[data-review="1"]')).toContainText('Партии (5)');
    await toBuild(page);
    await page.locator('[data-action="book-build"]').click();
    await expect(page.locator('.app')).toHaveAttribute(
      'data-active-view',
      'coalitions',
    );
    await expect(page.locator('.toolbar__name')).toHaveText('Моя симуляция');
    await showView(page, 'seats');
    await expect(page.locator('[data-assumption-note]')).toBeVisible();
    expect(await seatsOf(page)).toEqual({
      likud: '24',
      'yesh-atid': '24',
      'religious-zionism': '24',
      'national-unity': '24',
      shas: '24',
    });
    await page.locator('[data-action="open-book"]').click();
    await expect(book(page)).toHaveAttribute('data-page', 'review');
    while ((await page.locator('[data-review="1"]').count()) === 0) {
      await back(page);
      await expect(book(page)).toHaveAttribute('data-page', 'review');
    }
    await page
      .locator('[data-action="book-edit"][data-page="parties.count"]')
      .click();
    await expect(page.locator('[data-book-field]').first()).toHaveValue('5');
  });

  test('keeps an exact threshold-boundary share through the questionnaire', async ({
    page,
  }) => {
    await openBook(page);
    await nextTo(page, 'parties.count');
    await page.locator('[data-book-field="0"]').fill('2');
    await nextTo(page, 'parties.naming');
    await page.locator('[data-book-choice="own"]').check();
    await nextTo(page, 'parties.names');
    await page.locator('[data-book-field="1"]').fill('At threshold');
    await page.locator('[data-book-field="3"]').fill('Other');
    await nextTo(page, 'people.set');
    await page.locator('[data-book-choice="own"]').check();
    await nextTo(page, 'people.count');
    await page.locator('[data-book-field="0"]').fill('2');
    await nextTo(page, 'people.names');
    await page.locator('[data-book-field="1"]').fill('Group one');
    await page.locator('[data-book-field="3"]').fill('Group two');
    await nextTo(page, 'turnout');
    await page.locator('[data-book-field="0"]').fill('70');
    await page.locator('[data-book-field="1"]').fill('70');
    await nextTo(page, 'votes.shares');
    await page.locator('[data-book-field="0"]').fill('3.25');
    await page.locator('[data-book-field="1"]').fill('96.75');
    await nextTo(page, 'compose');
    await page.locator('[data-book-field="0"]').fill('1');
    await page.locator('[data-book-field="1"]').fill('99');
    await page.locator('[data-action="compose-next"]').click();
    await page.locator('[data-book-field="2"]').fill('5');
    await page.locator('[data-book-field="3"]').fill('95');
    await nextTo(page, 'rules.threshold');
    await page.locator('[data-book-field="0"]').fill('3.25');
    await toBuild(page);
    await page.locator('[data-action="book-build"]').click();
    await showView(page, 'seats');
    expect(await seatsOf(page)).toEqual({ P1: '4', P2: '116' });
  });

  test('opens the historical facts and returns to the question', async ({
    page,
  }) => {
    await openBook(page);
    await nextTo(page, 'parties.count');
    await page.locator('[data-book-field]').first().fill('4');
    await page.locator('[data-action="open-fact"]').click();
    await expect(book(page)).toHaveAttribute('data-page', 'facts');
    await expect(page.locator('[data-facts]')).toContainText('6 578 084');
    await page.locator('[data-action="close-fact"]').click();
    await expect(book(page)).toHaveAttribute('data-page', 'parties.count');
    await expect(page.locator('[data-book-field]').first()).toHaveValue('4');
  });

  test('hides preset actions and asks before questionnaire replacement of a changed scenario', async ({
    page,
  }) => {
    await openBook(page);
    await skipBook(page);
    await showView(page, 'inputs');
    const name = page.locator('[data-editor="scenario"] [data-field="name"]');
    await name.fill('Мой сценарий');
    await expect(page.locator('.presets__select')).toHaveCount(0);
    await expect(page.locator('[data-action="load-preset"]')).toHaveCount(0);
    await page.locator('[data-action="open-book"]').click();
    await nextTo(page, 'parties.count');
    await next(page);
    await page.locator('[data-action="book-skip"]').click();
    await expect(page.locator('[data-book-confirm]')).toBeVisible();
    await page.locator('[data-action="book-cancel"]').click();
    await expect(page.locator('[data-book-confirm]')).toHaveCount(0);
    await page.locator('[data-action="book-skip"]').click();
    await page.locator('[data-action="book-confirm"]').click();
    await expect(page.locator('.toolbar__name')).toHaveText('Моя симуляция');
  });

  test('has no serious axe findings on its pages', async ({ page }) => {
    // A whole-book walk with five scans, budgeted like the bookFit walks.
    test.setTimeout(180_000);
    await openBook(page);
    expect(await seriousFindings(page), 'intro').toEqual([]);
    await sixLists(page);
    expect(await seriousFindings(page), 'names').toEqual([]);
    await nextTo(page, 'people.set');
    await page.locator('[data-book-choice="example"]').check();
    await nextTo(page, 'compose');
    expect(await seriousFindings(page), 'compose').toEqual([]);
    await nextTo(page, 'votes.check');
    expect(await seriousFindings(page), 'check').toEqual([]);
    await nextTo(page, 'review');
    expect(await seriousFindings(page), 'review').toEqual([]);
    await page
      .locator('[data-action="book-edit"][data-page="parties.count"]')
      .click();
    await page.locator('[data-action="open-fact"]').click();
    await expect(book(page)).toHaveAttribute('data-page', 'facts');
    expect(await seriousFindings(page), 'facts').toEqual([]);
  });

  test('has no serious axe findings on the lessons', async ({ page }) => {
    await openBook(page);
    await nextTo(page, 'people.about');
    expect(await seriousFindings(page), 'about').toEqual([]);
    await next(page);
    await expect(book(page)).toHaveAttribute('data-page', 'people.mix');
    await expect(page.locator('[data-mix-bar]')).toHaveCount(8);
    expect(await seriousFindings(page), 'mix').toEqual([]);
  });

  test('fills a field from its list and keeps typing open', async ({
    page,
  }) => {
    await openBook(page);
    await nextTo(page, 'parties.count');
    await page.locator('[data-book-pick="0"]').selectOption('7');
    await expect(page.locator('[data-book-field="0"]')).toHaveValue('7');
    await expect(page.locator('[data-suggested]')).toHaveCount(0);
    await page.locator('[data-book-field="0"]').fill('5');
    await expect(page.locator('[data-book-pick="0"]')).toHaveValue('5');
  });

  test('suggests the Israeli list names', async ({ page }) => {
    await openBook(page);
    await nextTo(page, 'parties.naming');
    await expect(page.locator('[data-book-choice="catalog"]')).toBeChecked();
    await nextTo(page, 'parties.names');
    await expect(page.locator('[data-book-field="1"]')).toHaveValue('Ликуд');
    await expect(page.locator('[data-book-pick="0"]')).toHaveValue('likud');
  });

  test('takes a list by name and builds with it', async ({ page }) => {
    await openBook(page);
    await nextTo(page, 'parties.naming');
    await page.locator('[data-book-choice="own"]').check();
    await nextTo(page, 'parties.names');
    await page.locator('[data-book-pick="0"]').selectOption('shas');
    await expect(page.locator('[data-book-field="1"]')).toHaveValue('ШАС');
    await page.locator('[data-book-field="3"]').fill('Северный список');
    await expect(page.locator('[data-book-pick="2"]')).toHaveValue('');
    await page.locator('[data-action="book-skip"]').click();
    await showView(page, 'seats');
    const seats = await seatsOf(page);
    expect(Object.keys(seats).sort()).toEqual(['P2', 'P3', 'P4', 'shas']);
  });

  test('keeps Back beside Next and Skip apart from them', async ({ page }) => {
    await openBook(page);
    await nextTo(page, 'parties.count');
    const box = async (name: string) => {
      const found = await page.locator(`[data-action="${name}"]`).boundingBox();
      if (found === null) {
        throw new Error(`no ${name}`);
      }
      return found;
    };
    const skip = await box('book-skip');
    const backButton = await box('book-back');
    const nextButton = await box('book-next');
    const gap = nextButton.x - (backButton.x + backButton.width);
    expect(Math.abs(nextButton.y - backButton.y)).toBeLessThan(2);
    expect(gap).toBeGreaterThanOrEqual(0);
    expect(gap).toBeLessThan(32);
    if (Math.abs(skip.y - backButton.y) < 2) {
      expect(backButton.x - (skip.x + skip.width)).toBeGreaterThan(gap);
    }
  });

  test('opens the example note on a click', async ({ page }) => {
    await openBook(page);
    await nextTo(page, 'parties.count');
    await expect(page.locator('[data-suggested-more]')).toBeHidden();
    await page.locator('[data-suggested] summary').click();
    await expect(page.locator('[data-suggested-more]')).toBeVisible();
    await expect(page.locator('[data-suggested-more]')).toContainText(
      'Это значение для примера.',
    );
  });

  test("records each party's own answer and names who refused", async ({
    page,
  }) => {
    await openBook(page);
    await sixLists(page);
    await nextTo(page, 'coalitions');
    await expect(page.locator('[data-part-step]')).toHaveCount(0);
    await expect(page.locator('[data-refusal]')).toHaveCount(10);
    await expect(page.locator('.directed-relations__pages')).toHaveCount(0);
    await page.locator('[data-refusal="likud:avoda"]').click();
    await expect(page.locator('[data-refusal="avoda:likud"]')).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    await expect(page.locator('[data-refusal="likud:avoda"]')).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await toBuild(page);
    await page.locator('[data-action="book-build"]').click();
    await showView(page, 'coalitions');
    const forbidden = page.locator('[data-list="forbidden"] [data-forbidden]');
    await expect(forbidden).toHaveCount(1);
    await expect(forbidden).toHaveAttribute('data-forbidden', 'likud|avoda');
    await expect(forbidden).toHaveAttribute('data-refused-by', 'likud');
    await expect(forbidden).toContainText('отказ');
  });
});
