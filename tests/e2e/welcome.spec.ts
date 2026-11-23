import AxeBuilder from '@axe-core/playwright';
import { APP_URL, expect, test } from './helpers';

const WELCOME_KEY = 'elections-simulator.welcomeSeen.v1';

async function fresh(page: import('@playwright/test').Page) {
  await page.goto(APP_URL);
  await page.evaluate((key) => localStorage.removeItem(key), WELCOME_KEY);
  await page.reload();
  await expect(page.locator('[data-welcome-dialog]')).toBeVisible();
}

test.describe('M7-22 first-visit welcome dialog', () => {
  test('shows once and closes by language, close, backdrop and Escape', async ({
    page,
  }) => {
    await fresh(page);
    await page.locator('[data-welcome-language="ru"]').click();
    await expect(page.locator('[data-welcome-dialog]')).toHaveCount(0);
    await expect(page.locator('.app')).toHaveAttribute('lang', 'ru');
    await page.locator('[data-action="open-welcome"]').click();
    await expect(page.locator('[data-welcome-dialog]')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('[data-welcome-dialog]')).toHaveCount(0);
    await page.reload();
    await expect(page.locator('[data-welcome-dialog]')).toHaveCount(0);

    for (const route of ['close', 'escape', 'backdrop'] as const) {
      await page.evaluate((key) => localStorage.removeItem(key), WELCOME_KEY);
      await page.reload();
      await expect(page.locator('[data-welcome-dialog]')).toBeVisible();
      if (route === 'close') await page.locator('[data-welcome-close]').click();
      if (route === 'escape') await page.keyboard.press('Escape');
      if (route === 'backdrop') {
        await page.locator('[data-welcome-backdrop]').click({
          position: { x: 2, y: 2 },
        });
      }
      await expect(page.locator('[data-welcome-dialog]')).toHaveCount(0);
      await page.reload();
      await expect(page.locator('[data-welcome-dialog]')).toHaveCount(0);
    }
  });

  test('returns focus, stays offline, fits phone and passes serious axe', async ({
    page,
  }) => {
    await fresh(page);
    await expect(page.locator('[data-welcome-art]')).toBeVisible();
    await expect(page.locator('[data-welcome-heading="he"]')).toHaveAttribute(
      'dir',
      'rtl',
    );
    const close = page.locator('[data-welcome-close]');
    await expect(close).toBeFocused();
    const box = await close.boundingBox();
    expect(box?.width).toBeGreaterThanOrEqual(40);
    expect(box?.height).toBeGreaterThanOrEqual(40);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    const axe = await new AxeBuilder({ page }).analyze();
    expect(
      axe.violations.filter(
        (finding) =>
          finding.impact === 'serious' || finding.impact === 'critical',
      ),
    ).toEqual([]);
    await close.click();
    await expect(
      page.locator('.languages__item[aria-pressed="true"]'),
    ).toBeFocused();
  });

  test('clear saved data makes the next load show the welcome again', async ({
    page,
  }) => {
    await fresh(page);
    await page.locator('[data-welcome-language="ru"]').click();
    await page.locator('[data-action="start-skip"]').click();
    await page.locator('[data-action="clear-data"]').click();
    await page.reload();
    await expect(page.locator('[data-welcome-dialog]')).toBeVisible();
  });
});
