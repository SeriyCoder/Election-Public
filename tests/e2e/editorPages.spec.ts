import type { Page } from '@playwright/test';
import { partyModeKnownPopulationInput } from '../engine/helpers/scenarios';
import {
  expect,
  isPhone,
  loadScenario,
  openApp,
  openEditorPage,
  seatsOf,
  showView,
  test,
} from './helpers';

const pager = (page: Page) => page.locator('[data-editor-pager]');
const title = (page: Page) => page.locator('[data-editor-page-title]');
const prev = (page: Page) => page.locator('[data-action="page-prev"]');
const nextPage = (page: Page) => page.locator('[data-action="page-next"]');
const groupRow = (page: Page, id: string) =>
  page.locator(`[data-entity="group"][data-id="${id}"]`);

test.describe('editor pages', () => {
  test('Back and Next turn the pages, name them and move focus to the title', async ({
    page,
  }) => {
    await openApp(page, 'ru');
    await showView(page, 'inputs');
    await expect(pager(page)).toHaveAttribute('data-page', 'scenario');
    await expect(title(page)).toHaveText(
      'Страница 1 из 7 · Сценарий и правила',
    );
    await expect(prev(page)).toBeDisabled();
    await expect(page.locator('[data-editor="scenario"]')).toBeVisible();
    await expect(page.locator('[data-editor="parties"]')).toBeHidden();

    await nextPage(page).click();
    await expect(pager(page)).toHaveAttribute('data-page', 'group:G1');
    await expect(title(page)).toHaveText(
      'Страница 2 из 7 · Группа избирателей: Группа 1',
    );
    await expect(title(page)).toBeFocused();
    await expect(groupRow(page, 'G1')).toBeVisible();
    await expect(groupRow(page, 'G2')).toBeHidden();
    await expect(page.locator('[data-editor="scenario"]')).toBeHidden();
    await expect(
      groupRow(page, 'G1').locator('[data-note="group-picture"]'),
    ).toContainText('картина мира');

    await prev(page).click();
    await expect(pager(page)).toHaveAttribute('data-page', 'scenario');
    await expect(title(page)).toBeFocused();
  });

  test.describe('M7-01 party-mode regressions', () => {
    test('keeps seats available after adding and duplicating known groups', async ({
      page,
    }) => {
      await openApp(page);
      await loadScenario(page, partyModeKnownPopulationInput());
      await showView(page, 'inputs');
      await openEditorPage(page, 'group:G1');
      await page.locator('[data-action="add"][data-kind="group"]').click();
      await expect(pager(page)).toHaveAttribute('data-page', 'group:G3');
      await expect(page.locator('[data-action="export"]')).toBeEnabled();
      await showView(page, 'seats');
      expect(await seatsOf(page)).toEqual({ P1: '120' });

      await showView(page, 'inputs');
      await openEditorPage(page, 'group:G1');
      await groupRow(page, 'G1').locator('[data-action="duplicate"]').click();
      await expect(pager(page)).toHaveAttribute('data-page', 'group:G4');
      await expect(page.locator('[data-action="export"]')).toBeEnabled();
      await showView(page, 'seats');
      expect(await seatsOf(page)).toEqual({ P1: '120' });
    });

    test('edits a party colour and reflects it in results', async ({
      page,
    }) => {
      await openApp(page);
      await loadScenario(page, partyModeKnownPopulationInput());
      await showView(page, 'inputs');
      await openEditorPage(page, 'parties');
      const color = page.locator(
        '[data-entity="party"][data-id="P1"] [data-field="color"]',
      );
      await expect(color).toBeVisible();
      await expect(color).toHaveValue('#336699');
      await color.evaluate((element: HTMLInputElement) => {
        element.value = '#123456';
        element.dispatchEvent(new Event('input', { bubbles: true }));
      });
      await showView(page, 'seats');
      await expect(
        page.locator('[data-table="parties"] [data-party="P1"] .swatch'),
      ).toHaveCSS('background-color', 'rgb(18, 52, 86)');
    });
  });

  test('the page select jumps to any page and Next stops at the last', async ({
    page,
  }) => {
    await openApp(page, 'ru');
    await showView(page, 'inputs');
    await openEditorPage(page, 'parties');
    await expect(title(page)).toHaveText('Страница 6 из 7 · Партии');
    await expect(page.locator('[data-editor="blocks"]')).toHaveCount(0);
    await nextPage(page).click();
    await expect(pager(page)).toHaveAttribute('data-page', 'coalition-rules');
    await expect(nextPage(page)).toBeDisabled();
    await expect(page.locator('[data-editor="coalition-rules"]')).toBeVisible();
  });

  test('Back and Next sit side by side', async ({ page }) => {
    await openApp(page, 'ru');
    await showView(page, 'inputs');
    await openEditorPage(page, 'group:G2');
    const a = await prev(page).boundingBox();
    const b = await nextPage(page).boundingBox();
    expect(a).not.toBeNull();
    expect(b).not.toBeNull();
    if (a === null || b === null) {
      return;
    }
    expect(Math.abs(a.y - b.y)).toBeLessThan(2);
    const gap = Math.max(b.x - (a.x + a.width), a.x - (b.x + b.width));
    expect(gap).toBeGreaterThanOrEqual(0);
    expect(gap).toBeLessThan(24);
  });

  test('adding a group opens its page', async ({ page }) => {
    await openApp(page, 'ru');
    await showView(page, 'inputs');
    await openEditorPage(page, 'group:G4');
    await page.locator('[data-action="add"][data-kind="group"]').click();
    await expect(pager(page)).toHaveAttribute('data-page', 'group:G5');
    await expect(title(page)).toHaveText(
      'Страница 6 из 8 · Группа избирателей: Группа 5',
    );
    await expect(groupRow(page, 'G5')).toBeVisible();
    await expect(groupRow(page, 'G4')).toBeHidden();
  });

  test('desktop: the editor column scrolls on its own with the pager on top', async ({
    page,
  }, testInfo) => {
    test.skip(isPhone(testInfo.project.name), 'desktop layout only');
    await openApp(page, 'ru');
    await openEditorPage(page, 'parties');
    const region = page.locator('[data-region="editor"]');
    await expect(region).toHaveCSS('overflow-y', 'auto');
    const viewport = page.viewportSize();
    const box = await region.boundingBox();
    expect(box).not.toBeNull();
    expect((box?.height ?? Infinity) <= (viewport?.height ?? 0) + 1).toBe(true);

    const scrolls = await region.evaluate(
      (element) => element.scrollHeight > element.clientHeight,
    );
    expect(scrolls).toBe(true);
    await region.evaluate((element) => {
      element.scrollTop = element.scrollHeight;
    });
    const regionTop = (await region.boundingBox())?.y ?? 0;
    const pagerTop = (await pager(page).boundingBox())?.y ?? -100;
    expect(Math.abs(pagerTop - regionTop)).toBeLessThan(24);

    await page.evaluate(() =>
      window.scrollTo(0, document.documentElement.scrollHeight),
    );
    const after = await region.boundingBox();
    expect(after?.y ?? -1).toBeGreaterThanOrEqual(-1);
    expect((after?.y ?? 0) + (after?.height ?? Infinity)).toBeLessThanOrEqual(
      (viewport?.height ?? 0) + 1,
    );
  });

  test('turning a page scrolls the editor column back to its top', async ({
    page,
  }, testInfo) => {
    test.skip(isPhone(testInfo.project.name), 'desktop layout only');
    await openApp(page, 'ru');
    await openEditorPage(page, 'parties');
    const region = page.locator('[data-region="editor"]');
    await region.evaluate((element) => {
      element.scrollTop = element.scrollHeight;
    });
    await nextPage(page).click();
    await expect(pager(page)).toHaveAttribute('data-page', 'coalition-rules');
    await expect
      .poll(() => region.evaluate((element) => element.scrollTop))
      .toBe(0);
  });
});
